import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { createApi } from './handler'

/**
 * Боевой сервер: отдаёт готовое приложение (папка dist) и API генерации.
 * Запуск: npm run build && npm run build:server && npm start
 * Ключ fal.ai и лимиты задаются переменными окружения (см. .env.example).
 */
const root = process.cwd()
const dist = path.join(root, 'dist')
const api = createApi(process.env, { dataDir: process.env.DATA_DIR ?? path.join(root, '.data') })

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
}

function headers(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0])
  let file = path.normalize(path.join(dist, url))
  if (!file.startsWith(dist)) {
    res.statusCode = 403
    return res.end()
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html')
  } catch {
    file = path.join(dist, 'index.html') // переходы внутри приложения
  }
  try {
    const body = await readFile(file)
    const ext = path.extname(file)
    res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache')
    res.end(body)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}

const server = createServer((req, res) => {
  headers(res)
  if (req.url === '/healthz') {
    res.setHeader('Content-Type', 'text/plain')
    return res.end('ok')
  }
  api.middleware(req, res, () => void serveStatic(req, res))
})

const port = Number(process.env.PORT) || 8080
server.listen(port, '0.0.0.0', () => {
  const c = api.config
  console.log(`AI Creator: http://0.0.0.0:${port}`)
  console.log(
    c.mock
      ? '[fal] ТЕСТОВЫЙ РЕЖИМ (FAL_MOCK)'
      : c.enabled
        ? `[fal] генерация включена: ${c.model}; ${c.dailyLimit}/день${c.totalLimit ? `, потолок ${c.totalLimit}` : ''}, ${c.sessionLimit}/урок${c.accessCode ? ', доступ по коду' : ', БЕЗ кода доступа'}`
        : '[fal] ключ не задан: демо-режим',
  )
})
