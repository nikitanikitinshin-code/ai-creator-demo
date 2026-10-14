/**
 * Лёгкая аналитика воронки без внешних сервисов и без персональных данных:
 * события пишутся в localStorage этого устройства. Чтобы подключить настоящую систему,
 * вызовите setSink((e) => отправить(e)).
 */
export interface AppEvent {
  t: number
  name: string
  props?: Record<string, string | number | boolean>
}

const KEY = 'aicreator.events.v1'
let sink: ((e: AppEvent) => void) | null = null
export const setSink = (fn: ((e: AppEvent) => void) | null) => { sink = fn }

function read(): AppEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as AppEvent[]
  } catch {
    return []
  }
}

export function track(name: string, props?: AppEvent['props']) {
  const e: AppEvent = { t: Date.now(), name, props }
  try {
    localStorage.setItem(KEY, JSON.stringify([...read(), e].slice(-300)))
  } catch {
    /* без хранилища просто пропускаем */
  }
  sink?.(e)
}

/** Воронка в консоли: aiCreatorStats() */
export function installStatsHelper() {
  const w = window as unknown as { aiCreatorStats?: () => Record<string, number> }
  w.aiCreatorStats = () => {
    const counts: Record<string, number> = {}
    for (const e of read()) counts[e.name] = (counts[e.name] ?? 0) + 1
    console.table(counts)
    return counts
  }
}

export const isInAppBrowser = () => /Instagram|FBAN|FBAV|musical_ly|TikTok|BytedanceWebview|Telegram/i.test(navigator.userAgent)
