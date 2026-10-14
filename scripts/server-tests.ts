/* Проверки серверной части без сети и без расходов: подменяем вызов fal.ai заглушкой. */
import { EventEmitter } from 'node:events'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApi, toDataUri, type Runner } from '../server/handler'
import { buildCreatePrompt, buildEditPrompt, diffSpecs } from '../server/prompt'
import { checkText, sanitizeSpec } from '../server/safety'
import { newConv, respond } from '../src/lib/dialog'

let failed = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failed++
}

// --- модерация ---
for (const t of ['кровавый дракон', 'голый рыцарь', 'с пистолетом', 'chuck norris kills', 'мой телефон 89161234567', 'https://evil.com', 'бляха'.replace('бляха', 'ты сука'), 'п о р н о'])
  ok(`блокируется: «${t}»`, !checkText(t).ok)
for (const t of ['золотые доспехи', 'красные светящиеся глаза', 'огромные рога', 'светящийся меч', 'платье', 'крылья-лезвия', 'Рэйн'])
  ok(`пропускается: «${t}»`, checkText(t).ok)

// --- Spec ---
const spec = respond(newConv(), 'Огромный чёрный дракон с золотыми доспехами, красными глазами и большими рогами в стиле кино').conv.spec
ok('sanitizeSpec принимает нормальный Spec', sanitizeSpec(spec).ok)
const evil = JSON.parse(JSON.stringify(spec))
evil.features.extra = 'кровь и убийство'
const r = sanitizeSpec(evil)
ok('sanitizeSpec ловит плохое поле', !r.ok && r.field === 'feature:extra')
ok('sanitizeSpec отбрасывает мусор', sanitizeSpec({ kind: { nom: 'x', arch: 'hack' } }).ok === false)

// --- промпт ---
const p = buildCreatePrompt(spec)
ok('промпт на английском с цветами и деталями', /dragon/.test(p) && /black/.test(p) && /gold/.test(p) && /horns/.test(p) && /cinematic/.test(p))
ok('в промпте есть детская защита', /Child-friendly/.test(p) && /No blood/.test(p))
const prev = JSON.parse(JSON.stringify(spec))
const next = JSON.parse(JSON.stringify(spec))
next.eyes = { name: 'голубой', hex: '#3ab0f0' }
next.features.eyes = 'голубые глаза'
const ch = diffSpecs(prev, next)
ok('diffSpecs находит правку глаз', ch.some((c) => /eye/.test(c)), ch.join(' | '))
ok('промпт правки сохраняет героя', /Keep the same character/.test(buildEditPrompt(ch, next)))
const spider = respond(newConv(), 'Хочу Человека-паука').conv.spec
ok('чужие франшизы заменяются оригиналом', /original superhero/.test(buildCreatePrompt(spider)) && !/spider/i.test(buildCreatePrompt(spider)))

