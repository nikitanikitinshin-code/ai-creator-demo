import type { ChatState, Msg } from '../types'
import { newConv } from './dialog'

const KEY = 'aicreator.chat.v2'
const OLD_KEYS = ['aicreator.hero-lesson.v1']

export const initialState = (): ChatState => ({ conv: newConv(), messages: [], stage: 'creating_character', cartoonClicked: false })

export function loadState(): ChatState {
  try {
    OLD_KEYS.forEach((k) => localStorage.removeItem(k))
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const s = { ...initialState(), ...(JSON.parse(raw) as Partial<ChatState>) } as ChatState
    const saved = JSON.parse(raw) as Partial<ChatState>
    if (!saved.stage) {
      // данные до появления этапов: определяем этап по сообщениям
      const has = (t: string) => s.messages.some((m) => m.type === t)
      s.stage = has('parentcta') ? 'parent_handoff' : has('upsell') ? 'next_project_offer' : has('image') ? 'editing_character' : 'creating_character'
    }
    if (s.stage === 'parent_offer') s.stage = 'parent_handoff'
    return s
  } catch {
    return initialState()
  }
}

export function saveState(s: ChatState) {
  try {
    const messages = s.messages.map((m): Msg => (m.type === 'text' && m.role === 'ai' ? { ...m, animate: false } : m))
    localStorage.setItem(KEY, JSON.stringify({ ...s, messages }))
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
