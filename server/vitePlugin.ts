import type { Plugin } from 'vite'
import { createApi } from './handler'
import type { ApiEnv } from './config'

/** Подключает /api/status и /api/generate к dev- и preview-серверу Vite. Ключ остаётся на сервере. */
export function falApi(env: ApiEnv, dataDir: string): Plugin {
  const api = createApi(env, { dataDir })
  const c = api.config
  const banner = () =>
    console.log(
      c.mock
        ? '[fal] ТЕСТОВЫЙ РЕЖИМ (FAL_MOCK): ответы имитируются, расходов нет'
        : c.enabled
          ? `[fal] генерация включена: ${c.model}; лимит ${c.dailyLimit} в день, ${c.sessionLimit} на урок`
          : '[fal] ключ не задан или генерация выключена: приложение работает в демо-режиме',
    )
  return {
    name: 'ai-creator-fal-api',
    configureServer(server) {
      server.middlewares.use(api.middleware)
      banner()
    },
    configurePreviewServer(server) {
      server.middlewares.use(api.middleware)
      banner()
    },
  }
}
