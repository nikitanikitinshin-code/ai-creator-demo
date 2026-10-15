import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App'
import './index.css'
import { installStatsHelper, track } from './lib/analytics'

installStatsHelper()
// шрифты для карточки героя подгружаем заранее, чтобы сохранение не ждало
void Promise.all(['500 30px', '700 40px', '800 78px'].map((f) => document.fonts?.load(`${f} "Inter Variable"`, 'Аа'))).catch(() => {})
track('app_open')

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
)
