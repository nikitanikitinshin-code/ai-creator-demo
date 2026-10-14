import { D, L, both, horn, hornDefs, lin, metalDefs, mix, rad, scene, type ArtParams } from './common'

export function robot(p: ArtParams): string {
  const { main, accent, eye } = p
  const defs = `
    ${hornDefs(p)}
    ${metalDefs('gMetal', accent)}
    ${metalDefs('gPlate', main)}
    ${lin('gBody', [[0, L(main, 0.3)], [0.5, main], [1, D(main, 0.65)]], 0.2, 0, 0.8, 1)}
    ${rad('gHead', [[0, L(main, 0.55)], [0.5, main], [1, D(main, 0.6)]], 0.35, 0.25, 0.9)}
    ${lin('gGlass', [[0, '#1b1b2c'], [1, '#05050a']])}
    ${rad('gEye', [[0, '#ffffff'], [0.35, L(eye, 0.4)], [0.75, eye], [1, D(eye, 0.4)]])}
    ${rad('gCore', [[0, '#ffffff'], [0.3, L(eye, 0.3)], [0.7, eye], [1, D(eye, 0.6)]])}`

  const blades = p.wings
    ? both([[70, 320, 26], [105, 440, 22], [150, 548, 18], [210, 640, 14]].map(([tx, ty, w]) => `<path d="M352 610 L${tx} ${ty} L${tx + w + 20} ${ty + 22} L360 662 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/><path d="M352 610 L${tx} ${ty}" stroke="${L(eye, 0.4)}" stroke-width="3" opacity=".6"/>`).join(''))
    : ''

  const torso = `
    <path d="M108 800 L172 646 C198 602 262 586 322 590 L478 590 C538 586 602 602 628 646 L692 800 Z" fill="url(#gBody)"/>
    <path d="M250 600 L226 800 M550 600 L574 800 M150 712 H650" stroke="${D(main, 0.6)}" stroke-width="3" fill="none" opacity=".7"/>
    ${both(`<path d="M128 700 C116 624 170 584 244 590 C290 596 304 654 296 728 L140 750 Z" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="3"/><path d="M146 700 H288" stroke="${D(accent, 0.5)}" stroke-width="4"/><circle cx="188" cy="640" r="9" fill="${D(accent, 0.45)}"/><circle cx="244" cy="628" r="7" fill="${D(accent, 0.45)}"/>`)}
    <circle cx="400" cy="706" r="68" fill="#0d0d16" stroke="${L(main, 0.3)}" stroke-width="7"/>
    <circle cx="400" cy="706" r="50" fill="none" stroke="${eye}" stroke-width="3" opacity=".55"/>
    <circle cx="400" cy="706" r="46" fill="${eye}" opacity=".35" filter="url(#b16)"/>
    <circle cx="400" cy="706" r="30" fill="url(#gCore)" filter="url(#glow)"/>
    <path d="M400 640 V664 M400 748 V772 M334 706 H358 M442 706 H466" stroke="${L(main, 0.4)}" stroke-width="5"/>`

  const neck = `
    <rect x="352" y="520" width="96" height="90" rx="14" fill="${D(main, 0.55)}"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="352" y="${530 + i * 20}" width="96" height="8" rx="4" fill="${D(main, 0.2)}"/>`).join('')}
    ${both(`<rect x="334" y="500" width="14" height="96" rx="7" fill="url(#gMetal)"/>`)}`

  const hornsEl = p.horns > 0 ? both(horn(p, [338, 214], p.horns)) : ''
  const antenna = p.horns > 0 ? '' : `<path d="M400 168 V96" stroke="${D(main, 0.4)}" stroke-width="9" stroke-linecap="round"/><circle cx="400" cy="88" r="14" fill="${eye}" filter="url(#glow)"/>`

  const head = `
    ${both(`<rect x="248" y="318" width="34" height="84" rx="12" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/><circle cx="265" cy="360" r="8" fill="${eye}" opacity=".85"/>`)}
    <path d="M288 252 C288 190 334 160 400 160 C466 160 512 190 512 252 L522 404 C522 472 488 520 438 530 L362 530 C312 520 278 472 278 404 Z" fill="url(#gHead)"/>
    <path d="M288 252 C288 190 334 160 400 160" stroke="${L(eye, 0.55)}" stroke-width="3.5" fill="none" opacity=".6" filter="url(#b3)"/>
    <path d="M318 180 C362 152 438 152 482 180 L470 220 C430 198 370 198 330 220 Z" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="3"/>
    <path d="M400 160 V208" stroke="${D(accent, 0.5)}" stroke-width="3"/>
    <path d="M306 290 H494 Q508 290 508 306 V382 Q508 406 484 406 H316 Q292 406 292 382 V306 Q292 290 306 290 Z" fill="url(#gGlass)" stroke="${L(main, 0.35)}" stroke-width="5"/>
    <path d="M312 296 L420 296 L340 400 L300 400 Z" fill="#fff" opacity=".06"/>
    ${both(`<ellipse cx="348" cy="344" rx="44" ry="26" fill="${eye}" opacity=".7" filter="url(#b16)"/><path d="M316 346 Q350 318 388 338 Q354 366 316 346 Z" fill="url(#gEye)" filter="url(#glow)"/>`)}
    <rect x="344" y="448" width="112" height="56" rx="14" fill="#0a0a12" stroke="${D(main, 0.4)}" stroke-width="3"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="354" y="${456 + i * 12}" width="92" height="5" rx="2.5" fill="${eye}" opacity="${0.75 - i * 0.12}"/>`).join('')}
    ${both(`<circle cx="318" cy="470" r="8" fill="${D(main, 0.5)}"/><circle cx="318" cy="470" r="3" fill="${L(main, 0.4)}"/>`)}
    ${antenna}`

  return scene(p, defs, blades + torso + neck + hornsEl + head)
}
