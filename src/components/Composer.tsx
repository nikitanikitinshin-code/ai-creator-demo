import { forwardRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
  large?: boolean
  placeholder: string
}

/** Поле ввода в духе ChatGPT: на старте большое, в диалоге компактное. */
export const Composer = forwardRef<HTMLTextAreaElement, Props>(function Composer({ value, onChange, onSend, disabled, large, placeholder }, ref) {
  useEffect(() => {
    const el = (ref as React.RefObject<HTMLTextAreaElement>)?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, large ? 200 : 132)}px`
  }, [value, large, ref])

  const canSend = !disabled && value.trim().length > 0
  return (
    <div
      className={`flex gap-2 rounded-[22px] border border-slate-200/80 bg-white shadow-soft transition-all duration-200 ease-out focus-within:border-violet-300 focus-within:shadow-[0_0_0_4px_rgb(139_92_246/0.09)] ${
        large ? 'items-end p-2 pl-4' : 'items-end p-1.5 pl-4'
      }`}
    >
      <textarea
        ref={ref}
        rows={large ? 2 : 1}
        value={value}
        maxLength={400}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (canSend) onSend()
          }
        }}
        className={`flex-1 resize-none bg-transparent leading-snug outline-none placeholder:text-slate-400 ${large ? 'py-1.5 text-base' : 'self-center py-2 text-base'}`}
      />
      <button
        aria-label="Отправить"
        onClick={onSend}
        disabled={!canSend}
        className={`grid shrink-0 place-items-center rounded-full bg-violet-600 text-white transition hover:bg-violet-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 ${large ? 'h-9 w-9' : 'h-9 w-9'}`}
      >
        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.6} />
      </button>
    </div>
  )
})
