import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { renderHeroSvg, svgToDataUrl } from '../src/lib/art'
import type { Spec } from '../src/types'
import { type ApiEnv, readConfig } from './config'
import { Limits } from './limits'
import { buildCreatePrompt, buildEditPrompt, diffSpecs } from './prompt'
import { sanitizeSpec } from './safety'

export interface RunResult {
  images?: { url?: string }[]
  description?: string
}
/** Вызов модели. В тестах подменяется, в работе использует официальный SDK fal.ai. */
export type Runner = (model: string, input: Record<string, unknown>) => Promise<RunResult>

const MAX_BODY = 24_000
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
  disabled: 'Создание картинок сейчас недоступно.',
  upstream: 'Не получилось создать картинку. Попробуй ещё раз.',
  timeout: 'Создание картинки заняло слишком много времени. Попробуй ещё раз.',
  bad_request: 'Не удалось обработать запрос.',
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

export function createApi(env: ApiEnv, opts: { runner?: Runner; usageFile?: string | null; dataDir?: string; fetcher?: typeof fetch } = {}) {
  const cfg = readConfig(env)
  const secret = env.FAL_KEY?.trim() ?? ''
  const scrub = (m: string) => (secret ? m.split(secret).join('***') : m)
  const limits = new Limits(opts.usageFile === undefined ? join(opts.dataDir ?? '.data', 'fal-usage.json') : opts.usageFile)
  const images = new Map<string, { src: string; at: number }>()
  let runner: Runner | null = opts.runner ?? null

  const getRunner = async (): Promise<Runner> => {
    if (runner) return runner
    runner = cfg.mock ? mockRunner : await falRunner(env.FAL_KEY!.trim())
    return runner
  }

  const remember = (src: string) => {
    const id = randomBytes(9).toString('hex')
    const now = Date.now()
    for (const [k, v] of images) if (now - v.at > 2 * 3_600_000) images.delete(k)
    if (images.size >= 200) images.delete(images.keys().next().value as string)
    images.set(id, { src, at: now })
    return id
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
    if (!sameOrigin(req)) return send(res, 403, { error: 'bad_request', message: MESSAGES.bad_request })
    const sid = String(req.headers['x-session-id'] ?? '')
    if (!/^[a-z0-9-]{8,64}$/i.test(sid)) return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })

    let body: Record<string, unknown>
    try {
      body = JSON.parse(await readBody(req))
    } catch {
      return send(res, 400, { error: 'bad_request', message: MESSAGES.bad_request })
    }

    const spec = sanitizeSpec(body.spec)
    if (!spec.ok) {
      const code = spec.reason === 'invalid' || spec.reason === 'missing' ? 'bad_request' : 'moderation'
      return send(res, 422, { error: code, field: spec.field, message: MESSAGES[code] })
    }

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
      const base = typeof body.imageId === 'string' ? images.get(body.imageId) : undefined
      if (base) {
        // прошлая версия героя передаётся как есть: так внешний вид сохраняется
        prompt = buildEditPrompt(changes, spec.spec)
        model = cfg.editModel
        input.image_urls = [base.src]
        usedEdit = true
      }
      // если сервер уже забыл картинку (перезапуск), собираем героя заново по полному описанию
    }
    input.prompt = prompt
    if (cfg.mock) input.__spec = spec.spec

    // за доверенным туннелем все запросы приходят с 127.0.0.1, настоящий адрес посетителя — в X-Forwarded-For
    const fwd = cfg.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : ''
    const ip = fwd || (req.socket.remoteAddress ?? 'unknown')
    const slot = limits.reserve(ip, sid, cfg)
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
      const id = remember(src)
      return send(res, 200, {
        id,
        src,
        model,
        mock: cfg.mock || undefined,
        edited: usedEdit,
        sessionRemaining: Math.max(0, cfg.sessionLimit - limits.sessionUsed(sid)),
        ...(cfg.debug ? { debugPrompt: prompt } : {}),
      })
    } catch (e) {
      refund = true
      const timeout = e instanceof Error && e.message === 'timeout'
      // подробности остаются в журнале сервера, ребёнку показывается короткое сообщение
      console.error('[fal] ошибка генерации:', timeout ? 'timeout' : e instanceof Error ? scrub(`${e.name}: ${e.message}`).slice(0, 300) : 'unknown')
      return send(res, timeout ? 504 : 502, { error: timeout ? 'timeout' : 'upstream', message: MESSAGES[timeout ? 'timeout' : 'upstream'] })
    } finally {
      limits.release(ip, sid, refund)
    }
  }

  /** Обработчик для Node-серверов и Vite: пути вида /api/status и /api/generate. */
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = (req.url ?? '').split('?')[0]
    if (url === '/api/status' && req.method === 'GET') {
      const sid = String(req.headers['x-session-id'] ?? '')
      return send(res, 200, {
        enabled: cfg.enabled,
        mock: cfg.mock || undefined,
        sessionLimit: cfg.sessionLimit,
        sessionRemaining: /^[a-z0-9-]{8,64}$/i.test(sid) ? Math.max(0, cfg.sessionLimit - limits.sessionUsed(sid)) : cfg.sessionLimit,
      })
    }
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

  return { middleware, config: cfg, limits }
}
