import { D, L, both, horn, hornDefs, lin, metalDefs, mix, rad, scene, type ArtParams } from './common'

export function dragon(p: ArtParams): string {
  const { main, accent, eye } = p
  const hc = p.armor ? accent : mix(main, '#e9dfc4', 0.62)
  void hc
  const defs = `
    ${hornDefs(p)}
    ${metalDefs('gMetal', accent)}
    ${lin('gBody', [[0, L(main, 0.38)], [0.5, main], [1, D(main, 0.6)]], 0.2, 0, 0.8, 1)}
    ${rad('gHead', [[0, L(main, 0.5)], [0.5, main], [1, D(main, 0.62)]], 0.4, 0.3, 0.85)}
    ${rad('gMuzzle', [[0, L(main, 0.55)], [0.7, L(main, 0.1)], [1, D(main, 0.3)]], 0.5, 0.3, 0.8)}
    ${lin('gWing', [[0, mix(main, accent, 0.3)], [1, D(mix(main, accent, 0.2), 0.7)]], 0, 0, 0.2, 1)}
    ${lin('gBelly', [[0, L(mix(main, accent, 0.4), 0.3)], [1, D(mix(main, accent, 0.4), 0.3)]])}
    ${rad('gEye', [[0, '#ffffff'], [0.3, L(eye, 0.35)], [0.7, eye], [1, D(eye, 0.55)]], 0.5, 0.5, 0.55)}
    ${rad('gGem', [[0, '#fff'], [0.4, eye], [1, D(eye, 0.6)]])}
    <pattern id="scales" width="26" height="20" patternUnits="userSpaceOnUse"><path d="M0 12 Q13 -2 26 12" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2"/><path d="M-13 22 Q0 8 13 22 M13 22 Q26 8 39 22" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></pattern>`

  const wingL = `
    <path d="M345 580 C255 470 150 350 36 205 C98 232 140 230 172 210 C168 262 206 284 240 278 C236 332 272 348 304 340 C302 405 322 480 350 552 Z" fill="url(#gWing)" stroke="${D(main, 0.55)}" stroke-width="3"/>
    <path d="M345 580 C262 478 150 352 36 205" stroke="${D(main, 0.3)}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M345 570 C275 480 210 400 172 212 M345 570 C300 490 268 420 240 280 M345 570 C332 505 320 430 304 342" stroke="${D(main, 0.2)}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M60 232 C110 280 200 400 330 520" stroke="${L(accent, 0.5)}" stroke-width="3" fill="none" opacity=".35"/>
    <path d="M36 205 L18 170 L58 196 Z" fill="${L(main, 0.5)}"/>`
  const wings = p.wings ? both(wingL) : ''

  const body = `
    <path d="M214 800 C210 700 252 622 308 562 C336 534 366 520 400 520 C434 520 464 534 492 562 C548 622 590 700 586 800 Z" fill="url(#gBody)"/>
    <path d="M214 800 C210 700 252 622 308 562 C336 534 366 520 400 520 C434 520 464 534 492 562 C548 622 590 700 586 800 Z" fill="url(#scales)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => { const y = 548 + i * 36; const w = 62 - i * 3; return `<path d="M${400 - w} ${y} Q400 ${y + 16} ${400 + w} ${y} L${400 + w - 7} ${y + 30} Q400 ${y + 44} ${400 - w + 7} ${y + 30} Z" fill="url(#gBelly)" stroke="${D(main, 0.55)}" stroke-width="2" opacity=".95"/>` }).join('')}
    <path d="M214 800 C210 700 252 622 308 562" stroke="${L(eye, 0.4)}" stroke-width="3" fill="none" opacity=".55" filter="url(#b3)"/>
    <ellipse cx="400" cy="540" rx="120" ry="36" fill="#000" opacity=".5" filter="url(#b16)"/>`

  const armorL = `
    <path d="M172 800 C132 690 186 606 284 598 C332 642 334 722 318 800 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>
    <path d="M190 744 C216 694 256 664 302 654 M186 782 C222 738 268 710 320 704" stroke="${L(accent, 0.6)}" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>
    <path d="M214 628 L184 556 L256 614 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="2"/>
    <circle cx="238" cy="690" r="7" fill="${D(accent, 0.4)}"/><circle cx="214" cy="738" r="6" fill="${D(accent, 0.4)}"/>
    <path d="M318 566 C360 604 440 604 482 566 L494 614 C440 658 360 658 306 614 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>`
  const armorC = `
    <path d="M326 694 C360 654 440 654 474 694 L488 800 L312 800 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>
    <path d="M400 668 V800" stroke="${D(accent, 0.45)}" stroke-width="3"/>
    <circle cx="400" cy="728" r="30" fill="${D(accent, 0.5)}"/><circle cx="400" cy="728" r="24" fill="url(#gGem)" filter="url(#glow)"/>`
  const armor = p.armor ? both(armorL) + armorC : ''

  const hornsBack = p.horns > 0 ? both(horn(p, [340, 262], p.horns)) : ''
  const sideHorns = both(`<path d="M300 336 C268 326 236 304 218 262 C250 282 286 292 314 298 Z" fill="url(#gHorn)" opacity="${p.horns > 0 ? 1 : 0.85}"/>`)
  const fins = both(`<path d="M290 362 L212 342 L236 384 L204 428 L296 412 Z" fill="${D(main, 0.15)}" stroke="${D(main, 0.55)}" stroke-width="2"/><path d="M290 366 L226 354 M290 384 L222 392" stroke="${L(accent, 0.3)}" stroke-width="3" opacity=".5"/>`)
  const cheeks = both(`<path d="M270 346 L222 374 L262 394 Z" fill="${D(main, 0.2)}"/>`)

  const head = `
    <path d="M400 188 C472 188 522 230 532 300 C538 352 522 392 497 422 L472 502 C452 548 348 548 328 502 L303 422 C278 392 262 352 268 300 C278 230 328 188 400 188 Z" fill="url(#gHead)"/>
    <path d="M400 188 C472 188 522 230 532 300 C538 352 522 392 497 422 L472 502 C452 548 348 548 328 502 L303 422 C278 392 262 352 268 300 C278 230 328 188 400 188 Z" fill="url(#scales)" opacity=".8"/>
    <path d="M400 188 C328 188 278 230 268 300 C262 352 278 392 303 422" stroke="${L(eye, 0.5)}" stroke-width="3.5" fill="none" opacity=".55" filter="url(#b3)"/>
    <path d="M388 218 L400 170 L412 218 Z M390 258 L400 218 L410 258 Z M392 296 L400 262 L408 296 Z" fill="${D(main, 0.25)}" stroke="${D(main, 0.55)}" stroke-width="2"/>
    ${both(`<path d="M290 322 C318 280 372 284 394 314 L390 336 C362 310 322 314 294 346 Z" fill="${D(main, 0.5)}"/>`)}
    <path d="M338 394 C344 370 456 370 462 394 L480 484 C470 536 330 536 320 484 Z" fill="url(#gMuzzle)"/>
    <path d="M338 394 C344 370 456 370 462 394 L480 484 C470 536 330 536 320 484 Z" fill="url(#scales)" opacity=".6"/>
    ${both(`<ellipse cx="376" cy="470" rx="10" ry="6.5" fill="#09090d" transform="rotate(-18 376 470)"/><path d="M345 330 m-50 0" />`)}
    <path d="M336 506 C372 540 428 540 464 506" stroke="#0a0a10" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${both(`<path d="M352 512 L358 534 L366 516 Z M378 520 L384 540 L391 522 Z" fill="#f2ecdd"/>`)}
    ${both(`<ellipse cx="344" cy="330" rx="46" ry="26" fill="${eye}" opacity=".8" filter="url(#b16)"/>`)}
    ${both(`<path d="M308 334 Q344 296 384 326 Q348 358 308 334 Z" fill="url(#gEye)" filter="url(#glow)"/><ellipse cx="350" cy="328" rx="4.6" ry="15" fill="#08080c" transform="rotate(8 350 328)"/><circle cx="338" cy="319" r="3.6" fill="#fff" opacity=".95"/>`)}
    ${p.fire ? `<g opacity=".8"><ellipse cx="376" cy="474" rx="22" ry="14" fill="#ffb347" filter="url(#b6)"/><ellipse cx="424" cy="474" rx="22" ry="14" fill="#ffb347" filter="url(#b6)"/></g>` : ''}
    <ellipse cx="400" cy="300" rx="120" ry="110" fill="${eye}" opacity=".12" filter="url(#b34)"/>`

  return scene(p, defs, wings + body + armor + hornsBack + sideHorns + fins + cheeks + head)
}
