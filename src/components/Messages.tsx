import { type ReactNode, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronRight, Clapperboard, Download, Drama, Globe, Image as ImageIcon, Info, Maximize2, Mic } from 'lucide-react'
import type { Msg, Spec, Sticker } from '../types'
import { contributionStickers } from '../lib/dialog'
import { StickerPill } from './Stickers'
import { Typewriter } from './Typewriter'
import { Lightbox } from './Lightbox'

export function Mark({ className = '' }: { className?: string }) {
  return (
    <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-600 text-[13px] leading-none text-white ${className}`} aria-hidden>
      ✦
    </div>
  )
}

const enter = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: 'easeOut' as const } }

export function AiRow({ children, showMark = true, anchor }: { children: ReactNode; showMark?: boolean; anchor?: string }) {
  return (
    <motion.div id={anchor} {...enter} className="flex scroll-mt-4 items-start gap-3">
      {showMark ? <Mark className="mt-0.5" /> : <div className="w-7 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </motion.div>
  )
}

export function PromptLink({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="-my-1 inline-flex min-h-[40px] items-center gap-1 text-left text-sm font-medium text-violet-700 hover:text-violet-900">
        <ChevronRight className={`h-4 w-4 transition ${open ? 'rotate-90' : ''}`} />
        {open ? 'Скрыть AI-запрос' : 'Посмотреть мой AI-запрос'}
      </button>
      {open && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-[14.5px] leading-relaxed text-slate-600">
          {prompt}
        </motion.p>
      )}
    </div>
  )
}

export function AiText({ m, showMark }: { m: Extract<Msg, { type: 'text'; role: 'ai' }>; showMark: boolean }) {
  return (
    <AiRow showMark={showMark}>
      <p className="max-w-[36rem] whitespace-pre-line break-words text-[16px] leading-[1.65] text-slate-800">
        <Typewriter text={m.text} animate={m.animate} />
      </p>
      {m.prompt && <PromptLink prompt={m.prompt} />}
    </AiRow>
  )
}

export function UserBubble({ text }: { text: string }) {
  return (
    <motion.div {...enter} className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] bg-slate-100 px-4 py-2.5 text-[16px] leading-relaxed text-slate-900">{text}</div>
    </motion.div>
  )
}

export function Typing({ showMark }: { showMark: boolean }) {
  return (
    <AiRow showMark={showMark}>
      <div className="flex h-7 items-center gap-1.5" aria-label="Наставник печатает">
        {[0, 1, 2].map((d) => (
          <motion.span key={d} className="h-2 w-2 rounded-full bg-slate-300" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.16 }} />
        ))}
      </div>
    </AiRow>
  )
}

const STEPS = {
  demo: ['Собираем твой запрос…', 'Подбираем демо-иллюстрацию под твоё описание…', 'Подстраиваем цвета и детали…'],
  ai: ['Собираем твой запрос…', 'Отправляем описание ИИ…', 'ИИ рисует героя, это может занять до минуты…'],
  edit: ['Берём прошлую версию героя…', 'Вносим твои правки…', 'ИИ обновляет картинку, это может занять до минуты…'],
}

/** Показывает, как слова ребёнка собираются в запрос: стикеры по очереди «приземляются» в рамку запроса. */
function PromptAssembly({ spec }: { spec?: Spec }) {
  const stickers = spec ? contributionStickers(spec) : []
  if (!stickers.length) return null
  return (
    <div className="mb-3 max-w-[26rem] rounded-2xl bg-slate-50 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Твой запрос для ИИ</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {stickers.map((st, i) => (
          <motion.span key={st.t} initial={{ opacity: 0, y: 10, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2 + i * 0.26, type: 'spring', stiffness: 380, damping: 20 }}>
            <StickerPill s={st} />
          </motion.span>
        ))}
      </div>
      <p className="mt-2.5 text-[12.5px] leading-snug text-slate-500">ИИ видит только слова. Каждая деталь — подсказка для него.</p>
    </div>
  )
}

export function Loading({ variant = 'demo', spec }: { variant?: 'demo' | 'ai' | 'edit'; spec?: Spec }) {
  const LOADING_STEPS = STEPS[variant]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((v) => Math.min(v + 1, LOADING_STEPS.length - 1)), variant === 'demo' ? 900 : 4500)
    return () => clearInterval(t)
  }, [LOADING_STEPS.length, variant])
  return (
    <AiRow>
      <p className="flex items-center gap-1 text-[16.5px] text-slate-700">
        Создаём твоего героя
        {[0, 1, 2].map((d) => (
          <motion.span key={d} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }}>.</motion.span>
        ))}
      </p>
      <p className="mb-3 mt-0.5 min-h-[20px] text-[13.5px] text-slate-500" aria-live="polite">{LOADING_STEPS[step]}</p>
      <PromptAssembly spec={spec} />
      <div className="shimmer relative grid aspect-[4/3] w-[88%] max-w-[21rem] place-items-center overflow-hidden rounded-2xl" role="img" aria-label="Картинка героя создаётся">
        <motion.span className="text-4xl text-violet-500" animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
          ✦
        </motion.span>
      </div>
      {variant === 'demo' && <p className="mt-2 text-[12.5px] text-slate-500">Демо: используем готовую иллюстрацию подходящего типа.</p>}
    </AiRow>
  )
}

const SPARKS = [
  { x: '-4%', y: '8%', d: 0.9 }, { x: '96%', y: '14%', d: 1.05 }, { x: '2%', y: '78%', d: 1.2 }, { x: '94%', y: '70%', d: 1.0 }, { x: '48%', y: '-3%', d: 1.15 },
]

export function ImageBlock({ m }: { m: Extract<Msg, { type: 'image' }> }) {
  const { image } = m
  const [zoom, setZoom] = useState(false)
  const reduce = useReducedMotion()
  // торжественное появление только у свежей картинки, а не при каждой перезагрузке страницы
  const ts = parseInt(m.id.split('-')[0], 36)
  const calm = reduce || !Number.isFinite(ts) || Date.now() - ts > 20_000
  const stickers: Sticker[] = m.stickers ?? (m.tags ?? []).map((t) => ({ t, c: 'extra' as const }))
  return (
    <AiRow anchor={`msg-${m.id}`}>
      <Lightbox open={zoom} src={image.src} alt={image.alt} onClose={() => setZoom(false)} />
      <div className="max-w-[28rem]">
        <div className="relative w-[88%] max-w-[21rem]">
          <motion.div
            initial={calm ? false : { clipPath: 'inset(0 0 100% 0 round 16px)', filter: 'blur(14px) saturate(0.3)', scale: 1.04 }}
            animate={{ clipPath: 'inset(0 0 0% 0 round 16px)', filter: 'blur(0px) saturate(1)', scale: 1 }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <button type="button" onClick={() => setZoom(true)} aria-label="Открыть изображение на весь экран" className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-slate-100 shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2">
              <img src={image.src} alt={image.alt} className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]" draggable={false} />
              {image.mode === 'demo' ? (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wide text-orange-600 shadow-sm backdrop-blur">Демо-изображение</span>
              ) : (
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wide text-violet-700 shadow-sm backdrop-blur">{image.mock ? 'Тест: имитация ИИ' : 'Создано ИИ'}</span>
              )}
              <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-slate-700 opacity-0 backdrop-blur transition group-hover:opacity-100 max-sm:opacity-100"><Maximize2 className="h-4 w-4" /></span>
              {!calm && (
                <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent" initial={{ x: '0%' }} animate={{ x: '320%' }} transition={{ delay: 0.7, duration: 1.1, ease: 'easeInOut' }} />
              )}
            </button>
          </motion.div>
          {!calm &&
            SPARKS.map((sp, i) => (
              <motion.span key={i} aria-hidden className="pointer-events-none absolute text-violet-500" style={{ left: sp.x, top: sp.y }} initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 1, 0], scale: [0.3, 1.1, 0.6], y: [0, -10, -18] }} transition={{ delay: sp.d, duration: 1.2, ease: 'easeOut' }}>
                ✦
              </motion.span>
            ))}
        </div>
        {m.name && (
          <motion.p initial={calm ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }} className="mt-3 text-2xl font-extrabold tracking-tight">{m.name}</motion.p>
        )}
        {stickers.length > 0 && (
          <div className="mt-3">
            <p className="text-[12px] font-semibold text-slate-500">Твой вклад: ты задал</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {stickers.map((st, i) => (
                <motion.li key={st.t} initial={calm ? false : { opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.1 + i * 0.1, type: 'spring', stiffness: 380, damping: 22 }}>
                  <StickerPill s={st} />
                </motion.li>
              ))}
            </ul>
          </div>
        )}
        <PromptLink prompt={m.prompt} />
        {image.mode === 'ai' && (
          <p className="mt-3 flex gap-2 text-[13px] leading-snug text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            {image.mock
              ? 'Тестовый режим сервера: это имитация, нейросеть не вызывалась.'
              : 'Картинку нарисовал ИИ по твоему описанию. Результат может отличаться от задумки: уточни описание, чтобы приблизить его.'}
          </p>
        )}
        {image.mode === 'demo' && (
          <p className="mt-3 flex gap-2 text-[13px] leading-snug text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            {image.exact
              ? 'Это готовая иллюстрация подходящего типа. Цвета, рога, крылья и стиль подстроены под твоё описание, остальные детали могут отличаться. Рисунок по твоему запросу станет возможен после подключения генерации.'
              : 'Для такого героя в демо нет точной иллюстрации, поэтому показан ближайший вариант. Это визуальная демонстрация, а не рисунок по твоему запросу.'}
          </p>
        )}
      </div>
    </AiRow>
  )
}

const PERKS = [
  { icon: Globe, t: 'Создать свой мир', d: 'Придумать целую вселенную.', c: 'bg-sky-100 text-sky-700' },
  { icon: Drama, t: 'Оживить героя', d: 'Добавить движения и эмоции.', c: 'bg-orange-100 text-orange-700' },
  { icon: Mic, t: 'Дать ему голос', d: 'Пусть персонаж заговорит.', c: 'bg-violet-100 text-violet-700' },
  { icon: Clapperboard, t: 'Снять мультфильм', d: 'Создать собственную историю.', c: 'bg-emerald-100 text-emerald-700' },
]

/** Паспорт героя: то, что ребёнок придумал и может сохранить как карточку. */
export function HeroSummary({
  m, name, stickers, onSaveCard, onSaveImage,
}: {
  m: Extract<Msg, { type: 'herocard' }>
  name?: string
  stickers: Sticker[]
  onSaveCard: () => void
  onSaveImage: () => void
}) {
  const [zoom, setZoom] = useState(false)
  const calm = useReducedMotion()
  return (
    <AiRow showMark={false}>
      <Lightbox open={zoom} src={m.image.src} alt={m.image.alt} onClose={() => setZoom(false)} />
      <div className="w-[92%] max-w-[19rem] rounded-3xl bg-slate-50 p-2.5">
        <button type="button" onClick={() => setZoom(true)} aria-label="Открыть изображение на весь экран" className="block w-full cursor-zoom-in overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
          <motion.img
            src={m.image.src}
            alt={m.image.alt}
            className="aspect-square w-full object-cover"
            draggable={false}
            animate={calm ? undefined : { y: [0, -5, 0], scale: [1.02, 1.05, 1.02] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          />
        </button>
        <div className="px-1.5 pb-1 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Паспорт героя</p>
          <p className="mt-0.5 text-[19px] font-extrabold leading-tight tracking-tight">{name ?? 'Мой первый AI-герой'}</p>
          <p className="text-[13px] leading-tight text-slate-500">Автор: ты · {m.image.mode === 'demo' ? 'демо-иллюстрация' : m.image.mock ? 'тестовая имитация' : 'создано ИИ'}</p>
          {stickers.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {stickers.slice(0, 8).map((st) => (
                <li key={st.t}><StickerPill s={st} /></li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1.5 px-1 pb-1">
          <button onClick={onSaveCard} className="btn-primary !py-2.5 !text-[14px]"><Download className="h-4 w-4" /> Сохранить карточку героя</button>
          <button onClick={onSaveImage} className="inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"><ImageIcon className="h-3.5 w-3.5" /> Только картинку</button>
        </div>
        <p className="px-1.5 pb-1 text-[11.5px] leading-snug text-slate-500">Демо-эффект: так герой мог бы выглядеть в движении.</p>
      </div>
    </AiRow>
  )
}

/** Макет раскадровки на основе настоящей картинки героя. Это не мультфильм: движения и голоса пока нет. */
export function Storyboard({ image }: { image: Extract<Msg, { type: 'storyboard' }>['image'] }) {
  const calm = useReducedMotion()
  const frames = [
    { t: 'Мир героя', pos: '50% 75%', from: 1.0, to: 1.12 },
    { t: 'Герой оживает', pos: '50% 30%', from: 1.7, to: 1.95 },
    { t: 'Голос и история', pos: '30% 40%', from: 1.35, to: 1.55 },
  ]
  return (
    <AiRow showMark={false}>
      <div className="max-w-[30rem] rounded-3xl bg-slate-50 p-4 sm:p-5">
        <p className="text-[15px] font-bold">Так может начаться твой мультфильм</p>
        <ol className="mt-3 grid grid-cols-3 gap-2">
          {frames.map((f, i) => (
            <li key={f.t}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200">
                <motion.img
                  src={image.src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: f.pos }}
                  initial={{ scale: f.from }}
                  animate={calm ? { scale: f.from } : { scale: [f.from, f.to, f.from] }}
                  transition={{ repeat: Infinity, duration: 7 + i, ease: 'easeInOut' }}
                  draggable={false}
                />
                <span className="absolute left-1.5 top-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-700">{i + 1}</span>
              </div>
              <p className="mt-1.5 text-[12px] font-medium leading-tight text-slate-700">{f.t}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex gap-2 text-[12.5px] leading-snug text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
          Это макет раскадровки из твоей картинки, а не готовый мультфильм: героя пока никто не анимировал и не озвучивал. В программе ты сделаешь это сам.
        </p>
      </div>
    </AiRow>
  )
}

/** Чему ребёнок научился на уроке: только то, что он реально сделал в этой сессии. */
export function LearnedCard({ s }: { s: Extract<Msg, { type: 'learned' }>['summary'] }) {
  const rows = [
    { t: 'Описывать идею', d: s.details.length ? `Ты задал: ${s.details.join(', ')}.` : 'Ты описал героя своими словами.' },
    { t: 'Уточнять запрос', d: s.questions > 0 ? `Ответил на ${s.questions} ${s.questions === 1 ? 'уточняющий вопрос' : s.questions < 5 ? 'уточняющих вопроса' : 'уточняющих вопросов'}, и героя стало легче представить.` : 'Описал героя так подробно, что уточнения не понадобились.' },
    { t: 'Улучшать результат', d: s.edits > 0 ? `Внёс ${s.edits} ${s.edits === 1 ? 'правку' : s.edits < 5 ? 'правки' : 'правок'} и увидел, как меняется запрос.` : 'Можно попробовать: вернись к герою и измени одну деталь.' },
  ]
  return (
    <AiRow showMark={false}>
      <div className="max-w-[30rem] rounded-3xl bg-slate-50 p-4 sm:p-5">
        <p className="text-[15px] font-bold">Как ты управлял ИИ</p>
        {s.firstIdea && (
          <div className="mt-2.5 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Идея</p>
            <p className="mt-0.5 text-[14px] leading-snug text-slate-700">«{s.firstIdea}»</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Запрос из {s.promptWords} слов</p>
            {s.stickers && s.stickers.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {s.stickers.map((st) => (
                  <li key={st.t}><StickerPill s={st} /></li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12.5px] leading-snug text-slate-500">Чем точнее описание, тем ближе результат к идее.</p>
          </div>
        )}
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.t} className="flex items-start gap-2.5">
              <span className="mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Check className="h-3 w-3" strokeWidth={3} /></span>
              <p className="min-w-0 text-[14.5px] leading-snug"><span className="font-semibold">{r.t}.</span> <span className="text-slate-600">{r.d}</span></p>
            </li>
          ))}
        </ul>
      </div>
    </AiRow>
  )
}

export function UpsellCard({ mode, onClick }: { mode: 'active' | 'done' | 'idle'; onClick: () => void }) {
  return (
    <AiRow showMark={false}>
      <div className={`max-w-[30rem] rounded-3xl bg-violet-50/60 p-5 transition-opacity sm:p-6 ${mode === 'idle' ? 'opacity-60' : ''}`}>
        <h3 className="text-[28px] font-extrabold leading-[1.08] tracking-tight sm:text-4xl">
          Твой герой.<br />
          <span className="text-violet-600">Твоя вселенная.</span>
        </h3>
        <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
          А что, если твой герой сможет двигаться, разговаривать и стать главным персонажем собственного мультфильма?
        </p>
        <p className="mt-5 text-[13px] font-semibold text-slate-500">В следующем проекте ты сможешь:</p>
        <ul className="mt-2.5 space-y-2.5">
          {PERKS.map(({ icon: Icon, t, d, c }, i) => (
            <li key={t} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${c}`}><Icon className="h-4 w-4" /></span>
              <p className="min-w-0 text-[15px] leading-snug">
                <span className="font-semibold">{i + 1}. {t}</span>
                <span className="block text-[13.5px] text-slate-500">{d}</span>
              </p>
            </li>
          ))}
        </ul>
        <button onClick={onClick} disabled={mode !== 'active'} className="btn-primary mt-5 w-full text-center leading-tight sm:w-auto">
          {mode === 'done' ? <><Check className="h-4 w-4" /> Отлично</> : <>Хочу создать мультфильм <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    </AiRow>
  )
}

export function ParentCta({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return (
    <AiRow showMark={false}>
      <button onClick={onOpen} disabled={!active} className="btn-primary">
        Показать родителям <ArrowRight className="h-4 w-4" />
      </button>
    </AiRow>
  )
}
