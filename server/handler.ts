import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { renderHeroSvg, svgToDataUrl } from '../src/lib/art'
import type { Spec } from '../src/types'
import { type ApiEnv, readConfig } from './config'
import { type LimitStore, MemoryStore } from './store'
import { buildCreatePrompt, buildEditPrompt, diffSpecs } from './prompt'
import { sanitizeSpec } from './safety'

export interface RunResult {
  images?: { url?: string }[]
  description?: string
}
/** Вызов модели. В тестах подменяется, в работе использует официальный SDK fal.ai. */
export type Runner = (model: string, input: Record<string, unknown>) => Promise<RunResult>

const MAX_BODY = 4_500_000 // как предел тела запроса у Vercel; прошлая картинка героя ≈ сотни КБ
const FAL_HOST = /(^|\.)fal\.(media|ai|run)$/
const MAX_IMAGE_CHARS = 8_000_000

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

const MESSAGES: Record<string, string> = {
  moderation: 'Это описание нельзя использовать для картинки. Попробуй описать героя другими словами.',
  blocked: 'Не получилось создать картинку по этому описанию. Попробуй описать героя чуть иначе.',
  session_limit: 'В этом уроке лимит картинок исчерпан.',
  ip_limit: 'Сейчас слишком много попыток. Попробуй чуть позже.',
  daily_limit: 'На сегодня бесплатные картинки закончились. Попробуй завтра.',
  busy: 'Сейчас много желающих. Попробуй ещё раз через минуту.',
  duplicate: 'Этот запрос уже обработан. Подожди немного.',
  store: 'Создание картинок временно недоступно. Попробуй позже.',
  disabled: 'Создание картинок сейчас недоступно.',
  upstream: 'Не получилось создать картинку. Попробуй ещё раз.',
  timeout: 'Создание картинки заняло слишком много времени. Попробуй ещё раз.',
  bad_request: 'Не удалось обработать запрос.',
}

