import type { HeroImage, Spec } from '../types'
import { renderHeroSvg, svgToDataUrl } from './art'

/**
 * Единая точка получения изображения героя.
 * Если сервер приложения настроен (есть FAL_KEY), картинки создаёт нейросеть через /api/generate.
 * Ключ fal.ai находится только на сервере. Если ключа нет, работает демо-режим с готовыми иллюстрациями.
 */
export interface GenerateRequest {
  prompt: string
  spec: Spec
  /** правка уже созданного героя: прошлая версия описания и прошлая картинка с подписью сервера */
  previous?: { spec: Spec; imageSrc?: string; imageSig?: string }
}

export interface HeroImageProvider {
  generate(req: GenerateRequest): Promise<HeroImage>
}

export type GenerationErrorCode =
  | 'moderation' | 'blocked' | 'session_limit' | 'ip_limit' | 'daily_limit' | 'busy'
  | 'disabled' | 'upstream' | 'timeout' | 'network' | 'bad_request' | 'duplicate'

export class GenerationError extends Error {
  constructor(public code: GenerationErrorCode, message: string, public field?: string) {
    super(message)
  }
}

/** Код доступа из ссылки (?code=…): запоминается на устройстве и отправляется на сервер в заголовке. */
const CODE_KEY = 'aicreator.code'
function accessCode(): string {
  try {
    const q = new URLSearchParams(location.search).get('code')
    if (q) {
      localStorage.setItem(CODE_KEY, q)
      const url = new URL(location.href)
      url.searchParams.delete('code')
      history.replaceState(null, '', url)
    }
    return localStorage.getItem(CODE_KEY) ?? ''
  } catch {
    return ''
  }
}
const authHeaders = (): Record<string, string> => {
  const code = accessCode()
  return code ? { 'x-access-code': code } : {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const LABEL = { dragon: 'Дракон', robot: 'Робот', warrior: 'Воин в доспехах', beast: 'Фантастический зверь', spirit: 'Волшебное существо' } as const

/** Демо-провайдер: никаких запросов в сеть, подбирает готовую иллюстрацию по типу героя. */
export const demoProvider: HeroImageProvider = {
  async generate({ spec }) {
    await sleep(2600 + Math.random() * 500)
    const arch = spec.kind?.arch ?? 'beast'
    return {
      src: svgToDataUrl(renderHeroSvg(spec, arch)),
      mode: 'demo',
      arch,
      exact: spec.kind?.exact ?? false,
      alt: `${LABEL[arch]}${spec.name ? ` — ${spec.name}` : ''} (демо-изображение)`,
    }
  },
}

// ---------- сервер ----------
const SID_KEY = 'aicreator.sid'
let sid = ''
/** Случайный номер урока: не связан с человеком, нужен только для лимита картинок на один урок. */
export function sessionId(): string {
  if (sid) return sid
  try {
    sid = localStorage.getItem(SID_KEY) ?? ''
  } catch {
    /* ignore */
  }
  if (!sid) {
    sid = crypto.randomUUID()
    try {
      localStorage.setItem(SID_KEY, sid)
    } catch {
      /* ignore */
    }
  }
  return sid
}
export function newSessionId() {
  sid = ''
  try {
    localStorage.removeItem(SID_KEY)
  } catch {
    /* ignore */
  }
}

export interface LiveStatus {
  enabled: boolean
  mock?: boolean
  sessionLimit?: number
  sessionRemaining?: number
}
let statusCache: Promise<LiveStatus> | null = null
export function getLiveStatus(force = false): Promise<LiveStatus> {
  if (!statusCache || force) {
    statusCache = fetch('/api/status', { headers: { 'x-session-id': sessionId(), ...authHeaders() } })
      .then((r) => (r.ok ? (r.json() as Promise<LiveStatus>) : { enabled: false }))
      .catch(() => ({ enabled: false }))
  }
  return statusCache
}

export const liveProvider: HeroImageProvider = {
  async generate({ spec, previous }) {
    let res: Response
    try {
      res = await fetch('/api/generate', {
        method: 'POST',
        // x-request-id уникален для каждого нажатия: повтор того же запроса сервер не выполняет второй раз
        headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId(), 'x-request-id': crypto.randomUUID(), ...authHeaders() },
        body: JSON.stringify({
          mode: previous ? 'edit' : 'create',
          spec,
          prevSpec: previous?.spec,
          prevImage: previous?.imageSrc && previous.imageSig ? { src: previous.imageSrc, sig: previous.imageSig } : undefined,
        }),
      })
    } catch {
      throw new GenerationError('network', 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new GenerationError((data.error as GenerationErrorCode) ?? 'upstream', data.message ?? 'Не получилось создать картинку.', data.field)
    const arch = spec.kind?.arch ?? 'beast'
    return {
      src: data.src,
      sig: data.sig,
      mock: !!data.mock,
      mode: 'ai',
      arch,
      exact: true,
      alt: `${spec.kind?.nom ?? 'Герой'}${spec.name ? ` — ${spec.name}` : ''}`,
    }
  },
}

/** Выбирает провайдера: сервер с ключом или демо. */
export async function pickProvider(): Promise<{ provider: HeroImageProvider; live: boolean }> {
  const st = await getLiveStatus()
  return st.enabled ? { provider: liveProvider, live: true } : { provider: demoProvider, live: false }
}

/** Сохраняет изображение героя как PNG. */
export async function downloadHeroImage(image: HeroImage, name: string) {
  const img = new Image()
  img.src = image.src
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1024
  canvas.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024)
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name || 'hero'}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
