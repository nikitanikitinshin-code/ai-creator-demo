import { D, L, both, horn, hornDefs, lin, mix, rad, rng, scene, type ArtParams } from './common'

export function spirit(p: ArtParams): string {
  const { main, accent, eye } = p
  const r = rng(p.seed + 3)
  const defs = `
    ${hornDefs(p)}
    ${rad('gBody', [[0, '#ffffff', 0.95], [0.25, L(main, 0.55), 0.92], [0.7, main, 0.85], [1, D(main, 0.4), 0.55]], 0.5, 0.35, 0.65)}
    ${rad('gAura', [[0, eye, 0.55], [0.6, main, 0.2], [1, main, 0]])}
    ${lin('gRibbon', [[0, accent, 0], [0.5, accent, 0.85], [1, L(main, 0.5), 0]], 0, 0, 1, 1)}
    ${rad('gIris', [[0, '#fff'], [0.3, L(eye, 0.4)], [0.8, eye], [1, D(eye, 0.4)]])}
    ${rad('gOrb', [[0, '#fff'], [0.4, accent], [1, accent, 0]])}`

  const stars = Array.from({ length: 30 }, () => {
    const x = 270 + r() * 260
    const y = 180 + r() * 540
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r() * 2.4).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`
  }).join('')
  const orbs = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + r()
    const x = 400 + Math.cos(a) * (250 + r() * 70)
    const y = 420 + Math.sin(a) * (230 + r() * 60)
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(10 + r() * 14).toFixed(0)}" fill="url(#gOrb)"/>`
  }).join('')
  const crown = p.horns > 0
    ? both(`<g fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" filter="url(#glow)"><path d="M356 172 C326 130 300 112 282 70"/><path d="M322 126 C304 124 292 132 280 146"/></g><circle cx="282" cy="66" r="13" fill="url(#gOrb)"/><circle cx="282" cy="66" r="6" fill="#fff"/>`)
    : both(`<path d="M370 150 L350 96 L388 128 Z" fill="${accent}" opacity=".9" filter="url(#glow)"/>`) +
      `<path d="M400 140 L384 96 L400 56 L416 96 Z" fill="${accent}" filter="url(#glow)"/>`
  const wings = p.wings
    ? both(`<path d="M330 420 C240 360 150 300 70 330 C130 350 170 390 190 430 C140 430 100 450 80 490 C150 480 210 490 260 520 Z" fill="${L(main, 0.5)}" opacity=".45" filter="url(#glow)"/>`)
    : ''

  return scene(
    p,
    defs,
    `<circle cx="400" cy="420" r="330" fill="url(#gAura)" filter="url(#b16)"/>
    ${orbs}
    ${wings}
    ${both(`<path d="M300 560 C230 600 170 590 120 650 C190 640 240 650 290 640" fill="none" stroke="url(#gRibbon)" stroke-width="22" stroke-linecap="round" opacity=".75" filter="url(#b3)"/>`)}
    ${crown}
    <path d="M400 142 C522 142 584 262 574 402 C568 502 604 604 562 702 C522 770 470 728 440 774 C420 800 380 800 360 774 C330 728 278 770 238 702 C196 604 232 502 226 402 C216 262 278 142 400 142 Z" fill="url(#gBody)"/>
    <path d="M400 142 C522 142 584 262 574 402" stroke="#fff" stroke-width="5" fill="none" opacity=".5" filter="url(#b3)"/>
    ${stars}
    ${both(`<path d="M246 470 C196 500 170 540 176 590 C204 556 232 540 262 534 Z" fill="${L(main, 0.45)}" opacity=".8"/>`)}
    ${both(`<ellipse cx="336" cy="372" rx="44" ry="56" fill="${eye}" opacity=".6" filter="url(#b16)"/><ellipse cx="336" cy="372" rx="34" ry="46" fill="#07070f"/><ellipse cx="336" cy="378" rx="22" ry="30" fill="url(#gIris)" filter="url(#glow)"/><ellipse cx="336" cy="378" rx="5" ry="17" fill="#07070f"/><circle cx="324" cy="360" r="8" fill="#fff" opacity=".95"/>`)}
    <path d="M370 452 Q400 474 430 452" stroke="#0b0b18" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>
    ${both(`<circle cx="276" cy="446" r="22" fill="${accent}" opacity=".3" filter="url(#b6)"/>`)}`,
  )
}
