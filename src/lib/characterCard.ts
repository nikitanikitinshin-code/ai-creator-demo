import type { HeroImage, Sticker } from '../types'
import { CAT_HEX } from '../components/Stickers'

/**
 * Карточка героя для сохранения: картинка, имя, стикеры «что задал ребёнок» и честная пометка о происхождении картинки.
 * Рисуется на canvas в браузере, никуда не отправляется.
 */
const W = 1080
const H = 1440
const FONT = '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export interface CardInput {
  image: HeroImage
  name?: string
  stickers: Sticker[]
}

export async function renderCharacterCard({ image, name, stickers }: CardInput): Promise<HTMLCanvasElement> {
  try {
    await Promise.all(['500 30px', '700 40px', '800 78px'].map((f) => document.fonts.load(`${f} ${FONT}`, 'АБВабв AI Creator')))
  } catch {
    /* без шрифта используется запасной */
  }
  const img = new Image()
  img.src = image.src
  await img.decode()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')!

  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, W, H)
  // лёгкая клетка, плавно уходящая в белый
  c.strokeStyle = 'rgba(99,102,241,0.07)'
  c.lineWidth = 2
  for (let x = 0; x <= W; x += 54) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke() }
  for (let y = 0; y <= H; y += 54) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke() }
  const fade = c.createLinearGradient(0, 0, 0, H)
  fade.addColorStop(0, 'rgba(255,255,255,0)')
  fade.addColorStop(0.55, 'rgba(255,255,255,0.92)')
  fade.addColorStop(1, 'rgba(255,255,255,1)')
  c.fillStyle = fade
  c.fillRect(0, 0, W, H)

  // шапка
  c.fillStyle = '#7c3aed'
  roundRect(c, 90, 70, 62, 62, 18)
  c.fill()
  c.fillStyle = '#fff'
  c.font = `700 34px ${FONT}`
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('✦', 121, 102)
  c.textAlign = 'left'
  c.fillStyle = '#0f172a'
  c.font = `800 40px ${FONT}`
  c.fillText('AI Creator', 170, 102)

  const badge = image.mode === 'demo' ? 'Демо-иллюстрация' : image.mock ? 'Тест: имитация ИИ' : 'Создано ИИ'
  c.font = `700 26px ${FONT}`
  const bw = c.measureText(badge).width + 44
  c.fillStyle = image.mode === 'demo' ? '#fff7ed' : '#f5f3ff'
  roundRect(c, W - 90 - bw, 74, bw, 56, 28)
  c.fill()
  c.fillStyle = image.mode === 'demo' ? '#c2410c' : '#6d28d9'
  c.fillText(badge, W - 90 - bw + 22, 103)

  // картинка
  c.save()
  c.shadowColor = 'rgba(15,23,42,0.18)'
  c.shadowBlur = 40
  c.shadowOffsetY = 16
  roundRect(c, 90, 190, 900, 900, 40)
  c.fillStyle = '#f1f5f9'
  c.fill()
  c.restore()
  c.save()
  roundRect(c, 90, 190, 900, 900, 40)
  c.clip()
  c.drawImage(img, 90, 190, 900, 900)
  c.restore()

  // имя и автор
  c.textBaseline = 'alphabetic'
  c.fillStyle = '#0f172a'
  c.font = `800 78px ${FONT}`
  const title = name || 'Мой первый AI-герой'
  c.fillText(title.length > 20 ? `${title.slice(0, 19)}…` : title, 90, 1190)
  c.fillStyle = '#64748b'
  c.font = `500 32px ${FONT}`
  c.fillText(name ? 'Мой первый AI-персонаж · Автор: ты' : 'Автор: ты', 90, 1240)

  // стикеры: что задал ребёнок
  c.font = `600 30px ${FONT}`
  let x = 90
  let y = 1272
  const maxX = W - 90
  for (const s of stickers.slice(0, 8)) {
    const w = c.measureText(s.t).width + 40
    if (x + w > maxX) {
      x = 90
      y += 66
      if (y > 1338) break
    }
    c.fillStyle = CAT_HEX[s.c].bg
    roundRect(c, x, y, w, 52, 16)
    c.fill()
    c.fillStyle = CAT_HEX[s.c].fg
    c.fillText(s.t, x + 20, y + 36)
    x += w + 14
  }

  c.fillStyle = '#94a3b8'
  c.font = `500 26px ${FONT}`
  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  c.fillText(`Придумано и описано ребёнком в AI Creator · ${date}`, 90, 1424)
  return canvas
}

export async function characterCardBlob(input: CardInput): Promise<Blob | null> {
  const canvas = await renderCharacterCard(input)
  return new Promise((r) => canvas.toBlob(r, 'image/png'))
}

export async function characterCardDataUrl(input: CardInput): Promise<string> {
  return (await renderCharacterCard(input)).toDataURL('image/png')
}

export async function downloadCharacterCard(input: CardInput) {
  const blob = await characterCardBlob(input)
  if (!blob) throw new Error('card_failed')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${input.name || 'ai-geroi'}-kartochka.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
