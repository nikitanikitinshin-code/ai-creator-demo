import type { Arch, Style } from '../../types'

export interface ArtParams {
  arch: Arch
  main: string
  accent: string
  eye: string
  style: Style
  /** 0 — без рогов, 1 — обычные, >1 — огромные */
  horns: number
  wings: boolean
  armor: boolean
  fire: boolean
  seed: number
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}
export const L = (c: string, t: number) => mix(c, '#ffffff', t)
export const D = (c: string, t: number) => mix(c, '#000000', t)

export function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Stop = [number, string, number?]
export const lin = (id: string, stops: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</linearGradient>`
export const rad = (id: string, stops: Stop[], cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== undefined ? ` stop-opacity="${op}"` : ''}/>`)
    .join('')}</radialGradient>`

export const mirror = (g: string) => `<g transform="translate(800 0) scale(-1 1)">${g}</g>`
export const both = (g: string) => g + mirror(g)

/** Металл с «полосами» бликов — для брони и деталей. */
export const metalDefs = (id: string, c: string) =>
  lin(id, [[0, L(c, 0.65)], [0.3, c], [0.55, D(c, 0.35)], [0.78, L(c, 0.15)], [1, D(c, 0.55)]], 0.1, 0, 0.9, 1)

export const hornColor = (p: ArtParams) => (p.armor ? p.accent : mix(p.main, '#e9dfc4', 0.62))

/** Рог, изогнутый вверх и наружу (левая сторона), s — масштаб. */
export function horn(p: ArtParams, base: [number, number], s: number): string {
  if (s <= 0) return ''
  const hc = hornColor(p)
  const [bx, by] = base
  return `<g transform="translate(${bx} ${by}) scale(${s}) translate(${-bx} ${-by})">
    <path d="M${bx + 12} ${by + 8} C${bx - 38} ${by - 25} ${bx - 78} ${by - 90} ${bx - 70} ${by - 165} C${bx - 64} ${by - 205} ${bx - 40} ${by - 235} ${bx - 22} ${by - 245} C${bx - 32} ${by - 195} ${bx - 22} ${by - 145} ${bx + 14} ${by - 85} C${bx + 30} ${by - 58} ${bx + 34} ${by - 22} ${bx + 34} ${by + 2} Z" fill="url(#gHorn)"/>
    <path d="M${bx - 48} ${by - 62} Q${bx - 22} ${by - 76} ${bx + 4} ${by - 52} M${bx - 62} ${by - 108} Q${bx - 38} ${by - 120} ${bx - 14} ${by - 98} M${bx - 66} ${by - 150} Q${bx - 46} ${by - 160} ${bx - 28} ${by - 142}" stroke="${D(hc, 0.55)}" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
    <path d="M${bx - 58} ${by - 70} C${bx - 70} ${by - 110} ${bx - 66} ${by - 160} ${bx - 40} ${by - 215}" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
  </g>`
}

export const hornDefs = (p: ArtParams) => {
  const hc = hornColor(p)
  return lin('gHorn', [[0, L(hc, 0.55)], [0.5, hc], [1, D(hc, 0.55)]], 0, 0, 1, 1)
}

/** Общая сцена: фон, свет, частицы, виньетка, зерно; внутрь вставляется персонаж. */
export function scene(p: ArtParams, defs: string, character: string): string {
  const cin = p.style === 'cinema'
  const r = rng(p.seed)
  const glow = p.eye
  const bgBase = cin ? mix(p.main, '#0a0a14', 0.82) : L(mix(p.accent, p.main, 0.4), 0.78)
  const bokeh = Array.from({ length: cin ? 16 : 10 }, () => {
    const x = r() * 800
    const y = r() * 650
    const rr = 10 + r() * 38
    const col = r() > 0.5 ? glow : p.accent
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${cin ? col : '#fff'}" opacity="${(cin ? 0.05 + r() * 0.12 : 0.25 + r() * 0.3).toFixed(2)}" filter="url(#b3)"/>`
  }).join('')
  const embers = Array.from({ length: cin ? (p.fire ? 46 : 28) : 14 }, () => {
    const x = 120 + r() * 560
    const y = 120 + r() * 620
    const rr = 1.2 + r() * 3.2
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${r() > 0.4 ? glow : L(p.accent, 0.4)}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`
  }).join('')

  const bg = cin
    ? `<rect width="800" height="800" fill="${bgBase}"/>
       <ellipse cx="400" cy="360" rx="380" ry="330" fill="url(#bgGlow)"/>
       <g opacity=".5" filter="url(#b16)"><polygon points="320,0 420,0 560,800 180,800" fill="#fff" opacity=".07"/><polygon points="500,0 560,0 760,800 640,800" fill="#fff" opacity=".05"/></g>
       ${bokeh}
       <rect y="560" width="800" height="240" fill="url(#fog)"/>`
    : `<rect width="800" height="800" fill="url(#bgToon)"/>
       <circle cx="400" cy="340" r="285" fill="#fff" opacity=".4"/>
       <circle cx="400" cy="340" r="230" fill="${L(p.accent, 0.6)}" opacity=".5"/>
       ${bokeh}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="1024" height="1024">
  <defs>
    <filter id="b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="b16" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="b34" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${p.seed % 50}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .22 0"/></filter>
    <filter id="toonSat"><feColorMatrix type="saturate" values="1.3"/></filter>
    ${rad('bgGlow', [[0, mix(glow, bgBase, 0.55), 0.85], [0.55, mix(p.accent, bgBase, 0.8), 0.3], [1, bgBase, 0]], 0.5, 0.45, 0.5)}
    ${lin('fog', [[0, bgBase, 0], [1, D(bgBase, 0.6), 0.95]])}
    ${lin('bgToon', [[0, L(mix(p.accent, '#ffffff', 0.4), 0.5)], [1, L(p.main, 0.7)]], 0, 0, 0, 1)}
    ${rad('vig', [[0.5, '#000', 0], [1, '#000', 0.78]], 0.5, 0.48, 0.75)}
    ${defs}
  </defs>
  ${bg}
  <ellipse cx="400" cy="790" rx="300" ry="30" fill="#000" opacity="${cin ? 0.55 : 0.18}" filter="url(#b16)"/>
  <g ${cin ? '' : 'filter="url(#toonSat)"'}><g transform="translate(44 84) scale(.89)">${character}</g></g>
  ${embers}
  ${cin ? '<rect width="800" height="800" fill="url(#vig)"/><rect width="800" height="800" filter="url(#grain)" opacity=".5"/>' : ''}
</svg>`
}
