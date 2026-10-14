/** Настройки серверной части. Все значения берутся из переменных окружения (.env.local). */
export interface ApiEnv {
  FAL_KEY?: string
  /** FAL_ENABLED=false — аварийный выключатель: сервер перестаёт обращаться к fal.ai */
  FAL_ENABLED?: string
  /** FAL_MOCK=1 — имитация ответа без обращения к fal.ai и без расходов (для проверки интерфейса) */
  FAL_MOCK?: string
  FAL_MODEL?: string
  FAL_EDIT_MODEL?: string
  FAL_DAILY_LIMIT?: string
  /** Общий потолок картинок за время работы сервера (0 или пусто — без потолка) */
  FAL_TOTAL_LIMIT?: string
  /** true: брать адрес посетителя из X-Forwarded-For (только за доверенным туннелем или прокси) */
  FAL_TRUST_PROXY?: string
  FAL_HOURLY_PER_IP?: string
  FAL_SESSION_LIMIT?: string
  FAL_MAX_CONCURRENT?: string
  FAL_TIMEOUT_MS?: string
  /** Оценка стоимости одной картинки в USD (для журнала расходов) */
  FAL_COST_PER_IMAGE?: string
  FAL_DEBUG?: string
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

export function readConfig(env: ApiEnv) {
  const mock = env.FAL_MOCK === '1' || env.FAL_MOCK === 'true'
  const hasKey = !!env.FAL_KEY && env.FAL_KEY.trim().length > 10 && !env.FAL_KEY.includes('your')
  return {
    mock,
    enabled: env.FAL_ENABLED !== 'false' && (mock || hasKey),
    model: env.FAL_MODEL || 'fal-ai/nano-banana',
    editModel: env.FAL_EDIT_MODEL || 'fal-ai/nano-banana/edit',
    /** всего картинок в день на весь сервер */
    dailyLimit: num(env.FAL_DAILY_LIMIT, 100),
    totalLimit: Number(env.FAL_TOTAL_LIMIT) > 0 ? Number(env.FAL_TOTAL_LIMIT) : 0,
    trustProxy: env.FAL_TRUST_PROXY === 'true',
    /** запросов в час с одного адреса */
    hourlyPerIp: num(env.FAL_HOURLY_PER_IP, 8),
    /** картинок на один урок: первое изображение + правки */
    sessionLimit: num(env.FAL_SESSION_LIMIT, 4),
    maxConcurrent: num(env.FAL_MAX_CONCURRENT, 3),
    timeoutMs: num(env.FAL_TIMEOUT_MS, 70_000),
    costPerImage: num(env.FAL_COST_PER_IMAGE, 0.039),
    debug: env.FAL_DEBUG === 'true',
  }
}
export type ApiConfig = ReturnType<typeof readConfig>
