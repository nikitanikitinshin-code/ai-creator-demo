import { D, L, both, horn, hornDefs, lin, metalDefs, mix, rad, scene, type ArtParams } from './common'

export function warrior(p: ArtParams): string {
  const { main, accent, eye } = p
  const cape = D(accent, 0.45)
  const defs = `
    ${hornDefs(p)}
    ${metalDefs('gPlate', main)}
    ${metalDefs('gMetal', accent)}
    ${lin('gCape', [[0, L(cape, 0.15)], [1, D(cape, 0.7)]], 0, 0, 0.3, 1)}
    ${rad('gHelm', [[0, L(main, 0.6)], [0.5, main], [1, D(main, 0.65)]], 0.38, 0.28, 0.9)}
    ${rad('gEye', [[0, '#fff'], [0.4, L(eye, 0.3)], [1, eye]])}
    ${lin('gPlume', [[0, L(accent, 0.3)], [1, D(accent, 0.55)]], 0, 0, 1, 1)}`

  const capeEl = `<path d="M96 800 C112 640 226 556 330 552 L470 552 C574 556 688 640 704 800 Z" fill="url(#gCape)"/>
    <path d="M190 620 C176 690 170 750 172 800 M610 620 C624 690 630 750 628 800 M300 580 C280 660 270 740 272 800 M500 580 C520 660 530 740 528 800" stroke="${D(cape, 0.6)}" stroke-width="4" fill="none" opacity=".55"/>`

  const plume = p.horns > 0 ? '' : `<path d="M400 178 C460 84 580 96 626 196 C560 150 480 164 436 222 Z" fill="url(#gPlume)" stroke="${D(accent, 0.6)}" stroke-width="2"/>
    <path d="M410 176 C470 110 548 112 594 170" stroke="${L(accent, 0.55)}" stroke-width="3" fill="none" opacity=".6"/>`
  const hornsEl = p.horns > 0 ? both(horn(p, [346, 262], p.horns)) : ''

  const body = `
    ${both(`<path d="M138 800 C86 680 142 584 266 574 C326 618 332 704 318 800 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/><path d="M158 726 C190 664 240 628 304 618" stroke="${L(main, 0.65)}" stroke-width="4" fill="none" opacity=".6"/><path d="M146 770 C196 716 256 690 318 686" stroke="url(#gMetal)" stroke-width="12" fill="none"/>`)}
    <path d="M322 596 C362 580 438 580 478 596 L504 800 L296 800 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/>
    <path d="M296 700 H504" stroke="url(#gMetal)" stroke-width="12"/>
    <circle cx="400" cy="682" r="36" fill="url(#gMetal)" stroke="${D(accent, 0.6)}" stroke-width="4"/>
    <path transform="translate(400 682)" d="M0 -22 L6.5 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6.5 -7Z" fill="${D(accent, 0.6)}"/>
    <path d="M326 566 L474 566 L490 616 Q400 650 310 616 Z" fill="${D(main, 0.35)}" stroke="${D(main, 0.65)}" stroke-width="3"/>`

  const helmet = `
    <path d="M298 546 L288 330 C288 228 340 172 400 172 C460 172 512 228 512 330 L502 546 C470 566 330 566 298 546 Z" fill="url(#gHelm)"/>
    <path d="M298 546 L288 330 C288 228 340 172 400 172" stroke="${L(eye, 0.55)}" stroke-width="3.5" fill="none" opacity=".55" filter="url(#b3)"/>
    <rect x="391" y="174" width="18" height="170" rx="6" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="2"/>
    <path d="M296 334 Q400 296 504 334 L504 350 Q400 318 296 350 Z" fill="${D(main, 0.4)}"/>
    <path d="M314 352 H486 Q492 352 492 360 V376 Q492 384 486 384 H314 Q308 384 308 376 V360 Q308 352 314 352 Z" fill="#05050a" stroke="${D(main, 0.7)}" stroke-width="3"/>
    <path d="M388 384 H412 V476 Q400 486 388 476 Z" fill="#05050a"/>
    ${both(`<ellipse cx="352" cy="368" rx="34" ry="16" fill="${eye}" opacity=".75" filter="url(#b16)"/><ellipse cx="350" cy="368" rx="24" ry="7" fill="url(#gEye)" filter="url(#glow)"/>`)}
    ${both(`<path d="M312 430 L352 436 M310 446 L350 452 M312 462 L346 466" stroke="${D(main, 0.65)}" stroke-width="3" opacity=".7"/>`)}
    ${both(`<path d="M290 470 L324 520 L300 548 Z" fill="${D(main, 0.25)}" opacity=".6"/>`)}`

  return scene(p, defs, capeEl + plume + hornsEl + body + helmet)
}
