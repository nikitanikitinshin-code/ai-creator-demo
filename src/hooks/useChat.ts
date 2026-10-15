import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatState, FeatureKey, LessonSummary, Msg, Spec, Stage } from '../types'
import { REVIEW_PROMPT, buildPrompt, chipsFor, contributionStickers, contributionTags, newConv, respond, summarize } from '../lib/dialog'
import { characterCardDataUrl, downloadCharacterCard } from '../lib/characterCard'
import { isInAppBrowser, track } from '../lib/analytics'
import { GenerationError, demoProvider, downloadHeroImage, getLiveStatus, liveProvider, newSessionId, pickProvider } from '../lib/imageProvider'
import { clearState, initialState, loadState, saveState } from '../lib/storage'
import { typeDuration } from '../lib/typing'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let seq = 0
const uid = () => `${Date.now().toString(36)}-${seq++}`

/** На этих этапах ребёнок общается с наставником, поле ввода активно. */
export const INPUT_STAGES: Stage[] = ['creating_character', 'editing_character']
/** Этапы после «Мне нравится»: поле ввода скрыто, показано предложение следующего проекта. */
export const FINALE_STAGES: Stage[] = ['character_approved', 'next_project_offer', 'parent_handoff', 'parent_offer']

/** Обрезает фразу ребёнка по границе слова. */
const shorten = (t: string, max = 70) => {
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : max)}…`
}

export function useChat() {
  const [state, setState] = useState<ChatState>(loadState)
  const ref = useRef(state)
  const epoch = useRef(0)
  const [typing, setTyping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saveHint, setSaveHint] = useState<{ src: string } | null>(null)
  const [liveMode, setLiveMode] = useState<'demo' | 'ai' | 'mock'>('demo')

  const update = useCallback((fn: (s: ChatState) => ChatState) => {
    ref.current = fn(ref.current)
    setState(ref.current)
  }, [])
  useEffect(() => saveState(state), [state])

  const push = useCallback((m: Msg) => update((s) => ({ ...s, messages: [...s.messages, m] })), [update])
  const setStage = useCallback((stage: Stage) => update((s) => ({ ...s, stage })), [update])

  /** Наставник «печатает» одну или несколько реплик подряд. */
  const say = useCallback(
    async (texts: string[], promptOn?: number, finale?: boolean) => {
      const my = epoch.current
      setBusy(true)
      for (let i = 0; i < texts.length; i++) {
        setTyping(true)
        await sleep(520 + Math.min(380, texts[i].length * 3))
        if (my !== epoch.current) return
        setTyping(false)
        push({
          id: uid(), role: 'ai', type: 'text', text: texts[i], animate: true, finale,
          prompt: promptOn === i ? buildPrompt(ref.current.conv.spec) : undefined,
        })
        await sleep(typeDuration(texts[i].length) + 260)
        if (my !== epoch.current) return
      }
      setBusy(false)
    },
    [push],
  )

  const lastImage = () => {
    const m = [...ref.current.messages].reverse().find((x) => x.type === 'image')
    return m && m.type === 'image' ? m : undefined
  }

  /**
   * Создаёт картинку героя или (если передана прошлая версия описания) обновляет её по правке.
   * Возвращает true, если новая картинка появилась в ленте.
   */
  const makeImage = useCallback(
    async (prevSpec?: Spec, forceDemo = false): Promise<boolean> => {
      const my = epoch.current
      const spec = ref.current.conv.spec
      const prompt = buildPrompt(spec)
      const prevImg = prevSpec ? lastImage() : undefined
      const { live } = await pickProvider()
      const useLive = live && !forceDemo && (!prevSpec || prevImg?.image.mode === 'ai')
      setBusy(true)
      push({ id: uid(), role: 'ai', type: 'loading', variant: !useLive ? 'demo' : prevSpec ? 'edit' : 'ai' })
      try {
        const image = await (useLive ? liveProvider : demoProvider).generate({
          prompt,
          spec,
          previous: prevSpec ? { spec: prevSpec, imageSrc: prevImg?.image.src, imageSig: prevImg?.image.sig } : undefined,
        })
        if (my !== epoch.current) return false
        update((s) => ({
          ...s,
          stage: 'editing_character',
          messages: [...s.messages.filter((m) => m.type !== 'loading'), { id: uid(), role: 'ai', type: 'image', image, name: spec.name, prompt, tags: contributionTags(spec), stickers: contributionStickers(spec) }],
        }))
        track(prevSpec ? 'image_updated' : 'image_shown', { mode: image.mode, arch: image.arch, exact: image.exact })
        await sleep(700)
        return my === epoch.current
      } catch (e) {
        if (my !== epoch.current) return false
        const err = e instanceof GenerationError ? e : new GenerationError('upstream', 'Не получилось создать картинку.')
        track('generate_error', { code: err.code, edit: !!prevSpec })
        update((s) => ({ ...s, messages: s.messages.filter((m) => m.type !== 'loading') }))
        await handleImageError(err, prevSpec)
        return false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [push, update],
  )

  /** Что сказать ребёнку и как подготовить диалог к повторной попытке. */
  const handleImageError = async (err: GenerationError, prevSpec?: Spec) => {
    const limit = err.code === 'session_limit' || err.code === 'daily_limit' || err.code === 'ip_limit'
    if (err.code === 'moderation') {
      // убираем именно ту часть описания, которая не прошла проверку на сервере
      update((s) => {
        const spec = { ...s.conv.spec, features: { ...s.conv.spec.features } }
        if (err.field === 'name') delete spec.name
        else if (err.field?.startsWith('feature:')) delete spec.features[err.field.slice(8) as FeatureKey]
        const conv = prevSpec ? { ...s.conv, spec: prevSpec, phase: 'review' as const } : { ...s.conv, spec, phase: 'collect' as const, pending: null }
        return { ...s, conv }
      })
    } else if (!prevSpec && !limit) {
      update((s) => ({ ...s, conv: { ...s.conv, phase: 'collect', pending: null } }))
    }
    if (limit && !prevSpec) {
      await say([`${err.message}\n\nЧтобы урок продолжился, покажу демо-иллюстрацию: это готовая картинка подходящего типа, а не рисунок ИИ.`])
      await makeImage(undefined, true)
      return
    }
    const tail = err.code === 'moderation' && prevSpec ? 'Я вернул героя к прошлому описанию, картинка осталась прежней.' : prevSpec ? 'Запрос сохранён, но картинка осталась прежней.' : 'Напиши любое сообщение или нажми подсказку, и я попробую ещё раз.'
    await say([`${err.message}\n\n${tail}`])
  }

  /** Первое изображение героя и приглашение посмотреть на него внимательно. */
  const generate = useCallback(async () => {
    const my = epoch.current
    const ok = await makeImage()
    if (ok && my === epoch.current) await say([REVIEW_PROMPT])
  }, [makeImage, say])

  const lessonSummary = useCallback((): LessonSummary => {
    const c = ref.current.conv
    const first = ref.current.messages.find((m) => m.role === 'user')
    const sm = summarize(c)
    return {
      details: sm.labels,
      questions: c.asked.length,
      edits: sm.edits,
      firstIdea: first && first.type === 'text' ? shorten(first.text) : '',
      promptWords: buildPrompt(c.spec).split(/\s+/).length,
      stickers: contributionStickers(c.spec),
    }
  }, [])

  /** «Мне нравится»: герой готов, показываем его карточку и предложение следующего проекта. */
  const runApproval = useCallback(async () => {
    const my = epoch.current
    // повторный вход не создаёт дублей: прежние финальные блоки заменяются новыми
    update((s) => ({ ...s, stage: 'character_approved', cartoonClicked: false, messages: s.messages.filter((m) => !m.finale) }))
    await say(['Твой герой готов! Ты придумал его сам и превратил свою идею в изображение с помощью ИИ.\n\nНо это только начало его истории...'], undefined, true)
    if (my !== epoch.current) return
    track('approve', { edits: ref.current.conv.changes })
    const img = [...ref.current.messages].reverse().find((m) => m.type === 'image')
    if (img && img.type === 'image') push({ id: uid(), role: 'ai', type: 'herocard', image: img.image, finale: true })
    await sleep(900)
    if (my !== epoch.current) return
    push({ id: uid(), role: 'ai', type: 'learned', summary: lessonSummary(), finale: true })
    await sleep(1000)
    if (my !== epoch.current) return
    if (img && img.type === 'image') push({ id: uid(), role: 'ai', type: 'storyboard', image: img.image, finale: true })
    await sleep(1000)
    if (my !== epoch.current) return
    push({ id: uid(), role: 'ai', type: 'upsell', finale: true })
    setStage('next_project_offer')
  }, [push, say, setStage, update])

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy || !INPUT_STAGES.includes(ref.current.stage)) return
      const my = epoch.current
      if (!ref.current.messages.some((m) => m.role === 'user')) track('first_message')
      push({ id: uid(), role: 'user', type: 'text', text })
      const before = ref.current.conv.changes
      const prevSpec: Spec = JSON.parse(JSON.stringify(ref.current.conv.spec))
      const live = ref.current.conv.phase !== 'collect' && lastImage()?.image.mode === 'ai' && (await getLiveStatus()).enabled
      const turn = respond(ref.current.conv, text, ref.current.messages.length, live)
      if (turn.conv.changes > before) track('edit_made', { n: turn.conv.changes })
      update((s) => ({ ...s, conv: turn.conv }))
      if (turn.say.length) await say(turn.say, turn.promptNote ? 0 : undefined)
      if (my !== epoch.current) return
      if (turn.regenerate) {
        const ok = await makeImage(prevSpec)
        if (my === epoch.current) await say([ok ? 'Вот обновлённый герой. Хочешь изменить что-то ещё или герой готов?' : 'Хочешь изменить что-то ещё или герой готов?'])
      } else if (turn.generate) await generate()
      else if (turn.upsell) await runApproval()
    },
    [busy, generate, makeImage, push, runApproval, say, update],
  )

  /** «Хочу создать мультфильм»: наставник предлагает показать проект родителям. */
  const wantCartoon = useCallback(async () => {
    if (ref.current.stage !== 'next_project_offer' || busy) return
    setStage('parent_handoff')
    track('cartoon_click')
    const my = epoch.current
    await say(
      ['Отлично! Следующий проект будет ещё интереснее.\n\nЧтобы продолжить обучение, покажи своего героя родителям. Они смогут узнать, как устроена программа AI Creator.'],
      undefined,
      true,
    )
    if (my !== epoch.current) return
    push({ id: uid(), role: 'ai', type: 'parentcta', finale: true })
  }, [busy, push, say, setStage])

  const openParents = useCallback(() => {
    if (ref.current.stage === 'parent_handoff') {
      setStage('parent_offer')
      track('parents_open')
    }
  }, [setStage])
  const closeParents = useCallback(() => {
    if (ref.current.stage === 'parent_offer') setStage('parent_handoff')
  }, [setStage])

  /** «Вернуться к моему герою»: история остаётся, поле ввода снова активно. */
  const backToHero = useCallback(async () => {
    if (busy || !FINALE_STAGES.includes(ref.current.stage)) return
    track('back_to_hero')
    update((s) => ({ ...s, stage: 'editing_character', conv: { ...s.conv, phase: 'review' } }))
    await say(['Хорошо, вернёмся к твоему герою. Что хочешь изменить?'])
  }, [busy, say, update])

  const restart = useCallback(() => {
    epoch.current++
    setTyping(false)
    setBusy(false)
    clearState()
    newSessionId()
    ref.current = initialState()
    setState(ref.current)
  }, [])

  /** Сохранение картинки. Во встроенных браузерах соцсетей скачивание часто не работает: показываем её с подсказкой. */
  const download = useCallback(async () => {
    const img = [...ref.current.messages].reverse().find((m) => m.type === 'image')
    if (!img || img.type !== 'image') return
    track('save_image', { inApp: isInAppBrowser() })
    if (isInAppBrowser()) return setSaveHint({ src: img.image.src })
    try {
      await downloadHeroImage(img.image, ref.current.conv.spec.name ?? ref.current.conv.spec.kind?.nom ?? 'hero')
    } catch {
      setSaveHint({ src: img.image.src })
    }
  }, [])

  /** Карточка героя: картинка, имя и стикеры «что задал ребёнок» одним файлом. */
  const downloadCard = useCallback(async () => {
    const img = [...ref.current.messages].reverse().find((m) => m.type === 'image')
    if (!img || img.type !== 'image') return
    const input = { image: img.image, name: ref.current.conv.spec.name, stickers: contributionStickers(ref.current.conv.spec) }
    track('save_card', { inApp: isInAppBrowser() })
    try {
      if (isInAppBrowser()) return setSaveHint({ src: await characterCardDataUrl(input) })
      await downloadCharacterCard(input)
    } catch {
      setSaveHint({ src: img.image.src })
    }
  }, [])

  useEffect(() => {
    void getLiveStatus().then((st) => setLiveMode(!st.enabled ? 'demo' : st.mock ? 'mock' : 'ai'))
  }, [])

  // страницу закрыли посреди «генерации» или финала — продолжаем с того же места
  useEffect(() => {
    const pending = ref.current.messages.find((m) => m.type === 'loading')
    if (pending) {
      update((s) => ({ ...s, messages: s.messages.filter((m) => m.type !== 'loading') }))
      // прерванную правку повторно не отправляем: расходы только по явному действию ребёнка
      if (pending.type === 'loading' && pending.variant !== 'edit') void generate()
    } else if (ref.current.stage === 'character_approved') {
      void runApproval()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    state,
    typing,
    busy,
    chips: chipsFor(state.conv),
    inputActive: INPUT_STAGES.includes(state.stage),
    saveHint,
    liveMode,
    closeSaveHint: () => setSaveHint(null),
    parentOpen: state.stage === 'parent_offer',
    actions: { send, restart, wantCartoon, download, downloadCard, backToHero, openParents, closeParents },
    emptyConv: newConv,
  }
}
export type Chat = ReturnType<typeof useChat>
