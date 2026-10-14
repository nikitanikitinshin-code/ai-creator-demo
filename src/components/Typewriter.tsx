import { useEffect, useState } from 'react'
import { typeDuration } from '../lib/typing'

/** Плавная «печать» ответа наставника. Сохранённые сообщения показываются сразу целиком. */
export function Typewriter({ text, animate }: { text: string; animate?: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length)

  useEffect(() => {
    if (!animate) return
    const tick = 16
    const perTick = Math.max(1, Math.ceil(text.length / (typeDuration(text.length) / tick)))
    const t = setInterval(() => {
      setN((v) => {
        if (v + perTick >= text.length) {
          clearInterval(t)
          return text.length
        }
        return v + perTick
      })
    }, tick)
    return () => clearInterval(t)
  }, [animate, text])

  return (
    <>
      {text.slice(0, n)}
      {/* невидимый остаток держит высоту сообщения, чтобы текст не «прыгал» */}
      <span className="invisible">{text.slice(n)}</span>
    </>
  )
}
