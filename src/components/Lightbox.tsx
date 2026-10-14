import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

/** Просмотр изображения на весь экран: закрывается по клику, крестику и Esc. */
export function Lightbox({ open, src, alt, onClose, hint }: { open: boolean; src: string; alt: string; onClose: () => void; hint?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Изображение героя"
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/90 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <button onClick={onClose} aria-label="Закрыть" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <motion.img
            src={src}
            alt={alt}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="max-h-full max-w-full rounded-2xl object-contain"
            style={{ aspectRatio: '1 / 1', width: 'min(100%, 92dvh)' }}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          {hint && <p className="absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] px-6 text-center text-sm text-white/80">{hint}</p>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