// --- HTTP-обработчик с заглушкой ---
let calls = 0
let lastCall: { model: string; input: Record<string, unknown> } | undefined
const fake: Runner = async (model, input) => {
  calls++
  lastCall = { model, input }
  return { images: [{ url: 'data:image/webp;base64,AAAA' }] }
}
function call(api: ReturnType<typeof createApi>, method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; json: Record<string, unknown> }>((resolve) => {
    const req = new EventEmitter() as IncomingMessage & EventEmitter
    Object.assign(req, { method, url, headers: { host: 'localhost:5173', ...headers }, socket: { remoteAddress: '1.2.3.4' }, destroy() {} })
    let out = ''
    const res: { statusCode: number; headersSent: boolean; setHeader(): void; end(s: string): void } = {
      statusCode: 200, headersSent: false,
      setHeader() {},
      end(s: string) { out = s; resolve({ status: res.statusCode, json: JSON.parse(out || '{}') }) },
    }
    api.middleware(req, res as unknown as ServerResponse, () => resolve({ status: 0, json: {} }))
    setTimeout(() => { if (body !== undefined) req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end') }, 0)
  })
}
const sid = { 'x-session-id': 'test-session-0001' }
async function main() {
  const off = createApi({}, { runner: fake, usageFile: null })
  ok('без ключа генерация выключена', (await call(off, 'GET', '/api/status')).json.enabled === false)
  ok('без ключа /api/generate отказывает', (await call(off, 'POST', '/api/generate', { mode: 'create', spec }, sid)).status === 503)

  const api = createApi({ FAL_KEY: 'test-key-1234567890', FAL_SESSION_LIMIT: '2', FAL_HOURLY_PER_IP: '5', FAL_DAILY_LIMIT: '4' }, { runner: fake, usageFile: null })
  ok('с ключом генерация включена', (await call(api, 'GET', '/api/status')).json.enabled === true)
  ok('ключ не попадает в ответ статуса', !JSON.stringify((await call(api, 'GET', '/api/status')).json).includes('test-key'))
  ok('нужен идентификатор урока', (await call(api, 'POST', '/api/generate', { mode: 'create', spec })).status === 400)
  ok('чужой Origin отклоняется', (await call(api, 'POST', '/api/generate', { mode: 'create', spec }, { ...sid, origin: 'https://evil.example' })).status === 403)
  const bad = await call(api, 'POST', '/api/generate', { mode: 'create', spec: evil }, sid)
  ok('плохой текст не доходит до fal.ai', bad.status === 422 && bad.json.error === 'moderation' && calls === 0)
  const good = await call(api, 'POST', '/api/generate', { mode: 'create', spec }, sid)
  const sent = lastCall!
  ok('создание: вызывается основная модель', good.status === 200 && sent.model === 'fal-ai/nano-banana' && calls === 1)
  ok('строгая безопасность и data URI', sent.input.safety_tolerance === '1' && sent.input.sync_mode === true)
  const edit = await call(api, 'POST', '/api/generate', { mode: 'edit', spec: next, prevSpec: spec, imageId: good.json.id }, sid)
  const sent2 = lastCall!
  ok('правка: модель edit и прошлая картинка', edit.status === 200 && sent2.model === 'fal-ai/nano-banana/edit' && Array.isArray(sent2.input.image_urls))
  const over = await call(api, 'POST', '/api/generate', { mode: 'create', spec }, sid)
  ok('лимит на урок (2) срабатывает', over.status === 429 && over.json.error === 'session_limit' && calls === 2)
  const noChange = await call(api, 'POST', '/api/generate', { mode: 'edit', spec, prevSpec: spec, imageId: good.json.id }, { 'x-session-id': 'another-session-02' })
  ok('правка без изменений отклоняется', noChange.status === 400)
  // дневной лимит
  for (const s of ['sess-aaaa-0001', 'sess-aaaa-0002']) await call(api, 'POST', '/api/generate', { mode: 'create', spec }, { 'x-session-id': s })
  const daily = await call(api, 'POST', '/api/generate', { mode: 'create', spec }, { 'x-session-id': 'sess-aaaa-0003' })
  ok('дневной лимит срабатывает', daily.status === 429 && ['daily_limit', 'ip_limit'].includes(String(daily.json.error)), String(daily.json.error))

  // ошибка fal.ai не списывает лимит и не раскрывает подробности
  const failing: Runner = async () => { throw new Error('secret upstream detail FAL_KEY=abc') }
  const api2 = createApi({ FAL_KEY: 'test-key-1234567890', FAL_SESSION_LIMIT: '1' }, { runner: failing, usageFile: null })
  const orig = console.error
  console.error = () => {}
  const fail = await call(api2, 'POST', '/api/generate', { mode: 'create', spec }, sid)
  console.error = orig
  ok('ошибка апстрима: короткое сообщение без подробностей', fail.status === 502 && !JSON.stringify(fail.json).includes('secret'))
  ok('после ошибки лимит урока возвращается', api2.limits.sessionUsed('test-session-0001') === 0)

  // пустой ответ модели = отказ рисовать
  const empty = createApi({ FAL_KEY: 'test-key-1234567890' }, { runner: async () => ({ images: [], description: 'I cannot' }), usageFile: null })
  ok('пустой ответ модели → blocked', (await call(empty, 'POST', '/api/generate', { mode: 'create', spec }, sid)).json.error === 'blocked')

  // общий потолок и адрес посетителя за туннелем
  const tot = createApi({ FAL_KEY: 'test-key-1234567890', FAL_TOTAL_LIMIT: '2', FAL_SESSION_LIMIT: '9', FAL_HOURLY_PER_IP: '9', FAL_TRUST_PROXY: 'true' }, { runner: fake, usageFile: null })
  const r1 = await call(tot, 'POST', '/api/generate', { mode: 'create', spec }, { 'x-session-id': 'tot-session-0001', 'x-forwarded-for': '5.5.5.5' })
  const r2 = await call(tot, 'POST', '/api/generate', { mode: 'create', spec }, { 'x-session-id': 'tot-session-0002', 'x-forwarded-for': '6.6.6.6' })
  const r3 = await call(tot, 'POST', '/api/generate', { mode: 'create', spec }, { 'x-session-id': 'tot-session-0003', 'x-forwarded-for': '7.7.7.7' })
  ok('общий потолок 2 картинки работает', r1.status === 200 && r2.status === 200 && r3.status === 429)
  ok('при доверии к туннелю адрес берётся из X-Forwarded-For', ((tot.limits as unknown as { ip: Map<string, number[]> }).ip.has('5.5.5.5')))
  // ссылка вместо data URI: скачиваем только с доменов fal
  const png = new Uint8Array([137, 80, 78, 71])
  const fakeFetch = (async () => new Response(png, { status: 200, headers: { 'content-type': 'image/png' } })) as unknown as typeof fetch
  ok('ссылка fal.media превращается в data URI', ((await toDataUri('https://v3.fal.media/files/x.png', fakeFetch)) ?? '').startsWith('data:image/png;base64,'))
  ok('чужой домен не скачивается', (await toDataUri('https://evil.example/x.png', fakeFetch)) === null)
  ok('http не скачивается', (await toDataUri('http://v3.fal.media/x.png', fakeFetch)) === null)
  console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе серверные проверки пройдены')
  process.exit(failed ? 1 : 0)
}
void main()
