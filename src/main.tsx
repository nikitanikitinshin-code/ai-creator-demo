import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { installStatsHelper, track } from './lib/analytics'

installStatsHelper()
track('app_open')

createRoot(document.getElementById('root')!).render(<App />)
