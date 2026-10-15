import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { newConv, respond, contributionStickers } from '../lib/dialog'
import { renderHeroSvg, svgToDataUrl } from '../lib/art'
import { StickerPill } from './Stickers'

const PHRASE = 'Чёрный дракон с золотыми доспехами'

/**
 * Наглядный пример механики урока: фраза превращается в стикеры-детали, из них появляется герой.
 * Картинка — готовая демо-иллюстрация, пример подписан как демонстрация.
 */
export function IdeaDemo({ compact = false }: { compact?: boolean }) {
  const calm = useReducedMotion()
  const { stickers, src } = useMemo(() => {
    const spec = respond(newConv(), `${PHRASE}, красными глазами в стиле кино`).conv.spec
    return { stickers: contributionStickers(spec).slice(0, 4), src: svgToDataUrl(renderHeroSvg(spec, 'dragon')) }
  }, [])
  const [step, setStep] = useState(calm ? 3 : 0)

  useEffect(() => {
    if (calm) return
    const timers: number[] = []
    const loop = () => {
      setStep(0)
      ;[900, 2200, 3200].forEach((ms, i) => timers.push(window.setTimeout(() => setStep(i + 1), ms)))
      timers.push(window.setTimeout(loop, 8200))
    }
    loop()
    return () => timers.forEach(clearTimeout)
  }, [calm])

  const typed = step === 0 ? PHRASE.slice(0, 0) : PHRASE
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-slate-50 text-left ${compact ? 'p-3' : 'p-3 sm:p-4'}`} role="img" aria-label="Пример: фраза «чёрный дракон с золотыми доспехами» превращается в детали и затем в героя (демо)">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Как это работает (демо-пример)</p>
        <p className="mt-1 min-h-[20px] text-[14px] font-medium leading-snug text-slate-800">
          {calm ? PHRASE : <TypeText text={PHRASE} run={step >= 0} />}
        </p>
        <div className="mt-1.5 flex min-h-[26px] flex-wrap gap-1">
          {stickers.map((s, i) => (
            <motion.span key={s.t} initial={false} animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 6, scale: step >= 1 ? 1 : 0.85 }} transition={{ delay: calm ? 0 : i * 0.12, type: 'spring', stiffness: 380, damping: 22 }}>
              <StickerPill s={s} className="!px-1.5 !py-0.5 !text-[11.5px]" />
            </motion.span>
          ))}
        </div>
      </div>
      <motion.div
        className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200"
        animate={{ opacity: step >= 2 ? 1 : 0.25, filter: step >= 2 ? 'blur(0px)' : 'blur(6px)' }}
        transition={{ duration: 0.7 }}
      >
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      </motion.div>
      <span className="sr-only">{typed}</span>
    </div>
  )
}

function TypeText({ text, run }: { text: string; run: boolean }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    setN(0)
    const t = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(t), v) : v + 1)), 28)
    return () => clearInterval(t)
  }, [run, text])
  // цикл запускается заново каждые 8,2 с: перезапускаем и печать
  useEffect(() => {
    const t = setInterval(() => setN(0), 8200)
    return () => clearInterval(t)
  }, [])
  return <>{text.slice(0, n)}<span className="invisible">{text.slice(n)}</span></>
}
