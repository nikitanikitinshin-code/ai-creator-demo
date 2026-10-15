import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Info, Smartphone, Sparkles, SquarePen } from 'lucide-react'
import { useChat } from './hooks/useChat'
import { Composer } from './components/Composer'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ParentSheet } from './components/ParentSheet'
import { AboutModal } from './components/AboutModal'
import { AiText, HeroSummary, ImageBlock, LearnedCard, Loading, ParentCta, Storyboard, Typing, UpsellCard, UserBubble } from './components/Messages'
import { SlotBar } from './components/SlotBar'
import { IdeaDemo } from './components/IdeaDemo'
import { contributionStickers } from './lib/dialog'
import { Lightbox } from './components/Lightbox'
import { checkText } from '../server/safety'
import { track } from './lib/analytics'
import type { Chip } from './types'

const START_CHIPS = [
  { emoji: '🐉', text: 'Дракон из будущего' },
  { emoji: '🤖', text: 'Боевой робот' },
  { emoji: '🦊', text: 'Волшебное животное' },
]

export default function App() {
  const chat = useChat()
  const { state, typing, busy, chips, actions, inputActive } = chat
  const [value, setValue] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [about, setAbout] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const openAbout = () => {
    track('about_open')
    setAbout(true)
  }
  const input = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  const empty = state.messages.length === 0 && !typing && !busy

  // автопрокрутка к новым сообщениям, пока пользователь сам не отскроллил вверх
  useEffect(() => {
    const el = content.current
    const sc = scroller.current
    if (!el || !sc) return
    const ro = new ResizeObserver(() => {
      if (stick.current) sc.scrollTo({ top: sc.scrollHeight })
    })
    ro.observe(el)
    ro.observe(sc)
    return () => ro.disconnect()
  }, [empty])
  useLayoutEffect(() => {
    stick.current = true
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [empty])

  // новое изображение показываем с начала, остальное — по нижнему краю
  const lastImage = [...state.messages].reverse().find((m) => m.type === 'image')?.id
  const seenImage = useRef(lastImage)
  useEffect(() => {
    if (!lastImage || seenImage.current === lastImage) return
    seenImage.current = lastImage
    stick.current = false
    setTimeout(() => document.getElementById(`msg-${lastImage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
  }, [lastImage])

  const send = (text = value) => {
    if (!text.trim() || busy) return
    const verdict = checkText(text)
    if (!verdict.ok) {
      // личные данные и неподходящие слова не отправляем: ребёнок видит подсказку и может переписать текст
      setHint(verdict.reason === 'personal' || verdict.reason === 'link' ? 'Похоже, в сообщении личные данные или ссылка. Лучше не писать их: опиши только героя.' : 'Это слово не подходит для урока. Попробуй описать героя другими словами.')
      track('input_blocked', { reason: verdict.reason })
      return
    }
    setHint(null)
    setValue('')
    stick.current = true
    void actions.send(text)
  }

  const pickChip = (c: Chip) => {
    if (c.mode === 'send') return send(c.text)
    if (c.mode === 'fill') setValue(c.text ?? c.label)
    else setValue('')
    input.current?.focus()
  }

  useEffect(() => {
    if (!busy && window.matchMedia('(pointer:fine)').matches) input.current?.focus()
  }, [busy, empty])

  const placeholder = empty
    ? 'Опиши, кого хочешь создать...'
    : state.conv.phase === 'collect' ? 'Опиши свою идею...' : 'Напиши, что изменить...'

  const heroForParents = (() => {
    const m = [...state.messages].reverse().find((x) => x.type === 'image')
    return m && m.type === 'image' ? { image: m.image, name: state.conv.spec.name } : undefined
  })()

  const composer = (
    <Composer ref={input} value={value} onChange={(v) => { setValue(v); setHint(null) }} onSend={() => send()} disabled={busy} large={empty} placeholder={placeholder} />
  )

  const learned = (() => {
    const m = [...state.messages].reverse().find((x) => x.type === 'learned')
    return m && m.type === 'learned' ? m.summary : undefined
  })()

  let prevAi = false
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-x-hidden bg-white">
      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <span className="text-xl text-violet-600">✦</span> AI Creator
        </div>
        <div className="flex items-center gap-1">
          <button onClick={openAbout} className="rounded-full px-3 py-1.5 text-[13.5px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            Для родителей
          </button>
          {!empty && (
            <button onClick={() => setConfirm(true)} aria-label="Новый герой" title="Новый герой" className="ml-1 grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </header>

      {empty ? (
        <main className="relative flex flex-1 flex-col items-center overflow-y-auto px-4 pb-5">
          <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[75%]" />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative my-auto w-full max-w-2xl py-3 text-center">
            <span className="mb-3 inline-block rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 min-[360px]:px-3 min-[360px]:text-[12px] sm:mb-4 sm:text-[12.5px]">
              Бесплатный AI-урок · 8–14 лет · 5–10 минут
            </span>
            <h1 className="text-[clamp(2rem,9vw,3.5rem)] font-extrabold leading-[1.06] tracking-tight">Что создадим сегодня?</h1>
            <p className="mx-auto mt-3 max-w-[22rem] text-[15.5px] leading-relaxed text-slate-500 sm:max-w-md sm:text-[17px]">
              Придумай своего героя, а AI-наставник поможет превратить твою идею в изображение.
            </p>
            <motion.div layoutId="composer" className="mx-auto mt-7 max-w-xl text-left">{composer}</motion.div>
            <p className={`mx-auto mt-2 max-w-xl px-2 text-center text-[12px] leading-snug ${hint ? 'font-medium text-orange-600' : 'text-slate-500'}`} role={hint ? 'alert' : undefined}>
              {hint ?? 'Не пиши настоящее имя, адрес и школу: опиши только героя.'}
            </p>
            <div className="mx-auto mt-3 flex max-w-xl flex-wrap justify-center gap-2">
              {START_CHIPS.map((c) => (
                <button key={c.text} onClick={() => { setValue(c.text); setHint(null); input.current?.focus() }} className="chip">
                  <span className="mr-1.5 text-[15px]">{c.emoji}</span>{c.text}
                </button>
              ))}
            </div>
            <div className="mx-auto mt-5 hidden max-w-md [@media(min-height:900px)]:block"><IdeaDemo /></div>
            <aside className="mx-auto mt-5 max-w-md rounded-2xl bg-slate-50 px-4 py-3 text-left sm:mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Родителям</h2>
                <button onClick={openAbout} className="text-[12.5px] font-medium text-violet-700 hover:text-violet-900">Подробнее →</button>
              </div>
              <ul className="mt-1.5 space-y-1.5 text-[13px] leading-snug text-slate-600">
                <li className="flex gap-2"><Smartphone className="mt-[2px] h-3.5 w-3.5 shrink-0 text-slate-500" />Передайте устройство ребёнку: он сам опишет героя и получит иллюстрацию.</li>
                <li className="flex gap-2"><Sparkles className="mt-[2px] h-3.5 w-3.5 shrink-0 text-slate-500" />Он учится описывать идею, уточнять и улучшать запрос к ИИ.</li>
                <li className="flex gap-2"><Info className="mt-[2px] h-3.5 w-3.5 shrink-0 text-slate-500" />{chat.liveMode === 'ai'
                  ? 'Наставник работает по сценарию, а картинку рисует ИИ-сервис по описанию героя (без личных данных). Без регистрации, история остаётся на этом устройстве.'
                  : chat.liveMode === 'mock'
                    ? 'Тестовый режим: картинки имитируются, ИИ не вызывается. Без регистрации.'
                    : 'Это демо: наставник работает по сценарию, картинки готовые. Без регистрации, история остаётся только на этом устройстве.'}</li>
              </ul>
            </aside>
          </motion.div>
        </main>
      ) : (
        <>
          {inputActive && state.conv.spec.kind && <SlotBar spec={state.conv.spec} />}
          <div
            ref={scroller}
            className="relative flex-1 overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160
            }}
          >
            <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70" />
            <div ref={content} role="log" aria-live="polite" aria-label="Диалог с наставником" className="relative mx-auto flex max-w-[42rem] flex-col gap-6 px-4 pb-6 pt-3 sm:px-6">
              {state.messages.map((m) => {
                const first = !prevAi
                prevAi = m.role === 'ai' && m.type === 'text'
                if (m.role === 'user') { prevAi = false; return <UserBubble key={m.id} text={m.text} /> }
                switch (m.type) {
                  case 'text': return <AiText key={m.id} m={m} showMark={first} />
                  case 'loading': return <Loading key={m.id} variant={m.variant} spec={state.conv.spec} />
                  case 'image': return <ImageBlock key={m.id} m={m} />
                  case 'herocard': return <HeroSummary key={m.id} m={m} name={state.conv.spec.name} stickers={contributionStickers(state.conv.spec)} onSaveCard={actions.downloadCard} onSaveImage={actions.download} />
                  case 'storyboard': return <Storyboard key={m.id} image={m.image} />
                  case 'learned': return <LearnedCard key={m.id} s={m.summary} />
                  case 'upsell': return <UpsellCard key={m.id} mode={state.stage === 'next_project_offer' ? 'active' : state.stage === 'parent_handoff' || state.stage === 'parent_offer' ? 'done' : 'idle'} onClick={actions.wantCartoon} />
                  case 'parentcta': return <ParentCta key={m.id} active={state.stage === 'parent_handoff'} onOpen={actions.openParents} />
                }
              })}
              {typing && <Typing showMark={!prevAi} />}
            </div>
          </div>

          <footer className="pb-safe shrink-0 bg-white px-4 pt-1.5 sm:px-6">
            <div className="mx-auto max-w-[42rem]">
              {hint && inputActive && <p role="alert" className="mb-2 px-1 text-[13px] font-medium text-orange-600">{hint}</p>}
              <AnimatePresence mode="popLayout">
                {inputActive && !busy && chips.length > 0 && (
                  <motion.div key={chips.map((c) => c.label).join('|')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-2 flex flex-wrap gap-1.5">
                    {chips.map((c) => (
                      <button key={c.label} onClick={() => pickChip(c)} className={`chip ${c.mode === 'focus' ? '!border-dashed !bg-white' : ''}`}>
                        {c.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {inputActive ? (
                <motion.div layoutId="composer">{composer}</motion.div>
              ) : (
                <div className="flex justify-center py-1.5">
                  <button onClick={actions.backToHero} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40">
                    <ArrowLeft className="h-4 w-4" /> Вернуться к моему герою
                  </button>
                </div>
              )}
            </div>
          </footer>
        </>
      )}

      <Lightbox open={!!chat.saveHint} src={chat.saveHint?.src ?? ''} alt="Твой герой" hint="Нажми на картинку и удерживай её, чтобы сохранить" onClose={chat.closeSaveHint} />
      <AboutModal liveMode={chat.liveMode} open={about} onClose={() => { setAbout(false); setTimeout(() => window.matchMedia('(pointer:fine)').matches && input.current?.focus(), 250) }} />
      <ParentSheet open={chat.parentOpen} onClose={actions.closeParents} hero={heroForParents} summary={learned} onSave={actions.download} />
      <ConfirmDialog
        open={confirm}
        title="Создать нового героя?"
        text="Текущий диалог и герой будут удалены. Если хочешь оставить картинку, сначала скачай её."
        confirmLabel="Создать нового"
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); setValue(''); actions.restart() }}
      />
    </div>
  )
}
