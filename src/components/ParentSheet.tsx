import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Copy, Download, Minus, X } from 'lucide-react'
import type { HeroImage, LessonSummary } from '../types'
import { OFFER, OFFER_PENDING, formatPrice } from '../config/offer'
import { track } from '../lib/analytics'
import { StickerPill } from './Stickers'

interface Props {
  open: boolean
  onClose: () => void
  hero?: { image: HeroImage; name?: string }
  summary?: LessonSummary
  onSave: () => void
}

const GOALS = [
  'Навык формулирования запросов к ИИ.',
  'Практический опыт работы с AI-инструментами.',
  'Развитие творческого мышления.',
  'Собственный готовый мультфильм.',
  'Понимание того, как использовать ИИ для создания проектов.',
]

const STEPS = ['Создать свой мир', 'Оживить героя', 'Дать ему голос', 'Снять мультфильм']

const COMPARE = [
  ['Цель', 'Получить одну картинку', 'Довести проект до готового мультфильма'],
  ['Что делает ребёнок', 'Нажимает «сгенерировать»', 'Описывает, уточняет, улучшает и придумывает историю'],
  ['Что остаётся', 'Случайный результат', 'Понимание, как управлять ИИ'],
]

function programText(heroName: string | undefined) {
  return [
    `AI Creator: ${OFFER.name}`,
    OFFER.tagline,
    `Продолжительность: ${OFFER.duration}. Формат: ${OFFER.format}`,
    `Результат: ${OFFER.result}`,
    `Стоимость: ${formatPrice(OFFER.price)}`,
    heroName ? `Герой ребёнка: ${heroName}` : '',
    OFFER_PENDING,
  ].filter(Boolean).join('\n')
}

