import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { Spec } from '../types'
import { SLOT_ORDER, buildPrompt, contributionStickers } from '../lib/dialog'
import { CAT_CLASS } from './Stickers'

/**
 * Полоса «из чего собирается герой»: слова ребёнка превращаются в цветные стикеры по мере диалога.
 * Это и индикатор прогресса, и наглядное объяснение, что ИИ получает именно эти детали.
 */
export function SlotBar({ spec }: { spec: Spec }) {
  const [open, setOpen] = useState(false)
  const stickers = contributionStickers(spec)
  const filled = SLOT_ORDER.filter((s) => stickers.some((x) => x.c === s.c)).length

  return (
    <div className="shrink-0 border-b border-slate-100 bg-white">
      <div className="mx-auto flex max-w-[42rem] items-center gap-2 px-4 py-2 sm:px-6">
        <ul className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Из чего собирается герой">
          {SLOT_ORDER.map((slot) => {
            const items = stickers.filter((x) => x.c === slot.c)
            const first = items[0]
            return (
              <li key={slot.c} className="shrink-0">
                <AnimatePresence mode="wait" initial={false}>
                  {first ? (
                    <motion.span
                      key={first.t}
                      initial={{ opacity: 0, scale: 0.7, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                      className={`inline-flex max-w-[11rem] items-center gap-1 truncate rounded-lg px-2 py-1 text-[12.5px] font-medium leading-tight ring-1 ${CAT_CLASS[slot.c]}`}
                    >
                      <span className="truncate">{first.t}</span>
                      {items.length > 1 && <span className="shrink-0 opacity-70">+{items.length - 1}</span>}
                    </motion.span>
                  ) : (
                    <motion.span key="empty" className="inline-flex items-center rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[12.5px] leading-tight text-slate-500">
                      {slot.empty}
                    </motion.span>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Показать запрос для ИИ"
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          {filled}/{SLOT_ORDER.length}
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mx-auto max-w-[42rem] px-4 pb-3 sm:px-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Так сейчас выглядит твой запрос для ИИ</p>
              <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-[13.5px] leading-relaxed text-slate-600">{buildPrompt(spec)}</p>
              <p className="mt-1.5 text-[12.5px] text-slate-500">Чем больше деталей, тем точнее ИИ представит героя.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
