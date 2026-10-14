import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { falApi } from './server/vitePlugin'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // переменные без префикса VITE_ читаются только здесь, на сервере, и в браузер не попадают
  const env = loadEnv(mode, root, '')
  // публичный доступ только через туннели; другие имена хостов Vite отклоняет
  const hosts = ['.lhr.life', '.localhost.run', '.trycloudflare.com', '.ngrok-free.app', '.loca.lt']
  return {
    root,
    // адрес сайта: для GitHub Pages сборка идёт с VITE_BASE=/имя-репозитория/
    base: env.VITE_BASE || '/',
    plugins: [react(), falApi(env, path.join(root, '.data'))],
    server: { allowedHosts: hosts },
    preview: { allowedHosts: hosts },
  }
})
