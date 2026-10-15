import type { Sticker, StickerCat } from '../types'

/** Цвета стикеров по категориям: одна категория — один цвет во всём приложении (полоса, запрос, итоги, карточка). */
export const CAT_CLASS: Record<StickerCat, string> = {
  who: 'bg-violet-50 text-violet-800 ring-violet-100',
  color: 'bg-sky-50 text-sky-800 ring-sky-100',
  material: 'bg-orange-50 text-orange-800 ring-orange-100',
  head: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  extra: 'bg-pink-50 text-pink-800 ring-pink-100',
  style: 'bg-amber-50 text-amber-800 ring-amber-100',
}
/** Те же цвета для рисования карточки героя на canvas. */
export const CAT_HEX: Record<StickerCat, { bg: string; fg: string }> = {
  who: { bg: '#ede9fe', fg: '#5b21b6' },
  color: { bg: '#e0f2fe', fg: '#075985' },
  material: { bg: '#ffedd5', fg: '#9a3412' },
  head: { bg: '#d1fae5', fg: '#065f46' },
  extra: { bg: '#fce7f3', fg: '#9d174d' },
  style: { bg: '#fef3c7', fg: '#92400e' },
}
export const CAT_LABEL: Record<StickerCat, string> = {
  who: 'Кто',
  color: 'Цвет',
  material: 'Материал',
  head: 'Голова',
  extra: 'Детали',
  style: 'Стиль',
}

export function StickerPill({ s, className = '' }: { s: Sticker; className?: string }) {
  return <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[12.5px] font-medium leading-tight ring-1 ${CAT_CLASS[s.c]} ${className}`}>{s.t}</span>
}
