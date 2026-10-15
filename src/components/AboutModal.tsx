import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Minus, X } from 'lucide-react'
import { useEffect } from 'react'
import { IdeaDemo } from './IdeaDemo'

const STEPS = [
  'Придумает собственного персонажа.',
  'Научится описывать его внешность.',
  'Получит демо-иллюстрацию и увидит, из чего собран запрос.',
  'Узнает, как уточнять запрос и улучшать результат.',
]
const WORKS = ['Диалог с наставником по заранее написанному сценарию.', 'Готовые иллюстрации: подбираются по типу героя, цвета и часть деталей подстраиваются.', 'Сохранение истории только на этом устройстве.']
const WORKS_AI = ['Диалог с наставником по заранее написанному сценарию.', 'Картинку героя рисует нейросеть по описанию ребёнка; правки учитывают прошлую версию героя.', 'Лимит картинок на один урок и проверка запросов на сервере.']
const NOT_YET_AI = ['Видео, голос и мультфильм.', 'Регистрация, оплата, личный кабинет.', 'Гарантия, что рисунок всегда совпадёт с задумкой: ИИ может ошибаться.']
const NOT_YET = ['Рисунок по произвольному запросу ребёнка.', 'Видео, голос и мультфильм.', 'Регистрация, оплата, личный кабинет.']

/** Информация для родителей на старте: открывается по ссылке, не блокирует начало урока. */
export function AboutModal({ open, onClose, liveMode = 'demo' }: { open: boolean; onClose: () => void; liveMode?: 'demo' | 'ai' | 'mock' | 'off' }) {
  const ai = liveMode === 'ai' || liveMode === 'off'
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-900/30 backdrop-blur-[2px] sm:place-items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-500 shadow-sm ring-1 ring-slate-100 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>

            <div className="overflow-y-auto px-5 pb-4 pt-6 sm:px-7 sm:pt-7">
              <h2 id="about-title" className="pr-8 text-[26px] font-extrabold leading-[1.1] tracking-tight sm:text-3xl">Что такое AI Creator?</h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-slate-600">
                AI Creator — образовательная платформа, где дети учатся использовать искусственный интеллект, создавая собственные проекты.
              </p>

              <div className="mt-4"><IdeaDemo compact /></div>
              <div className="mt-3 space-y-3">
                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[15px] font-bold">Как проходит бесплатный урок?</h3>
                  <p className="mt-1 text-[14px] text-slate-500">За 5–10 минут ребёнок:</p>
                  <ul className="mt-2 space-y-1.5">
                    {STEPS.map((t) => (
                      <li key={t} className="flex gap-2.5 text-[14.5px] leading-snug text-slate-700">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[15px] font-bold">Чему учится ребёнок?</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-600">
                    Формулировать запросы, развивать идеи, управлять результатами искусственного интеллекта и самостоятельно создавать цифровые проекты.
                  </p>
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[15px] font-bold">Что в этой демо-версии</h3>
                  <p className="mt-1 text-[13.5px] leading-snug text-slate-500">Мы показываем идею честно: часть возможностей ещё не подключена.</p>
                  <p className="mt-3 text-[12px] font-bold uppercase tracking-wider text-slate-500">Работает сейчас</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {(ai ? WORKS_AI : WORKS).map((t) => (
                      <li key={t} className="flex gap-2.5 text-[14px] leading-snug text-slate-700">
                        <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />{t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12px] font-bold uppercase tracking-wider text-slate-500">Пока нет</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {(ai ? NOT_YET_AI : NOT_YET).map((t) => (
                      <li key={t} className="flex gap-2.5 text-[14px] leading-snug text-slate-600">
                        <Minus className="mt-[3px] h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={3} />{t}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[15px] font-bold">Данные и приватность</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-600">
                    {ai
                      ? 'Переписка хранится в браузере этого устройства, её можно стереть кнопкой «Новый герой». Для картинки описание героя отправляется на сервер приложения, а оттуда во внешний сервис генерации (fal.ai). Личные данные мы просим не писать и не пропускаем.'
                      : 'В демо-версии ничего не отправляется на сервер: переписка хранится только в браузере этого устройства. Её можно стереть кнопкой «Новый герой». Мы просим ребёнка не писать настоящее имя, адрес и школу.'}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-slate-500">
                    Данные организатора, политика конфиденциальности и условия будут опубликованы до открытия записи.
                  </p>
                </section>

                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-[15px] font-bold">Что будет дальше?</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-600">
                    После бесплатного урока ребёнок сможет продолжить обучение: придумать вселенную своего героя, оживить персонажа, создать ему голос и снять собственный мультфильм.
                  </p>
                </section>
              </div>
            </div>

            <div className="pb-safe shrink-0 border-t border-slate-100 px-5 pt-3 sm:px-7 sm:pb-6">
              <button onClick={onClose} className="btn-primary w-full">
                Понятно, начать урок <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
