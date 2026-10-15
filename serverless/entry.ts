import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApi } from '../server/handler'
import { upstashFromEnv } from '../server/store'

/**
 * Точка входа для Vercel Serverless Functions (/api/status и /api/generate).
 * Счётчики расходов хранятся в общем Redis (Upstash): в бессерверной среде запросы идут в разных
 * экземплярах функции, память не годится. Без Redis генерация выключена: лучше демо, чем расходы без контроля.
 */
const env = { ...process.env, FAL_TRUST_PROXY: 'true' } as Record<string, string | undefined>
// на публичном сайте готовые демо-картинки сами не подставляются (включить: FAL_ALLOW_DEMO=true)
env.FAL_ALLOW_DEMO ??= 'false'
const store = upstashFromEnv(env)
if (!store && env.FAL_MOCK !== '1') {
  console.error('[fal] Redis (Upstash) не подключён: генерация отключена')
  env.FAL_NO_STORE = '1'
}
const api = createApi(env, store ? { store } : { usageFile: null })

export default function handler(req: IncomingMessage, res: ServerResponse) {
  api.middleware(req, res, () => {
    res.statusCode = 404
    res.end('Not found')
  })
}
