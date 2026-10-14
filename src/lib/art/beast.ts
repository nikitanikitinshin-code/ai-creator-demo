import { D, L, both, horn, hornDefs, lin, metalDefs, mix, rad, rng, scene, type ArtParams } from './common'

export function beast(p: ArtParams): string {
  const { main, accent, eye } = p
  const r = rng(p.seed + 7)
  const defs = `
    ${hornDefs(p)}
    ${metalDefs('gMetal', accent)}
    ${lin('gFur', [[0, L(main, 0.35)], [0.5, main], [1, D(main, 0.65)]], 0.2, 0, 0.8, 1)}
    ${rad('gHead', [[0, L(main, 0.5)], [0.5, main], [1, D(main, 0.62)]], 0.4, 0.3, 0.85)}
    ${rad('gMuzzle', [[0, L(main, 0.7)], [0.7, L(main, 0.25)], [1, main]], 0.5, 0.3, 0.8)}
    ${rad('gEye', [[0, '#fff'], [0.3, L(eye, 0.4)], [0.75, eye], [1, D(eye, 0.5)]])}
    ${rad('gRune', [[0, '#fff'], [0.4, accent], [1, accent, 0]])}`

  // шерсть: короткие штрихи
  const fur = (cx: number, cy: number, w: number, h: number, n: number, col: string, op: number) => {
    const d = Array.from({ length: n }, () => {
      const x = cx + (r() - 0.5) * w
      const y = cy + (r() - 0.5) * h
      const l = 14 + r() * 22
      const a = (r() - 0.5) * 0.9
      return `M${x.toFixed(0)} ${y.toFixed(0)} q${(Math.sin(a) * 8).toFixed(0)} ${(-l / 2).toFixed(0)} ${(Math.sin(a) * l * 0.6).toFixed(0)} ${(-l).toFixed(0)}`
    }).join(' ')
    return `<path d="${d}" stroke="${col}" stroke-width="2.4" fill="none" opacity="${op}" stroke-linecap="round"/>`
  }

  // грива-воротник: зубчатый контур
  const ruff = (() => {
    const pts: string[] = []
    const n = 26
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI
      const rr = 300 + (i % 2 ? 46 : 0) + r() * 14
      pts.push(`${(400 + Math.cos(a) * rr * 1.05).toFixed(0)},${(600 + Math.sin(a) * rr * 0.82).toFixed(0)}`)
    }
    return `<polygon points="${pts.join(' ')} 760,800 40,800" fill="${D(main, 0.45)}"/>`
  })()

  const chest = `<path d="M196 800 C206 690 288 604 338 570 L462 570 C512 604 594 690 604 800 Z" fill="url(#gFur)"/>
    ${fur(400, 680, 330, 200, 90, L(main, 0.5), 0.45)}${fur(400, 700, 330, 200, 70, D(main, 0.7), 0.45)}`
  const collar = p.armor
    ? `<path d="M310 582 C360 628 440 628 490 582 L500 632 C440 680 360 680 300 632 Z" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="3"/><circle cx="400" cy="640" r="16" fill="${eye}" filter="url(#glow)"/>`
    : ''

  const ears = both(`<path d="M308 286 L262 96 C322 118 378 176 392 244 Z" fill="${D(main, 0.1)}" stroke="${D(main, 0.6)}" stroke-width="3" stroke-linejoin="round"/><path d="M312 262 L286 150 C326 172 358 206 370 246 Z" fill="${mix(main, '#ff8fa3', 0.35)}" opacity=".85"/>`)
  const hornsEl = p.horns > 0 ? both(horn(p, [352, 236], p.horns * 0.85)) : ''

  const head = `
    ${both(`<path d="M272 336 L210 360 L252 384 L214 428 L286 414 Z" fill="${D(main, 0.2)}"/>`)}
    <path d="M400 214 C472 214 524 254 532 320 C538 366 522 402 502 432 L472 502 C456 538 344 538 328 502 L298 432 C278 402 262 366 268 320 C276 254 328 214 400 214 Z" fill="url(#gHead)"/>
    ${fur(400, 300, 220, 120, 60, L(main, 0.55), 0.4)}${fur(400, 300, 220, 120, 40, D(main, 0.7), 0.35)}
    <path d="M400 214 C328 214 276 254 268 320 C262 366 278 402 298 432" stroke="${L(eye, 0.55)}" stroke-width="3.5" fill="none" opacity=".5" filter="url(#b3)"/>
    <path d="M344 392 C348 368 452 368 456 392 L474 472 C464 524 336 524 326 472 Z" fill="url(#gMuzzle)"/>
    <path d="M370 422 Q400 404 430 422 Q422 450 400 454 Q378 450 370 422 Z" fill="#0b0b10"/><ellipse cx="392" cy="418" rx="8" ry="3" fill="#fff" opacity=".35"/>
    <path d="M400 452 V484 M400 484 C384 504 360 500 348 486 M400 484 C416 504 440 500 452 486" stroke="#0b0b10" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${both(`<path d="M358 492 L364 520 L374 498 Z" fill="#f4efe2"/>`)}
    ${both(`<ellipse cx="344" cy="336" rx="46" ry="24" fill="${eye}" opacity=".75" filter="url(#b16)"/><path d="M302 332 Q340 304 382 328 Q346 358 302 332 Z" fill="url(#gEye)" filter="url(#glow)"/><ellipse cx="348" cy="331" rx="4.5" ry="14" fill="#08080c"/><circle cx="337" cy="322" r="3.4" fill="#fff"/><path d="M296 316 Q340 286 390 308" stroke="${D(main, 0.7)}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`)}
    <path d="M400 246 L414 266 L400 288 L386 266 Z" fill="url(#gRune)" filter="url(#glow)"/>
    <path d="M400 232 V300 M376 266 H424" stroke="${accent}" stroke-width="2.5" opacity=".7"/>
    <ellipse cx="400" cy="320" rx="120" ry="100" fill="${eye}" opacity=".1" filter="url(#b34)"/>`

  return scene(p, defs, ruff + chest + collar + ears + hornsEl + head)
}