/** Тело запроса: на Vercel оно уже разобрано платформой, в обычном Node его нужно прочитать из потока. */
async function bodyText(req: IncomingMessage): Promise<string> {
  const pre = (req as IncomingMessage & { body?: unknown }).body
  let text: string
  if (pre === undefined || pre === null) text = await readBody(req)
  else if (typeof pre === 'string') text = pre
  else if (Buffer.isBuffer(pre)) text = pre.toString('utf8')
  else text = JSON.stringify(pre)
  if (text.length > MAX_BODY) throw new Error('too_large')
  return text
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('too_large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function falRunner(key: string): Promise<Runner> {
  const { fal } = await import('@fal-ai/client')
  fal.config({ credentials: key })
  return async (model, input) => {
    const result = await fal.subscribe(model, { input, logs: false })
    return result.data as RunResult
  }
}

/** Имитация ответа для проверки интерфейса без расходов (FAL_MOCK=1). */
const mockRunner: Runner = async (_model, input) => {
  await new Promise((r) => setTimeout(r, 1500))
  const spec = (input as { __spec?: Spec }).__spec
  if (!spec?.kind) return { images: [] }
  return { images: [{ url: svgToDataUrl(renderHeroSvg(spec, spec.kind.arch)) }] }
}

/** Если fal.ai вернул ссылку вместо data URI, скачиваем картинку на сервере (только с доменов fal) и отдаём браузеру как data URI. */
export async function toDataUri(url: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (url.startsWith('data:image/')) return url
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !FAL_HOST.test(u.hostname)) return null
    const r = await fetcher(u, { redirect: 'error' })
    const type = r.headers.get('content-type') ?? ''
    if (!r.ok || !type.startsWith('image/')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length === 0 || buf.length > 6_000_000) return null
    return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export function createApi(env: ApiEnv, opts: { runner?: Runner; usageFile?: string | null; dataDir?: string; fetcher?: typeof fetch; store?: LimitStore } = {}) {
  const cfg = readConfig(env)
  const secret = cfg.key
  const scrub = (m: string) => (secret ? m.split(secret).join('***') : m)
  const store: LimitStore = opts.store ?? new MemoryStore(opts.usageFile === undefined ? join(opts.dataDir ?? '.data', 'fal-usage.json') : opts.usageFile)
  // подпись возвращённых картинок: так сервер без хранилища узнаёт собственные изображения при правках
  const signKey = createHmac('sha256', secret || 'mock-secret').update('image-signature-v1').digest()
  const sign = (src: string) => createHmac('sha256', signKey).update(src).digest('hex')
  const verified = (src: unknown, sig: unknown) => {
    if (typeof src !== 'string' || typeof sig !== 'string' || !src.startsWith('data:image/') || src.length > MAX_IMAGE_CHARS) return false
    const a = Buffer.from(sign(src))
    const b = Buffer.from(sig)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  let runner: Runner | null = opts.runner ?? null

  const getRunner = async (): Promise<Runner> => {
    if (runner) return runner
    runner = cfg.mock ? mockRunner : await falRunner(cfg.key)
    return runner
  }

  /** Без кода доступа (если он задан) генерация закрыта: остаётся демо-режим. */
  const codeOk = (req: IncomingMessage) => {
    if (!cfg.accessCode) return true
    const given = Buffer.from(String(req.headers['x-access-code'] ?? ''))
    const need = Buffer.from(cfg.accessCode)
    return given.length === need.length && timingSafeEqual(given, need)
  }

  const sameOrigin = (req: IncomingMessage) => {
    const origin = req.headers.origin
    if (!origin) return true
    try {
      return new URL(origin).host === req.headers.host
    } catch {
      return false
    }
  }

  async function generate(req: IncomingMessage, res: ServerResponse) {
    if (!cfg.enabled) return send(res, 503, { error: 'disabled', message: MESSAGES.disabled })
    if (!codeOk(req)) return send(res, 403, { error: 'disabled', message: MESSAGES.disabled })
    if (!sameOrigin(req)) return send(res, 403, { error: 'bad_request', message: MESSAGES.bad_request })
    const sid = String(req.headers['x-session-id'] ?? '')
    if (!/^[a-z0-9-]{8,64}$/i.test(sid)) return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })

    let body: Record<string, unknown>
    try {
      body = JSON.parse(await bodyText(req))
    } catch {
      return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })
    }

    const spec = sanitizeSpec(body.spec)
    if (!spec.ok) {
      const code = spec.reason === 'invalid' || spec.reason === 'missing' ? 'bad_request' : 'moderation'
      return send(res, 422, { error: code, field: spec.field, message: MESSAGES[code] })
    }

    const rid = String(req.headers['x-request-id'] ?? '')
    if (!/^[a-z0-9-]{16,64}$/i.test(rid)) return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })

    const mode = body.mode === 'edit' ? 'edit' : 'create'
    let prompt = buildCreatePrompt(spec.spec)
    let model = cfg.model
    const input: Record<string, unknown> = { aspect_ratio: '1:1', output_format: 'webp', safety_tolerance: '1', sync_mode: true, num_images: 1 }
    let usedEdit = false

    if (mode === 'edit') {
      const prev = sanitizeSpec(body.prevSpec)
      if (!prev.ok) return send(res, 422, { error: 'bad_request', message: MESSAGES.bad_request })
      const changes = diffSpecs(prev.spec, spec.spec)
      if (!changes.length) return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })
      const pi = body.prevImage as { src?: unknown; sig?: unknown } | undefined
      if (pi && verified(pi.src, pi.sig)) {
        // прошлая версия героя передаётся как есть: так внешний вид сохраняется
        prompt = buildEditPrompt(changes, spec.spec)
        model = cfg.editModel
        input.image_urls = [pi.src as string]
        usedEdit = true
      }
      // если подписанной картинки нет (или подпись не совпала), собираем героя заново по полному описанию
    }
    input.prompt = prompt
    if (cfg.mock) input.__spec = spec.spec

    // за доверенным туннелем все запросы приходят с 127.0.0.1, настоящий адрес посетителя — в X-Forwarded-For
    const fwd = cfg.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : ''
    const ip = fwd || (req.socket.remoteAddress ?? 'unknown')
    // повтор того же запроса (двойной клик, повторная отправка) не тратит картинку
    try {
      if (!(await store.once(rid))) return send(res, 409, { error: 'duplicate', message: MESSAGES.duplicate })
    } catch {
      return send(res, 503, { error: 'disabled', message: MESSAGES.store })
    }
    let slot
    try {
      slot = await store.reserve(ip, sid, cfg)
    } catch (e) {
      // если счётчики недоступны, лучше отказать, чем потратить деньги без контроля
      console.error('[store] недоступно:', e instanceof Error ? e.message : 'unknown')
      return send(res, 503, { error: 'disabled', message: MESSAGES.store })
    }
    if (!slot.ok) return send(res, 429, { error: slot.code, message: MESSAGES[slot.code] })

    let refund = false
    try {
      const run = await getRunner()
      const result = await Promise.race([
        run(model, input),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), cfg.timeoutMs)),
      ])
      const raw = result.images?.[0]?.url
      const src = raw ? await toDataUri(raw, opts.fetcher) : null
      if (!src || src.length > MAX_IMAGE_CHARS) {
        // пустой ответ чаще всего значит, что модель отказалась рисовать: не считаем это ошибкой сервера
        return send(res, 422, { error: 'blocked', message: MESSAGES.blocked })
      }
      return send(res, 200, {
        src,
        sig: sign(src),
        model,
        mock: cfg.mock || undefined,
        edited: usedEdit,
        sessionRemaining: Math.max(0, cfg.sessionLimit - (await store.sessionUsed(sid).catch(() => 0))),
        ...(cfg.debug ? { debugPrompt: prompt } : {}),
      })
    } catch (e) {
      refund = true
      const timeout = e instanceof Error && e.message === 'timeout'
      // подробности остаются в журнале сервера, ребёнку показывается короткое сообщение
      console.error('[fal] ошибка генерации:', timeout ? 'timeout' : e instanceof Error ? scrub(`${e.name}: ${e.message}`).slice(0, 300) : 'unknown')
      return send(res, timeout ? 504 : 502, { error: timeout ? 'timeout' : 'upstream', message: MESSAGES[timeout ? 'timeout' : 'upstream'] })
    } finally {
      await store.release(ip, sid, refund).catch(() => {})
    }
  }

  /** Обработчик для Node-серверов и Vite: пути вида /api/status и /api/generate. */
  const status = async (req: IncomingMessage, res: ServerResponse) => {
    const sid = String(req.headers['x-session-id'] ?? '')
    let used = 0
    if (/^[a-z0-9-]{8,64}$/i.test(sid)) used = await store.sessionUsed(sid).catch(() => 0)
    send(res, 200, {
      enabled: cfg.enabled && codeOk(req),
      reason: cfg.enabled ? undefined : cfg.reason,
      // подробности для диагностики: только состояния, без значений
      diag: cfg.enabled ? undefined : { key: cfg.keyState, redis: !cfg.storeMissing },
      demoAllowed: cfg.allowDemo,
      locked: cfg.enabled && !codeOk(req) ? true : undefined,
      mock: cfg.mock || undefined,
      sessionLimit: cfg.sessionLimit,
      sessionRemaining: Math.max(0, cfg.sessionLimit - used),
    })
  }

  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = (req.url ?? '').split('?')[0]
    if (url === '/api/status' && req.method === 'GET') return void status(req, res)
    if (url === '/api/generate' && req.method === 'POST') {
      void generate(req, res).catch((e) => {
        console.error('[api] необработанная ошибка:', e instanceof Error ? e.message : e)
        if (!res.headersSent) send(res, 500, { error: 'upstream', message: MESSAGES.upstream })
      })
      return
    }
    if (url.startsWith('/api/')) return send(res, 404, { error: 'bad_request' })
    next()
  }

  return { middleware, config: cfg, store }
}
