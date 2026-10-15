import type { ChatState, Msg } from '../types'
import { newConv } from './dialog'

const KEY = 'aicreator.chat.v2'
const VISIT_KEY = 'aicreator.visit'
/** Если с последнего действия прошло больше времени, урок считается брошенным и начинается заново. */
const STALE_MS = 3 * 60 * 60 * 1000
const FINISHED = ['character_approved', 'next_project_offer', 'parent_handoff', 'parent_offer']
const OLD_KEYS = ['aicreator.hero-lesson.v1']

export const initialState = (): ChatState => ({ conv: newConv(), messages: [], stage: 'creating_character', cartoonClicked: false })

export function loadState(): ChatState {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k))
    // эта вкладка уже открывала приложение? тогда это обновление страницы, а не новый визит
    let sameVisit = false
    try {
      sameVisit = sessionStorage.getItem(VISIT_KEY) === '1'
      sessionStorage.setItem(VISIT_KEY, '1')
    } catch {
      /* без sessionStorage считаем визит новым */
    }
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const s = { ...initialState(), ...(JSON.parse(raw) as Partial<ChatState>) } as ChatState
    const saved = JSON.parse(raw) as Partial<ChatState> & { updatedAt?: number }
    if (!saved.stage) {
      // данные до появления этапов: определяем этап по сообщениям
      const has = (t: string) => s.messages.some((m) => m.type === t)
      s.stage = has('parentcta') ? 'parent_handoff' : has('upsell') ? 'next_project_offer' : has('image') ? 'editing_character' : 'creating_character'
    }
    if (s.stage === 'parent_offer') s.stage = 'parent_handoff'

    // Новое открытие ссылки (новая вкладка) после завершённого или давно брошенного урока начинается с чистого экрана.
    // Обновление страницы в той же вкладке продолжает урок с того же места.
    const stale = saved.updatedAt ? Date.now() - saved.updatedAt > STALE_MS : false
    if (stale || (!sameVisit && FINISHED.includes(s.stage))) {
      localStorage.removeItem(KEY)
      return initialState()
    }
    return s
  } catch {
    return initialState()
  }
}

export function saveState(s: ChatState) {
  try {
    const messages = s.messages.map((m): Msg => (m.type === 'text' && m.role === 'ai' ? { ...m, animate: false } : m))
    localStorage.setItem(KEY, JSON.stringify({ ...s, messages, updatedAt: Date.now() }))
  } catch {
    /* localStorage может быть недоступен: прототип продолжит работать без сохранения */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