/** Экран для родителя поверх интерфейса: что сделал ребёнок, что дальше, условия. Оплаты и сбора данных нет. */
export function ParentSheet({ open, onClose, hero, summary, onSave }: Props) {
  const [thanks, setThanks] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setThanks(false)
      setCopied(false)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const enroll = () => {
    track('enroll_click', { hasUrl: !!OFFER.enrollUrl })
    if (OFFER.enrollUrl) window.open(OFFER.enrollUrl, '_blank', 'noopener')
    else setThanks(true)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(programText(hero?.name))
      setCopied(true)
      track('program_copied')
    } catch {
      setCopied(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-900/35 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Информация для родителей"
            className="relative flex max-h-[94dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-xl sm:rounded-3xl"
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>

            {thanks ? (
              <div className="overflow-y-auto px-6 pb-7 pt-12 text-center sm:px-10">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-2xl text-violet-600">✦</span>
                <h2 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight">Спасибо за интерес к AI Creator!</h2>
                <p className="mx-auto mt-3 max-w-xs text-[16px] leading-relaxed text-slate-600">Скоро здесь можно будет записаться на обучение.</p>
                <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-snug text-slate-500">Запись пока не открыта, поэтому в демо-версии мы не собираем контакты и ничего не оформляем. Чтобы не потерять предложение, сохраните его себе:</p>
                <div className="mt-5 flex flex-col gap-2">
                  <button onClick={copy} className="btn-ghost w-full">
                    {copied ? <><Check className="h-4 w-4 text-emerald-600" /> Скопировано</> : <><Copy className="h-4 w-4" /> Скопировать описание программы</>}
                  </button>
                  <button onClick={onSave} className="btn-ghost w-full"><Download className="h-4 w-4" /> Сохранить героя ребёнка</button>
                </div>
                <button onClick={onClose} className="btn-primary mt-5 w-full">Закрыть</button>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-sky-700">ДЛЯ РОДИТЕЛЕЙ</span>
                  <h2 className="mt-4 pr-6 text-[26px] font-extrabold leading-[1.1] tracking-tight sm:text-[32px]">
                    Ваш ребёнок уже создал своего первого AI-персонажа
                  </h2>
                  <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                    Теперь он может научиться превращать собственные идеи в полноценные цифровые проекты.
                  </p>

                  {hero && (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
                      <img src={hero.image.src} alt={hero.image.alt} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Первый проект ребёнка</p>
                        <p className="truncate font-semibold">{hero.name ?? 'Мой первый AI-герой'}</p>
                        <p className="text-[12px] leading-tight text-slate-500">{hero.image.mode === 'demo' ? 'Демо-иллюстрация' : hero.image.mock ? 'Тестовая имитация' : 'Создано ИИ'}</p>
                      </div>
                    </div>
                  )}
                  {summary?.stickers && summary.stickers.length > 0 && (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Что задал ребёнок">
                      {summary.stickers.map((st) => (
                        <li key={st.t}><StickerPill s={st} /></li>
                      ))}
                    </ul>
                  )}

                  {summary && (
                    <section className="mt-3">
                      <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Что ребёнок сделал за урок</h3>
                      <ul className="mt-2 space-y-1.5 text-[14.5px] leading-snug text-slate-700">
                        <li className="flex gap-2.5"><Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />Описал героя: {summary.details.length ? summary.details.join(', ') : 'своими словами'}.</li>
                        {summary.firstIdea && <li className="flex gap-2.5"><Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />Начал с фразы «{summary.firstIdea}»; из неё собрался запрос из {summary.promptWords} слов.</li>}
                        <li className="flex gap-2.5"><Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />{summary.edits > 0 ? `Уточнил героя после первой версии: правок — ${summary.edits}.` : 'Ответил на уточняющие вопросы наставника.'}</li>
                      </ul>
                    </section>
                  )}

                  <h3 className="mt-7 text-xl font-extrabold tracking-tight">Следующий шаг — собственный мультфильм</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                    В AI Creator ребёнок проходит обучение через создание собственного проекта.
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                    Шаг за шагом он учится работать с искусственным интеллектом: придумывает историю, создаёт мир персонажа, оживляет изображения, добавляет голос и собирает собственный мультфильм.
                  </p>
                  <ol className="mt-3 flex flex-wrap gap-1.5">
                    {STEPS.map((t, i) => (
                      <li key={t} className="rounded-lg bg-violet-50 px-2.5 py-1 text-[13px] text-violet-800">{i + 1}. {t}</li>
                    ))}
                  </ol>

                  <h3 className="mt-7 text-[13px] font-bold uppercase tracking-wider text-slate-500">Чем это отличается от генерации картинок</h3>
                  <div className="mt-2.5 overflow-hidden rounded-2xl border border-slate-100 text-[13.5px] leading-snug">
                    <div className="grid grid-cols-[4.5rem_1fr_1fr] bg-slate-50 px-3 py-2 text-[11.5px] font-semibold text-slate-500">
                      <span />
                      <span>Просто генератор</span>
                      <span className="text-violet-700">AI Creator</span>
                    </div>
                    {COMPARE.map(([k, a, b]) => (
                      <div key={k} className="grid grid-cols-[4.5rem_1fr_1fr] gap-x-2 border-t border-slate-100 px-3 py-2.5">
                        <span className="text-[12px] text-slate-500">{k}</span>
                        <span className="text-slate-500">{a}</span>
                        <span className="font-medium text-slate-800">{b}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className="mt-7 text-[13px] font-bold uppercase tracking-wider text-slate-500">Что получит ребёнок</h3>
                  <ul className="mt-2.5 space-y-2">
                    {GOALS.map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-[15px] leading-snug">
                        <span className="mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Check className="h-3 w-3" strokeWidth={3} /></span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 text-[12.5px] leading-snug text-slate-500">Это образовательные цели программы, а не гарантия результата.</p>

                  <section className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
                    <h3 className="text-lg font-extrabold tracking-tight">{OFFER.name}</h3>
                    <p className="mt-0.5 text-[14.5px] text-slate-500">{OFFER.tagline}</p>
                    <dl className="mt-3.5 space-y-2.5">
                      {[['Продолжительность', OFFER.duration], ['Формат', OFFER.format], ['Результат', OFFER.result]].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-[12px] font-medium text-slate-500">{k}</dt>
                          <dd className="text-[14.5px] leading-snug text-slate-800">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-4 flex items-baseline justify-between border-t border-slate-200/70 pt-3">
                      <span className="text-[14.5px] text-slate-500">Стоимость</span>
                      <span className="text-[28px] font-extrabold tracking-tight">{formatPrice(OFFER.price)}</span>
                    </div>
                    <p className="mt-3 flex gap-2 text-[12.5px] leading-snug text-slate-500">
                      <Minus className="mt-[3px] h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={3} />
                      {OFFER_PENDING}
                    </p>
                  </section>
                </div>

                <div className="pb-safe shrink-0 border-t border-slate-100 px-5 pt-3 sm:px-8 sm:pb-6">
                  <button onClick={enroll} className="btn-primary w-full">
                    {OFFER.cta} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
