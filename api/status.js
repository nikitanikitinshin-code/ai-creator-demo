// server/handler.ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { join } from "node:path";

// src/lib/art/common.ts
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function mix(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
var L = (c, t) => mix(c, "#ffffff", t);
var D = (c, t) => mix(c, "#000000", t);
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var lin = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== void 0 ? ` stop-opacity="${op}"` : ""}/>`).join("")}</linearGradient>`;
var rad = (id, stops, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op !== void 0 ? ` stop-opacity="${op}"` : ""}/>`).join("")}</radialGradient>`;
var mirror = (g) => `<g transform="translate(800 0) scale(-1 1)">${g}</g>`;
var both = (g) => g + mirror(g);
var metalDefs = (id, c) => lin(id, [[0, L(c, 0.65)], [0.3, c], [0.55, D(c, 0.35)], [0.78, L(c, 0.15)], [1, D(c, 0.55)]], 0.1, 0, 0.9, 1);
var hornColor = (p) => p.armor ? p.accent : mix(p.main, "#e9dfc4", 0.62);
function horn(p, base, s) {
  if (s <= 0) return "";
  const hc = hornColor(p);
  const [bx, by] = base;
  return `<g transform="translate(${bx} ${by}) scale(${s}) translate(${-bx} ${-by})">
    <path d="M${bx + 12} ${by + 8} C${bx - 38} ${by - 25} ${bx - 78} ${by - 90} ${bx - 70} ${by - 165} C${bx - 64} ${by - 205} ${bx - 40} ${by - 235} ${bx - 22} ${by - 245} C${bx - 32} ${by - 195} ${bx - 22} ${by - 145} ${bx + 14} ${by - 85} C${bx + 30} ${by - 58} ${bx + 34} ${by - 22} ${bx + 34} ${by + 2} Z" fill="url(#gHorn)"/>
    <path d="M${bx - 48} ${by - 62} Q${bx - 22} ${by - 76} ${bx + 4} ${by - 52} M${bx - 62} ${by - 108} Q${bx - 38} ${by - 120} ${bx - 14} ${by - 98} M${bx - 66} ${by - 150} Q${bx - 46} ${by - 160} ${bx - 28} ${by - 142}" stroke="${D(hc, 0.55)}" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
    <path d="M${bx - 58} ${by - 70} C${bx - 70} ${by - 110} ${bx - 66} ${by - 160} ${bx - 40} ${by - 215}" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
  </g>`;
}
var hornDefs = (p) => {
  const hc = hornColor(p);
  return lin("gHorn", [[0, L(hc, 0.55)], [0.5, hc], [1, D(hc, 0.55)]], 0, 0, 1, 1);
};
function scene(p, defs, character) {
  const cin = p.style === "cinema";
  const r = rng(p.seed);
  const glow = p.eye;
  const bgBase = cin ? mix(p.main, "#0a0a14", 0.82) : L(mix(p.accent, p.main, 0.4), 0.78);
  const bokeh = Array.from({ length: cin ? 16 : 10 }, () => {
    const x = r() * 800;
    const y = r() * 650;
    const rr = 10 + r() * 38;
    const col = r() > 0.5 ? glow : p.accent;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${cin ? col : "#fff"}" opacity="${(cin ? 0.05 + r() * 0.12 : 0.25 + r() * 0.3).toFixed(2)}" filter="url(#b3)"/>`;
  }).join("");
  const embers = Array.from({ length: cin ? p.fire ? 46 : 28 : 14 }, () => {
    const x = 120 + r() * 560;
    const y = 120 + r() * 620;
    const rr = 1.2 + r() * 3.2;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${r() > 0.4 ? glow : L(p.accent, 0.4)}" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }).join("");
  const bg = cin ? `<rect width="800" height="800" fill="${bgBase}"/>
       <ellipse cx="400" cy="360" rx="380" ry="330" fill="url(#bgGlow)"/>
       <g opacity=".5" filter="url(#b16)"><polygon points="320,0 420,0 560,800 180,800" fill="#fff" opacity=".07"/><polygon points="500,0 560,0 760,800 640,800" fill="#fff" opacity=".05"/></g>
       ${bokeh}
       <rect y="560" width="800" height="240" fill="url(#fog)"/>` : `<rect width="800" height="800" fill="url(#bgToon)"/>
       <circle cx="400" cy="340" r="285" fill="#fff" opacity=".4"/>
       <circle cx="400" cy="340" r="230" fill="${L(p.accent, 0.6)}" opacity=".5"/>
       ${bokeh}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="1024" height="1024">
  <defs>
    <filter id="b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="b16" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="b34" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${p.seed % 50}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .22 0"/></filter>
    <filter id="toonSat"><feColorMatrix type="saturate" values="1.3"/></filter>
    ${rad("bgGlow", [[0, mix(glow, bgBase, 0.55), 0.85], [0.55, mix(p.accent, bgBase, 0.8), 0.3], [1, bgBase, 0]], 0.5, 0.45, 0.5)}
    ${lin("fog", [[0, bgBase, 0], [1, D(bgBase, 0.6), 0.95]])}
    ${lin("bgToon", [[0, L(mix(p.accent, "#ffffff", 0.4), 0.5)], [1, L(p.main, 0.7)]], 0, 0, 0, 1)}
    ${rad("vig", [[0.5, "#000", 0], [1, "#000", 0.78]], 0.5, 0.48, 0.75)}
    ${defs}
  </defs>
  ${bg}
  <ellipse cx="400" cy="790" rx="300" ry="30" fill="#000" opacity="${cin ? 0.55 : 0.18}" filter="url(#b16)"/>
  <g ${cin ? "" : 'filter="url(#toonSat)"'}><g transform="translate(44 84) scale(.89)">${character}</g></g>
  ${embers}
  ${cin ? '<rect width="800" height="800" fill="url(#vig)"/><rect width="800" height="800" filter="url(#grain)" opacity=".5"/>' : ""}
</svg>`;
}

// src/lib/art/beast.ts
function beast(p) {
  const { main, accent, eye } = p;
  const r = rng(p.seed + 7);
  const defs = `
    ${hornDefs(p)}
    ${metalDefs("gMetal", accent)}
    ${lin("gFur", [[0, L(main, 0.35)], [0.5, main], [1, D(main, 0.65)]], 0.2, 0, 0.8, 1)}
    ${rad("gHead", [[0, L(main, 0.5)], [0.5, main], [1, D(main, 0.62)]], 0.4, 0.3, 0.85)}
    ${rad("gMuzzle", [[0, L(main, 0.7)], [0.7, L(main, 0.25)], [1, main]], 0.5, 0.3, 0.8)}
    ${rad("gEye", [[0, "#fff"], [0.3, L(eye, 0.4)], [0.75, eye], [1, D(eye, 0.5)]])}
    ${rad("gRune", [[0, "#fff"], [0.4, accent], [1, accent, 0]])}`;
  const fur = (cx, cy, w, h, n, col, op) => {
    const d = Array.from({ length: n }, () => {
      const x = cx + (r() - 0.5) * w;
      const y = cy + (r() - 0.5) * h;
      const l = 14 + r() * 22;
      const a = (r() - 0.5) * 0.9;
      return `M${x.toFixed(0)} ${y.toFixed(0)} q${(Math.sin(a) * 8).toFixed(0)} ${(-l / 2).toFixed(0)} ${(Math.sin(a) * l * 0.6).toFixed(0)} ${(-l).toFixed(0)}`;
    }).join(" ");
    return `<path d="${d}" stroke="${col}" stroke-width="2.4" fill="none" opacity="${op}" stroke-linecap="round"/>`;
  };
  const ruff = (() => {
    const pts = [];
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + i / n * Math.PI;
      const rr = 300 + (i % 2 ? 46 : 0) + r() * 14;
      pts.push(`${(400 + Math.cos(a) * rr * 1.05).toFixed(0)},${(600 + Math.sin(a) * rr * 0.82).toFixed(0)}`);
    }
    return `<polygon points="${pts.join(" ")} 760,800 40,800" fill="${D(main, 0.45)}"/>`;
  })();
  const chest = `<path d="M196 800 C206 690 288 604 338 570 L462 570 C512 604 594 690 604 800 Z" fill="url(#gFur)"/>
    ${fur(400, 680, 330, 200, 90, L(main, 0.5), 0.45)}${fur(400, 700, 330, 200, 70, D(main, 0.7), 0.45)}`;
  const collar = p.armor ? `<path d="M310 582 C360 628 440 628 490 582 L500 632 C440 680 360 680 300 632 Z" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="3"/><circle cx="400" cy="640" r="16" fill="${eye}" filter="url(#glow)"/>` : "";
  const ears = both(`<path d="M308 286 L262 96 C322 118 378 176 392 244 Z" fill="${D(main, 0.1)}" stroke="${D(main, 0.6)}" stroke-width="3" stroke-linejoin="round"/><path d="M312 262 L286 150 C326 172 358 206 370 246 Z" fill="${mix(main, "#ff8fa3", 0.35)}" opacity=".85"/>`);
  const hornsEl = p.horns > 0 ? both(horn(p, [352, 236], p.horns * 0.85)) : "";
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
    <ellipse cx="400" cy="320" rx="120" ry="100" fill="${eye}" opacity=".1" filter="url(#b34)"/>`;
  return scene(p, defs, ruff + chest + collar + ears + hornsEl + head);
}

// src/lib/art/dragon.ts
function dragon(p) {
  const { main, accent, eye } = p;
  const hc = p.armor ? accent : mix(main, "#e9dfc4", 0.62);
  void hc;
  const defs = `
    ${hornDefs(p)}
    ${metalDefs("gMetal", accent)}
    ${lin("gBody", [[0, L(main, 0.38)], [0.5, main], [1, D(main, 0.6)]], 0.2, 0, 0.8, 1)}
    ${rad("gHead", [[0, L(main, 0.5)], [0.5, main], [1, D(main, 0.62)]], 0.4, 0.3, 0.85)}
    ${rad("gMuzzle", [[0, L(main, 0.55)], [0.7, L(main, 0.1)], [1, D(main, 0.3)]], 0.5, 0.3, 0.8)}
    ${lin("gWing", [[0, mix(main, accent, 0.3)], [1, D(mix(main, accent, 0.2), 0.7)]], 0, 0, 0.2, 1)}
    ${lin("gBelly", [[0, L(mix(main, accent, 0.4), 0.3)], [1, D(mix(main, accent, 0.4), 0.3)]])}
    ${rad("gEye", [[0, "#ffffff"], [0.3, L(eye, 0.35)], [0.7, eye], [1, D(eye, 0.55)]], 0.5, 0.5, 0.55)}
    ${rad("gGem", [[0, "#fff"], [0.4, eye], [1, D(eye, 0.6)]])}
    <pattern id="scales" width="26" height="20" patternUnits="userSpaceOnUse"><path d="M0 12 Q13 -2 26 12" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2"/><path d="M-13 22 Q0 8 13 22 M13 22 Q26 8 39 22" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2"/></pattern>`;
  const wingL = `
    <path d="M345 580 C255 470 150 350 36 205 C98 232 140 230 172 210 C168 262 206 284 240 278 C236 332 272 348 304 340 C302 405 322 480 350 552 Z" fill="url(#gWing)" stroke="${D(main, 0.55)}" stroke-width="3"/>
    <path d="M345 580 C262 478 150 352 36 205" stroke="${D(main, 0.3)}" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M345 570 C275 480 210 400 172 212 M345 570 C300 490 268 420 240 280 M345 570 C332 505 320 430 304 342" stroke="${D(main, 0.2)}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M60 232 C110 280 200 400 330 520" stroke="${L(accent, 0.5)}" stroke-width="3" fill="none" opacity=".35"/>
    <path d="M36 205 L18 170 L58 196 Z" fill="${L(main, 0.5)}"/>`;
  const wings = p.wings ? both(wingL) : "";
  const body = `
    <path d="M214 800 C210 700 252 622 308 562 C336 534 366 520 400 520 C434 520 464 534 492 562 C548 622 590 700 586 800 Z" fill="url(#gBody)"/>
    <path d="M214 800 C210 700 252 622 308 562 C336 534 366 520 400 520 C434 520 464 534 492 562 C548 622 590 700 586 800 Z" fill="url(#scales)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const y = 548 + i * 36;
    const w = 62 - i * 3;
    return `<path d="M${400 - w} ${y} Q400 ${y + 16} ${400 + w} ${y} L${400 + w - 7} ${y + 30} Q400 ${y + 44} ${400 - w + 7} ${y + 30} Z" fill="url(#gBelly)" stroke="${D(main, 0.55)}" stroke-width="2" opacity=".95"/>`;
  }).join("")}
    <path d="M214 800 C210 700 252 622 308 562" stroke="${L(eye, 0.4)}" stroke-width="3" fill="none" opacity=".55" filter="url(#b3)"/>
    <ellipse cx="400" cy="540" rx="120" ry="36" fill="#000" opacity=".5" filter="url(#b16)"/>`;
  const armorL = `
    <path d="M172 800 C132 690 186 606 284 598 C332 642 334 722 318 800 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>
    <path d="M190 744 C216 694 256 664 302 654 M186 782 C222 738 268 710 320 704" stroke="${L(accent, 0.6)}" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>
    <path d="M214 628 L184 556 L256 614 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="2"/>
    <circle cx="238" cy="690" r="7" fill="${D(accent, 0.4)}"/><circle cx="214" cy="738" r="6" fill="${D(accent, 0.4)}"/>
    <path d="M318 566 C360 604 440 604 482 566 L494 614 C440 658 360 658 306 614 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>`;
  const armorC = `
    <path d="M326 694 C360 654 440 654 474 694 L488 800 L312 800 Z" fill="url(#gMetal)" stroke="${D(accent, 0.5)}" stroke-width="3"/>
    <path d="M400 668 V800" stroke="${D(accent, 0.45)}" stroke-width="3"/>
    <circle cx="400" cy="728" r="30" fill="${D(accent, 0.5)}"/><circle cx="400" cy="728" r="24" fill="url(#gGem)" filter="url(#glow)"/>`;
  const armor = p.armor ? both(armorL) + armorC : "";
  const hornsBack = p.horns > 0 ? both(horn(p, [340, 262], p.horns)) : "";
  const sideHorns = both(`<path d="M300 336 C268 326 236 304 218 262 C250 282 286 292 314 298 Z" fill="url(#gHorn)" opacity="${p.horns > 0 ? 1 : 0.85}"/>`);
  const fins = both(`<path d="M290 362 L212 342 L236 384 L204 428 L296 412 Z" fill="${D(main, 0.15)}" stroke="${D(main, 0.55)}" stroke-width="2"/><path d="M290 366 L226 354 M290 384 L222 392" stroke="${L(accent, 0.3)}" stroke-width="3" opacity=".5"/>`);
  const cheeks = both(`<path d="M270 346 L222 374 L262 394 Z" fill="${D(main, 0.2)}"/>`);
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
    ${p.fire ? `<g opacity=".8"><ellipse cx="376" cy="474" rx="22" ry="14" fill="#ffb347" filter="url(#b6)"/><ellipse cx="424" cy="474" rx="22" ry="14" fill="#ffb347" filter="url(#b6)"/></g>` : ""}
    <ellipse cx="400" cy="300" rx="120" ry="110" fill="${eye}" opacity=".12" filter="url(#b34)"/>`;
  return scene(p, defs, wings + body + armor + hornsBack + sideHorns + fins + cheeks + head);
}

// src/lib/art/robot.ts
function robot(p) {
  const { main, accent, eye } = p;
  const defs = `
    ${hornDefs(p)}
    ${metalDefs("gMetal", accent)}
    ${metalDefs("gPlate", main)}
    ${lin("gBody", [[0, L(main, 0.3)], [0.5, main], [1, D(main, 0.65)]], 0.2, 0, 0.8, 1)}
    ${rad("gHead", [[0, L(main, 0.55)], [0.5, main], [1, D(main, 0.6)]], 0.35, 0.25, 0.9)}
    ${lin("gGlass", [[0, "#1b1b2c"], [1, "#05050a"]])}
    ${rad("gEye", [[0, "#ffffff"], [0.35, L(eye, 0.4)], [0.75, eye], [1, D(eye, 0.4)]])}
    ${rad("gCore", [[0, "#ffffff"], [0.3, L(eye, 0.3)], [0.7, eye], [1, D(eye, 0.6)]])}`;
  const blades = p.wings ? both([[70, 320, 26], [105, 440, 22], [150, 548, 18], [210, 640, 14]].map(([tx, ty, w]) => `<path d="M352 610 L${tx} ${ty} L${tx + w + 20} ${ty + 22} L360 662 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/><path d="M352 610 L${tx} ${ty}" stroke="${L(eye, 0.4)}" stroke-width="3" opacity=".6"/>`).join("")) : "";
  const torso = `
    <path d="M108 800 L172 646 C198 602 262 586 322 590 L478 590 C538 586 602 602 628 646 L692 800 Z" fill="url(#gBody)"/>
    <path d="M250 600 L226 800 M550 600 L574 800 M150 712 H650" stroke="${D(main, 0.6)}" stroke-width="3" fill="none" opacity=".7"/>
    ${both(`<path d="M128 700 C116 624 170 584 244 590 C290 596 304 654 296 728 L140 750 Z" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="3"/><path d="M146 700 H288" stroke="${D(accent, 0.5)}" stroke-width="4"/><circle cx="188" cy="640" r="9" fill="${D(accent, 0.45)}"/><circle cx="244" cy="628" r="7" fill="${D(accent, 0.45)}"/>`)}
    <circle cx="400" cy="706" r="68" fill="#0d0d16" stroke="${L(main, 0.3)}" stroke-width="7"/>
    <circle cx="400" cy="706" r="50" fill="none" stroke="${eye}" stroke-width="3" opacity=".55"/>
    <circle cx="400" cy="706" r="46" fill="${eye}" opacity=".35" filter="url(#b16)"/>
    <circle cx="400" cy="706" r="30" fill="url(#gCore)" filter="url(#glow)"/>
    <path d="M400 640 V664 M400 748 V772 M334 706 H358 M442 706 H466" stroke="${L(main, 0.4)}" stroke-width="5"/>`;
  const neck = `
    <rect x="352" y="520" width="96" height="90" rx="14" fill="${D(main, 0.55)}"/>
    ${[0, 1, 2, 3].map((i) => `<rect x="352" y="${530 + i * 20}" width="96" height="8" rx="4" fill="${D(main, 0.2)}"/>`).join("")}
    ${both(`<rect x="334" y="500" width="14" height="96" rx="7" fill="url(#gMetal)"/>`)}`;
  const hornsEl = p.horns > 0 ? both(horn(p, [338, 214], p.horns)) : "";
  const antenna = p.horns > 0 ? "" : `<path d="M400 168 V96" stroke="${D(main, 0.4)}" stroke-width="9" stroke-linecap="round"/><circle cx="400" cy="88" r="14" fill="${eye}" filter="url(#glow)"/>`;
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
    ${[0, 1, 2, 3].map((i) => `<rect x="354" y="${456 + i * 12}" width="92" height="5" rx="2.5" fill="${eye}" opacity="${0.75 - i * 0.12}"/>`).join("")}
    ${both(`<circle cx="318" cy="470" r="8" fill="${D(main, 0.5)}"/><circle cx="318" cy="470" r="3" fill="${L(main, 0.4)}"/>`)}
    ${antenna}`;
  return scene(p, defs, blades + torso + neck + hornsEl + head);
}

// src/lib/art/spirit.ts
function spirit(p) {
  const { main, accent, eye } = p;
  const r = rng(p.seed + 3);
  const defs = `
    ${hornDefs(p)}
    ${rad("gBody", [[0, "#ffffff", 0.95], [0.25, L(main, 0.55), 0.92], [0.7, main, 0.85], [1, D(main, 0.4), 0.55]], 0.5, 0.35, 0.65)}
    ${rad("gAura", [[0, eye, 0.55], [0.6, main, 0.2], [1, main, 0]])}
    ${lin("gRibbon", [[0, accent, 0], [0.5, accent, 0.85], [1, L(main, 0.5), 0]], 0, 0, 1, 1)}
    ${rad("gIris", [[0, "#fff"], [0.3, L(eye, 0.4)], [0.8, eye], [1, D(eye, 0.4)]])}
    ${rad("gOrb", [[0, "#fff"], [0.4, accent], [1, accent, 0]])}`;
  const stars = Array.from({ length: 30 }, () => {
    const x = 270 + r() * 260;
    const y = 180 + r() * 540;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r() * 2.4).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  }).join("");
  const orbs = Array.from({ length: 9 }, (_, i) => {
    const a = i / 9 * Math.PI * 2 + r();
    const x = 400 + Math.cos(a) * (250 + r() * 70);
    const y = 420 + Math.sin(a) * (230 + r() * 60);
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(10 + r() * 14).toFixed(0)}" fill="url(#gOrb)"/>`;
  }).join("");
  const crown = p.horns > 0 ? both(`<g fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" filter="url(#glow)"><path d="M356 172 C326 130 300 112 282 70"/><path d="M322 126 C304 124 292 132 280 146"/></g><circle cx="282" cy="66" r="13" fill="url(#gOrb)"/><circle cx="282" cy="66" r="6" fill="#fff"/>`) : both(`<path d="M370 150 L350 96 L388 128 Z" fill="${accent}" opacity=".9" filter="url(#glow)"/>`) + `<path d="M400 140 L384 96 L400 56 L416 96 Z" fill="${accent}" filter="url(#glow)"/>`;
  const wings = p.wings ? both(`<path d="M330 420 C240 360 150 300 70 330 C130 350 170 390 190 430 C140 430 100 450 80 490 C150 480 210 490 260 520 Z" fill="${L(main, 0.5)}" opacity=".45" filter="url(#glow)"/>`) : "";
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
    ${both(`<circle cx="276" cy="446" r="22" fill="${accent}" opacity=".3" filter="url(#b6)"/>`)}`
  );
}

// src/lib/art/warrior.ts
function warrior(p) {
  const { main, accent, eye } = p;
  const cape = D(accent, 0.45);
  const defs = `
    ${hornDefs(p)}
    ${metalDefs("gPlate", main)}
    ${metalDefs("gMetal", accent)}
    ${lin("gCape", [[0, L(cape, 0.15)], [1, D(cape, 0.7)]], 0, 0, 0.3, 1)}
    ${rad("gHelm", [[0, L(main, 0.6)], [0.5, main], [1, D(main, 0.65)]], 0.38, 0.28, 0.9)}
    ${rad("gEye", [[0, "#fff"], [0.4, L(eye, 0.3)], [1, eye]])}
    ${lin("gPlume", [[0, L(accent, 0.3)], [1, D(accent, 0.55)]], 0, 0, 1, 1)}`;
  const capeEl = `<path d="M96 800 C112 640 226 556 330 552 L470 552 C574 556 688 640 704 800 Z" fill="url(#gCape)"/>
    <path d="M190 620 C176 690 170 750 172 800 M610 620 C624 690 630 750 628 800 M300 580 C280 660 270 740 272 800 M500 580 C520 660 530 740 528 800" stroke="${D(cape, 0.6)}" stroke-width="4" fill="none" opacity=".55"/>`;
  const plume = p.horns > 0 ? "" : `<path d="M400 178 C460 84 580 96 626 196 C560 150 480 164 436 222 Z" fill="url(#gPlume)" stroke="${D(accent, 0.6)}" stroke-width="2"/>
    <path d="M410 176 C470 110 548 112 594 170" stroke="${L(accent, 0.55)}" stroke-width="3" fill="none" opacity=".6"/>`;
  const hornsEl = p.horns > 0 ? both(horn(p, [346, 262], p.horns)) : "";
  const body = `
    ${both(`<path d="M138 800 C86 680 142 584 266 574 C326 618 332 704 318 800 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/><path d="M158 726 C190 664 240 628 304 618" stroke="${L(main, 0.65)}" stroke-width="4" fill="none" opacity=".6"/><path d="M146 770 C196 716 256 690 318 686" stroke="url(#gMetal)" stroke-width="12" fill="none"/>`)}
    <path d="M322 596 C362 580 438 580 478 596 L504 800 L296 800 Z" fill="url(#gPlate)" stroke="${D(main, 0.6)}" stroke-width="3"/>
    <path d="M296 700 H504" stroke="url(#gMetal)" stroke-width="12"/>
    <circle cx="400" cy="682" r="36" fill="url(#gMetal)" stroke="${D(accent, 0.6)}" stroke-width="4"/>
    <path transform="translate(400 682)" d="M0 -22 L6.5 -7 L22 -6 L10 4 L14 20 L0 11 L-14 20 L-10 4 L-22 -6 L-6.5 -7Z" fill="${D(accent, 0.6)}"/>
    <path d="M326 566 L474 566 L490 616 Q400 650 310 616 Z" fill="${D(main, 0.35)}" stroke="${D(main, 0.65)}" stroke-width="3"/>`;
  const helmet = `
    <path d="M298 546 L288 330 C288 228 340 172 400 172 C460 172 512 228 512 330 L502 546 C470 566 330 566 298 546 Z" fill="url(#gHelm)"/>
    <path d="M298 546 L288 330 C288 228 340 172 400 172" stroke="${L(eye, 0.55)}" stroke-width="3.5" fill="none" opacity=".55" filter="url(#b3)"/>
    <rect x="391" y="174" width="18" height="170" rx="6" fill="url(#gMetal)" stroke="${D(accent, 0.55)}" stroke-width="2"/>
    <path d="M296 334 Q400 296 504 334 L504 350 Q400 318 296 350 Z" fill="${D(main, 0.4)}"/>
    <path d="M314 352 H486 Q492 352 492 360 V376 Q492 384 486 384 H314 Q308 384 308 376 V360 Q308 352 314 352 Z" fill="#05050a" stroke="${D(main, 0.7)}" stroke-width="3"/>
    <path d="M388 384 H412 V476 Q400 486 388 476 Z" fill="#05050a"/>
    ${both(`<ellipse cx="352" cy="368" rx="34" ry="16" fill="${eye}" opacity=".75" filter="url(#b16)"/><ellipse cx="350" cy="368" rx="24" ry="7" fill="url(#gEye)" filter="url(#glow)"/>`)}
    ${both(`<path d="M312 430 L352 436 M310 446 L350 452 M312 462 L346 466" stroke="${D(main, 0.65)}" stroke-width="3" opacity=".7"/>`)}
    ${both(`<path d="M290 470 L324 520 L300 548 Z" fill="${D(main, 0.25)}" opacity=".6"/>`)}`;
  return scene(p, defs, capeEl + plume + hornsEl + body + helmet);
}

// src/lib/art/index.ts
var DEFAULTS = {
  dragon: { main: "#3d2f4f", accent: "#d5a63a", eye: "#ffb21a" },
  robot: { main: "#5b6678", accent: "#d9dfe8", eye: "#39e1ff" },
  warrior: { main: "#8e99ac", accent: "#c93a3a", eye: "#7fe9ff" },
  beast: { main: "#5d6677", accent: "#7cd3ff", eye: "#ffd23f" },
  spirit: { main: "#6d5be8", accent: "#ffe27a", eye: "#a8f4ff" }
};
function hornScale(phrase, dflt) {
  if (!phrase) return dflt;
  if (/огромн|гигант|больш|длинн/.test(phrase)) return 1.3;
  if (/маленьк|небольш|коротк|крошеч/.test(phrase)) return 0.62;
  return 1;
}
function paramsFor(spec, arch) {
  const d = DEFAULTS[arch];
  const pick = (c, fallback) => c?.hex ?? fallback;
  const main = pick(spec.main, d.main);
  let accent = pick(spec.accent, spec.main ? L(spec.main.hex, 0.3) : d.accent);
  if (!spec.accent && spec.main && arch === "dragon") accent = d.accent;
  const f = spec.features;
  const horns = f.horns ? hornScale(f.horns, 1) : arch === "dragon" ? 1 : 0;
  const seed = (spec.name ?? spec.kind?.nom ?? "hero").split("").reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  return {
    arch,
    main,
    accent,
    eye: pick(spec.eyes, d.eye),
    style: spec.style ?? "cinema",
    horns,
    wings: !!f.wings || arch === "dragon",
    armor: !!(f.armor || f.metal || f.helmet),
    fire: !!f.fire,
    seed: Math.abs(seed) || 1
  };
}
var RENDER = { dragon, robot, warrior, beast, spirit };
function renderHeroSvg(spec, arch) {
  const p = paramsFor(spec, arch);
  return RENDER[arch](p);
}
var svgToDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// server/config.ts
var num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};
function normalizeKey(env2) {
  const raw = env2.FAL_KEY ?? env2.FAL_API_KEY;
  if (raw === void 0) return { key: "", state: "missing" };
  const key = raw.trim().replace(/^FAL_KEY\s*=\s*/i, "").replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!key) return { key: "", state: "empty" };
  if (key.length <= 10) return { key: "", state: "short" };
  if (/your|example|placeholder/i.test(key)) return { key: "", state: "placeholder" };
  return { key, state: "ok" };
}
function readConfig(env2) {
  const mock = env2.FAL_MOCK === "1" || env2.FAL_MOCK === "true";
  const k = normalizeKey(env2);
  const hasKey = k.state === "ok";
  const switchedOff = env2.FAL_ENABLED === "false";
  const noStore = !mock && env2.FAL_NO_STORE === "1";
  const reason = switchedOff ? "switched_off" : !mock && !hasKey ? "no_key" : noStore ? "no_store" : void 0;
  return {
    mock,
    reason,
    key: k.key,
    keyState: k.state,
    storeMissing: noStore,
    allowDemo: env2.FAL_ALLOW_DEMO ? env2.FAL_ALLOW_DEMO === "true" : true,
    enabled: !switchedOff && !noStore && (mock || hasKey),
    model: env2.FAL_MODEL || "fal-ai/nano-banana",
    editModel: env2.FAL_EDIT_MODEL || "fal-ai/nano-banana/edit",
    /** всего картинок в день на весь сервер */
    dailyLimit: num(env2.FAL_DAILY_LIMIT, 100),
    totalLimit: Number(env2.FAL_TOTAL_LIMIT) > 0 ? Number(env2.FAL_TOTAL_LIMIT) : 0,
    trustProxy: env2.FAL_TRUST_PROXY === "true",
    /** запросов в час с одного адреса */
    hourlyPerIp: num(env2.FAL_HOURLY_PER_IP, 8),
    /** картинок на один урок: первое изображение + правки */
    sessionLimit: num(env2.FAL_SESSION_LIMIT, 4),
    maxConcurrent: num(env2.FAL_MAX_CONCURRENT, 3),
    timeoutMs: num(env2.FAL_TIMEOUT_MS, 7e4),
    costPerImage: num(env2.FAL_COST_PER_IMAGE, 0.039),
    debug: env2.FAL_DEBUG === "true",
    accessCode: (env2.FAL_ACCESS_CODE ?? "").trim()
  };
}

// server/store.ts
import { createHash } from "node:crypto";

// server/limits.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
var Limits = class {
  constructor(file = null) {
    this.file = file;
    this.ip = /* @__PURE__ */ new Map();
    this.session = /* @__PURE__ */ new Map();
    this.active = 0;
    this.total = 0;
    this.day = { date: "", count: 0 };
    this.loadDay();
  }
  today() {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  loadDay() {
    if (!this.file || !existsSync(this.file)) return;
    try {
      const d = JSON.parse(readFileSync(this.file, "utf8"));
      if (d?.date === this.today()) this.day = d;
    } catch {
    }
  }
  saveDay() {
    if (!this.file) return;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(this.file, JSON.stringify(this.day));
    } catch {
    }
  }
  rollDay() {
    if (this.day.date !== this.today()) this.day = { date: this.today(), count: 0 };
  }
  sessionUsed(sid) {
    return this.session.get(sid) ?? 0;
  }
  dailyUsed() {
    this.rollDay();
    return this.day.count;
  }
  /** Резервирует одну генерацию или возвращает причину отказа. */
  reserve(ip, sid, cfg) {
    this.rollDay();
    if (cfg.totalLimit && this.total >= cfg.totalLimit) return { ok: false, code: "daily_limit" };
    if (this.day.count >= cfg.dailyLimit) return { ok: false, code: "daily_limit" };
    if (this.sessionUsed(sid) >= cfg.sessionLimit) return { ok: false, code: "session_limit" };
    const now = Date.now();
    const hits = (this.ip.get(ip) ?? []).filter((t) => now - t < 36e5);
    if (hits.length >= cfg.hourlyPerIp) return { ok: false, code: "ip_limit" };
    if (this.active >= cfg.maxConcurrent) return { ok: false, code: "busy" };
    hits.push(now);
    this.ip.set(ip, hits);
    this.session.set(sid, this.sessionUsed(sid) + 1);
    this.day.count += 1;
    this.total += 1;
    this.active += 1;
    this.saveDay();
    return { ok: true };
  }
  release(ip, sid, refund) {
    this.active = Math.max(0, this.active - 1);
    if (!refund) return;
    this.day.count = Math.max(0, this.day.count - 1);
    this.total = Math.max(0, this.total - 1);
    this.session.set(sid, Math.max(0, this.sessionUsed(sid) - 1));
    const hits = this.ip.get(ip) ?? [];
    hits.pop();
    this.ip.set(ip, hits);
    this.saveDay();
  }
};

// server/store.ts
var MemoryStore = class {
  constructor(usageFile) {
    this.seen = /* @__PURE__ */ new Map();
    this.limits = new Limits(usageFile);
  }
  async reserve(ip, sid, cfg) {
    return this.limits.reserve(ip, sid, cfg);
  }
  async release(ip, sid, refund) {
    this.limits.release(ip, sid, refund);
  }
  async sessionUsed(sid) {
    return this.limits.sessionUsed(sid);
  }
  async once(id) {
    const now = Date.now();
    for (const [k, t] of this.seen) if (now - t > 6e5) this.seen.delete(k);
    if (this.seen.has(id)) return false;
    this.seen.set(id, now);
    return true;
  }
};
var RESERVE = `
local day=tonumber(redis.call('GET',KEYS[1]) or '0')
local total=tonumber(redis.call('GET',KEYS[2]) or '0')
local sess=tonumber(redis.call('GET',KEYS[3]) or '0')
local ip=tonumber(redis.call('GET',KEYS[4]) or '0')
local act=tonumber(redis.call('GET',KEYS[5]) or '0')
if tonumber(ARGV[2])>0 and total>=tonumber(ARGV[2]) then return 'daily_limit' end
if day>=tonumber(ARGV[1]) then return 'daily_limit' end
if sess>=tonumber(ARGV[3]) then return 'session_limit' end
if ip>=tonumber(ARGV[4]) then return 'ip_limit' end
if act>=tonumber(ARGV[5]) then return 'busy' end
redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],ARGV[6])
redis.call('INCR',KEYS[2])
redis.call('INCR',KEYS[3]); redis.call('EXPIRE',KEYS[3],ARGV[7])
redis.call('INCR',KEYS[4]); redis.call('EXPIRE',KEYS[4],ARGV[8])
redis.call('INCR',KEYS[5]); redis.call('EXPIRE',KEYS[5],ARGV[9])
return 'ok'
`;
var RELEASE = `
local act=tonumber(redis.call('GET',KEYS[5]) or '0')
if act>0 then redis.call('DECR',KEYS[5]) end
if ARGV[1]=='1' then
  for i=1,4 do
    local v=tonumber(redis.call('GET',KEYS[i]) or '0')
    if v>0 then redis.call('DECR',KEYS[i]) end
  end
end
return 'ok'
`;
var UpstashStore = class {
  constructor(url, token, salt, fetcher = fetch) {
    this.url = url;
    this.token = token;
    this.salt = salt;
    this.fetcher = fetcher;
  }
  async cmd(args) {
    const r = await this.fetcher(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      // Redis принимает аргументы строками
      body: JSON.stringify(args.map(String))
    });
    if (!r.ok) throw new Error(`store_http_${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error("store_error");
    return data.result;
  }
  /** Адрес и номер урока в Redis хранятся только в виде хэша. */
  h(s) {
    return createHash("sha256").update(`${this.salt}:${s}`).digest("hex").slice(0, 24);
  }
  keys(ip, sid) {
    const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return [`fal:day:${day}`, "fal:total", `fal:sess:${this.h(sid)}`, `fal:ip:${this.h(ip)}`, "fal:active"];
  }
  async reserve(ip, sid, cfg) {
    const res = await this.cmd([
      "EVAL",
      RESERVE,
      5,
      ...this.keys(ip, sid),
      cfg.dailyLimit,
      cfg.totalLimit ?? 0,
      cfg.sessionLimit,
      cfg.hourlyPerIp,
      cfg.maxConcurrent,
      172800,
      172800,
      3600,
      120
    ]);
    if (res === "ok") return { ok: true };
    if (res === "daily_limit" || res === "ip_limit" || res === "session_limit" || res === "busy") return { ok: false, code: res };
    throw new Error("store_unexpected");
  }
  async release(ip, sid, refund) {
    await this.cmd(["EVAL", RELEASE, 5, ...this.keys(ip, sid), refund ? "1" : "0"]);
  }
  async sessionUsed(sid) {
    const v = await this.cmd(["GET", `fal:sess:${this.h(sid)}`]);
    return Number(v ?? 0) || 0;
  }
  async once(id) {
    return await this.cmd(["SET", `fal:req:${this.h(id)}`, "1", "NX", "EX", 600]) === "OK";
  }
};
function upstashFromEnv(env2) {
  const url = env2.KV_REST_API_URL || env2.UPSTASH_REDIS_REST_URL;
  const token = env2.KV_REST_API_TOKEN || env2.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new UpstashStore(url, token, env2.FAL_KEY ?? "salt");
}

// server/prompt.ts
var KIND_EN = {
  \u0434\u0440\u0430\u043A\u043E\u043D: "dragon",
  \u0440\u043E\u0431\u043E\u0442: "friendly battle robot",
  \u043A\u0438\u0431\u043E\u0440\u0433: "cyborg",
  \u0430\u043D\u0434\u0440\u043E\u0438\u0434: "android",
  \u0440\u044B\u0446\u0430\u0440\u044C: "knight",
  \u0432\u043E\u0438\u043D: "warrior",
  \u0441\u0430\u043C\u0443\u0440\u0430\u0439: "samurai",
  \u0432\u0438\u043A\u0438\u043D\u0433: "viking",
  \u0433\u043B\u0430\u0434\u0438\u0430\u0442\u043E\u0440: "gladiator",
  \u043F\u0430\u043B\u0430\u0434\u0438\u043D: "paladin",
  \u043D\u0438\u043D\u0434\u0437\u044F: "ninja",
  \u0441\u043E\u043B\u0434\u0430\u0442: "soldier",
  \u043A\u043E\u0441\u043C\u043E\u043D\u0430\u0432\u0442: "astronaut",
  \u0441\u0443\u043F\u0435\u0440\u0433\u0435\u0440\u043E\u0439: "superhero",
  \u0433\u0435\u0440\u043E\u0439: "hero",
  \u0432\u043E\u043B\u043A: "wolf",
  \u043B\u0438\u0441: "fox",
  \u0437\u0432\u0435\u0440\u044C: "fantasy beast",
  \u0436\u0438\u0432\u043E\u0442\u043D\u043E\u0435: "fantasy animal",
  \u043C\u043E\u043D\u0441\u0442\u0440: "friendly fantasy monster",
  \u043C\u0435\u0434\u0432\u0435\u0434\u044C: "bear",
  \u0442\u0438\u0433\u0440: "tiger",
  \u043B\u0435\u0432: "lion",
  \u043F\u0430\u043D\u0442\u0435\u0440\u0430: "panther",
  \u043A\u043E\u0442: "cat",
  \u0441\u043E\u0431\u0430\u043A\u0430: "dog",
  \u0434\u0438\u043D\u043E\u0437\u0430\u0432\u0440: "dinosaur",
  \u0435\u0434\u0438\u043D\u043E\u0440\u043E\u0433: "unicorn",
  \u043B\u043E\u0448\u0430\u0434\u044C: "horse",
  \u0437\u0430\u044F\u0446: "hare",
  \u0430\u043A\u0443\u043B\u0430: "shark",
  \u0444\u0435\u043D\u0438\u043A\u0441: "phoenix",
  \u043F\u0440\u0438\u0437\u0440\u0430\u043A: "friendly ghost",
  \u0434\u0443\u0445: "spirit",
  \u0444\u0435\u044F: "fairy",
  \u044D\u043B\u044C\u0444: "elf",
  \u0432\u043E\u043B\u0448\u0435\u0431\u043D\u0438\u043A: "wizard",
  \u043C\u0430\u0433: "mage",
  \u043A\u043E\u043B\u0434\u0443\u043D: "sorcerer",
  \u0430\u043D\u0433\u0435\u043B: "angel",
  \u0434\u0435\u043C\u043E\u043D: "mischievous horned imp",
  \u043F\u0440\u0438\u0448\u0435\u043B\u0435\u0446: "friendly alien",
  \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043E: "magical creature",
  \u043F\u0440\u0438\u043D\u0446\u0435\u0441\u0441\u0430: "princess",
  \u043F\u0440\u0438\u043D\u0446: "prince",
  \u043A\u043E\u0440\u043E\u043B\u0435\u0432\u0430: "queen",
  \u043A\u043E\u0440\u043E\u043B\u044C: "king",
  \u043F\u0438\u0440\u0430\u0442: "pirate",
  \u043A\u043E\u0432\u0431\u043E\u0439: "cowboy",
  \u0434\u0435\u0432\u043E\u0447\u043A\u0430: "girl",
  \u043C\u0430\u043B\u044C\u0447\u0438\u043A: "boy",
  \u0447\u0435\u043B\u043E\u0432\u0435\u043A: "person",
  // герои чужих вселенных заменяем оригинальными персонажами
  "\u0447\u0435\u043B\u043E\u0432\u0435\u043A-\u043F\u0430\u0443\u043A": "original superhero in a red-and-blue suit with a web pattern",
  \u0431\u044D\u0442\u043C\u0435\u043D: "original dark-caped night hero",
  \u0441\u0443\u043F\u0435\u0440\u043C\u0435\u043D: "original flying hero with a cape",
  "\u0433\u0435\u0440\u043E\u0439 \u043C\u0430\u0439\u043D\u043A\u0440\u0430\u0444\u0442\u0430": "blocky voxel-style adventurer",
  \u043F\u043E\u043A\u0435\u043C\u043E\u043D: "original cute pocket-sized creature"
};
var ARCH_EN = { dragon: "dragon", robot: "battle robot", warrior: "armored warrior", beast: "fantasy beast", spirit: "magical spirit creature" };
var COLOR_EN = {
  \u0447\u0451\u0440\u043D\u044B\u0439: "black",
  \u0431\u0435\u043B\u044B\u0439: "white",
  \u0441\u0435\u0440\u044B\u0439: "gray",
  \u043A\u0440\u0430\u0441\u043D\u044B\u0439: "red",
  \u0441\u0438\u043D\u0438\u0439: "blue",
  \u0433\u043E\u043B\u0443\u0431\u043E\u0439: "light blue",
  \u0431\u0438\u0440\u044E\u0437\u043E\u0432\u044B\u0439: "turquoise",
  \u0437\u0435\u043B\u0451\u043D\u044B\u0439: "green",
  \u0438\u0437\u0443\u043C\u0440\u0443\u0434\u043D\u044B\u0439: "emerald green",
  \u0436\u0451\u043B\u0442\u044B\u0439: "yellow",
  \u043E\u0440\u0430\u043D\u0436\u0435\u0432\u044B\u0439: "orange",
  \u0440\u044B\u0436\u0438\u0439: "ginger orange",
  \u043E\u0433\u043D\u0435\u043D\u043D\u044B\u0439: "fiery orange-red",
  \u0444\u0438\u043E\u043B\u0435\u0442\u043E\u0432\u044B\u0439: "purple",
  \u0440\u043E\u0437\u043E\u0432\u044B\u0439: "pink",
  \u0437\u043E\u043B\u043E\u0442\u043E\u0439: "gold",
  \u0441\u0435\u0440\u0435\u0431\u0440\u0438\u0441\u0442\u044B\u0439: "silver",
  \u0431\u0440\u043E\u043D\u0437\u043E\u0432\u044B\u0439: "bronze",
  \u043A\u043E\u0440\u0438\u0447\u043D\u0435\u0432\u044B\u0439: "brown",
  \u0441\u0442\u0430\u043B\u044C\u043D\u043E\u0439: "steel gray"
};
var FEATURE_EN = {
  outfit: "outfit",
  armor: "armor",
  scales: "scales",
  fur: "fur",
  skin: "skin",
  metal: "metal plating",
  crystal: "crystals",
  look: "look",
  eyes: "eyes",
  horns: "horns",
  helmet: "helmet",
  ears: "ears",
  face: "face",
  teeth: "fangs",
  crown: "crown",
  head: "head details",
  wings: "wings",
  tail: "tail",
  claws: "claws",
  fire: "flames",
  spikes: "spikes",
  weapon: "fantasy gear",
  cape: "cape",
  theme: "theme",
  marks: "markings",
  extra: "extra detail"
};
var WORD_EN = [
  ["\u043E\u0433\u0440\u043E\u043C\u043D", "huge"],
  ["\u0433\u0438\u0433\u0430\u043D\u0442", "giant"],
  ["\u0431\u043E\u043B\u044C\u0448", "large"],
  ["\u043C\u0430\u043B\u0435\u043D\u044C\u043A", "small"],
  ["\u043D\u0435\u0431\u043E\u043B\u044C\u0448", "small"],
  ["\u0441\u0432\u0435\u0442\u044F\u0449", "glowing"],
  ["\u043C\u0435\u0442\u0430\u043B\u043B\u0438\u0447\u0435\u0441\u043A", "metallic"],
  ["\u0437\u043E\u043B\u043E\u0442", "golden"],
  ["\u0441\u0435\u0440\u0435\u0431\u0440", "silver"],
  ["\u043A\u0440\u0430\u0441\u043D", "red"],
  ["\u0433\u043E\u043B\u0443\u0431", "light blue"],
  ["\u0441\u0438\u043D", "blue"],
  ["\u0437\u0435\u043B\u0435\u043D", "green"],
  ["\u0437\u0435\u043B\u0451\u043D", "green"],
  ["\u0447\u0451\u0440\u043D", "black"],
  ["\u0447\u0435\u0440\u043D", "black"],
  ["\u0431\u0435\u043B", "white"],
  ["\u043E\u0441\u0442\u0440", "sharp"],
  ["\u0434\u043B\u0438\u043D\u043D", "long"],
  ["\u043F\u0443\u0448\u0438\u0441\u0442", "fluffy"],
  ["\u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D", "transparent"],
  ["\u043E\u0433\u043D\u0435\u043D\u043D", "fiery"],
  ["\u043B\u0435\u0434\u044F\u043D", "icy"],
  ["\u0444\u0438\u043E\u043B\u0435\u0442", "purple"],
  ["\u0440\u043E\u0437\u043E\u0432", "pink"],
  ["\u043E\u0440\u0430\u043D\u0436", "orange"],
  ["\u0436\u0451\u043B\u0442", "yellow"],
  ["\u0436\u0435\u043B\u0442", "yellow"],
  ["\u043F\u043B\u0430\u0442\u044C\u0435", "dress"],
  ["\u043A\u043E\u0441\u0442\u044E\u043C", "suit"],
  ["\u043F\u043B\u0430\u0449", "cape"],
  ["\u043C\u0430\u0441\u043A\u0430", "mask"],
  ["\u0434\u043E\u0441\u043F\u0435\u0445", "armor"],
  ["\u0433\u043B\u0430\u0437\u0430", "eyes"],
  ["\u0440\u043E\u0433\u0430", "horns"],
  ["\u043A\u0440\u044B\u043B\u044C\u044F", "wings"],
  ["\u0445\u0432\u043E\u0441\u0442", "tail"],
  ["\u043A\u043E\u0433\u0442\u0438", "claws"],
  ["\u0448\u0438\u043F\u044B", "spikes"],
  ["\u0448\u043B\u0435\u043C", "helmet"],
  ["\u043A\u043E\u0440\u043E\u043D\u0430", "crown"],
  ["\u0447\u0435\u0448\u0443\u044F", "scales"],
  ["\u0448\u0435\u0440\u0441\u0442\u044C", "fur"],
  ["\u043D\u0435\u043E\u043D\u043E\u0432\u0430\u044F", "neon"],
  ["\u043F\u043E\u0434\u0441\u0432\u0435\u0442\u043A\u0430", "glow"],
  ["\u0438\u0437 \u0431\u0443\u0434\u0443\u0449\u0435\u0433\u043E", "futuristic"],
  ["\u0431\u043E\u0435\u0432\u043E\u0439", "battle"],
  ["\u0432\u043E\u043B\u0448\u0435\u0431\u043D\u044B\u0439", "magical"],
  ["\u043A\u043E\u0441\u043C\u0438\u0447\u0435\u0441\u043A\u0438\u0439", "space"],
  ["\u0434\u0440\u0435\u0432\u043D\u0438\u0439", "ancient"]
];
function toEnglish(phrase) {
  let s = phrase.toLowerCase();
  const out = [];
  for (const [ru, en] of WORD_EN) {
    if (s.includes(ru)) {
      out.push(en);
      s = s.split(ru).join(" ");
    }
  }
  const rest = s.replace(/[,.;]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  return [...out, ...rest].join(" ").trim();
}
var kindEn = (spec) => {
  const k = spec.kind;
  return KIND_EN[k.nom.toLowerCase()] ?? `${ARCH_EN[k.arch]} (the child calls it \xAB${k.nom}\xBB)`;
};
var colorEn = (c) => c ? COLOR_EN[c.name] ?? c.name : "";
var GUARD = "Child-friendly, wholesome illustration for ages 8 to 14. No blood, no gore, no nudity, no realistic firearms, no text, no logos or watermarks, no real people, not a copy of any existing franchise character. Original character design.";
function describe(spec) {
  const parts = [];
  const palette = [colorEn(spec.main) && `main color ${colorEn(spec.main)}`, colorEn(spec.accent) && `accent color ${colorEn(spec.accent)}`, colorEn(spec.eyes) && `eye color ${colorEn(spec.eyes)}`].filter(Boolean);
  if (palette.length) parts.push(`Colors: ${palette.join(", ")}.`);
  const feats = Object.entries(spec.features).filter(([, v]) => v).map(([k, v]) => `${FEATURE_EN[k] ?? k}: ${toEnglish(v)} (${v})`);
  if (feats.length) parts.push(`Details: ${feats.join("; ")}.`);
  return parts.join(" ");
}
var styleLine = (spec) => spec.style === "toon" ? "Style: polished stylized 3D animated-film look, expressive shapes, vibrant clean colors, soft bright lighting." : "Style: cinematic photorealistic film still, detailed textures, dramatic contrasty lighting, shallow depth of field.";
function buildCreatePrompt(spec) {
  return [
    `A chest-up portrait of a ${kindEn(spec)}${spec.name ? ` named ${spec.name}` : ""}, centered, square composition, clean readable silhouette.`,
    describe(spec),
    styleLine(spec),
    GUARD
  ].filter(Boolean).join(" ");
}
function diffSpecs(prev, next) {
  const out = [];
  const cmpColor = (label, a, b) => {
    if (b && a?.name !== b.name) out.push(`${label}: ${colorEn(b)}`);
  };
  cmpColor("main color", prev.main, next.main);
  cmpColor("accent color", prev.accent, next.accent);
  cmpColor("eye color", prev.eyes, next.eyes);
  for (const [k, v] of Object.entries(next.features)) {
    if (v && prev.features[k] !== v) out.push(`${FEATURE_EN[k] ?? k}: ${toEnglish(v)} (${v})`);
  }
  if (next.style && prev.style !== next.style) out.push(next.style === "toon" ? "change to polished stylized 3D animated-film look" : "change to cinematic photorealistic look");
  if (next.kind && prev.kind && prev.kind.nom !== next.kind.nom) out.push(`character type: ${kindEn(next)}`);
  return out;
}
function buildEditPrompt(changes, spec) {
  return [
    "Edit the provided image of the character. Keep the same character identity, face, proportions, pose, composition, background and art style.",
    `Apply only these changes: ${changes.join("; ")}.`,
    "Do not change anything else.",
    spec.style === "toon" ? "Keep the polished stylized 3D animated-film look." : "Keep the cinematic photorealistic look.",
    GUARD
  ].join(" ");
}

// src/lib/nlu.ts
var PII = [
  /\d[\d\s().-]{6,}\d/,
  // телефон и длинные числа
  /[\w.-]+@[\w.-]+/,
  // e-mail
  /(^|\s)@[\w.]{3,}/,
  // ник в соцсети
  /меня зовут/i,
  /мо(е|ё) имя/i,
  /мне\s+\d{1,2}\s*(лет|год|года)/i,
  /\bя\s+(живу|учусь|из)\b/i,
  /живу\s+(в|на)\s/i,
  /(моя|наша)\s+школ/i,
  /школ[аеуы]?\s*(№|номер)?\s*\d+/i,
  /(улиц|проспект|переул)\w*\s+[А-ЯЁA-Z]/i,
  /мой\s+(адрес|телефон|номер|город)/i,
  /(http|www\.)/i
];
var looksPersonal = (text) => PII.some((re) => re.test(text));

// server/safety.ts
var norm = (s) => s.toLowerCase().replace(/ё/g, "\u0435");
var BLOCK = {
  sexual: ["\u0441\u0435\u043A\u0441", "\u043F\u043E\u0440\u043D\u043E", "\u044D\u0440\u043E\u0442", "\u0433\u043E\u043B\u044B\u0439", "\u0433\u043E\u043B\u0430\u044F", "\u0433\u043E\u043B\u044B\u0435", "\u043E\u0431\u043D\u0430\u0436\u0435\u043D", "\u0440\u0430\u0437\u0434\u0435\u0442", "\u0438\u043D\u0442\u0438\u043C", "=sex", "porn", "nude", "naked", "nsfw", "erotic"],
  violence: ["\u043A\u0440\u043E\u0432\u044C", "\u043A\u0440\u043E\u0432\u0430\u0432", "\u043A\u0440\u043E\u0432\u0438", "\u0443\u0431\u0438\u0439", "\u0443\u0431\u0438\u0442\u044C", "\u0443\u0431\u0438\u0442", "\u0440\u0430\u0441\u0447\u043B\u0435\u043D", "\u0442\u0440\u0443\u043F", "\u043F\u044B\u0442\u043A", "\u043A\u0430\u0437\u043D", "\u0438\u0437\u043D\u0430\u0441\u0438\u043B", "gore", "blood", "murder", "kill", "torture", "corpse"],
  weapons: ["\u043F\u0438\u0441\u0442\u043E\u043B\u0435\u0442", "\u0440\u0435\u0432\u043E\u043B\u044C\u0432\u0435\u0440", "\u0430\u0432\u0442\u043E\u043C\u0430\u0442", "\u0432\u0438\u043D\u0442\u043E\u0432\u043A", "\u0440\u0443\u0436\u044C\u0435", "\u0440\u0443\u0436\u044C\u044F", "\u0441\u043D\u0430\u0439\u043F\u0435\u0440", "\u0433\u0440\u0430\u043D\u0430\u0442", "\u0431\u043E\u043C\u0431", "\u043F\u0443\u043B\u0435\u043C\u0435\u0442", "\u043F\u0443\u043B\u0435\u043C\u0451\u0442", "=gun", "rifle", "pistol", "grenade", "bomb"],
  drugs: ["\u043D\u0430\u0440\u043A\u043E\u0442", "\u0433\u0435\u0440\u043E\u0438\u043D", "\u043A\u043E\u043A\u0430\u0438\u043D", "\u043C\u0430\u0440\u0438\u0445\u0443\u0430\u043D", "\u0442\u0440\u0430\u0432\u043A", "\u0441\u0438\u0433\u0430\u0440\u0435\u0442", "\u0432\u0435\u0439\u043F", "\u0432\u043E\u0434\u043A", "\u0430\u043B\u043A\u043E\u0433\u043E\u043B", "\u043F\u0438\u0432\u043E", "\u043F\u044C\u044F\u043D", "cocaine", "heroin", "weed", "vodka", "alcohol"],
  selfharm: ["\u0441\u0443\u0438\u0446\u0438\u0434", "\u0441\u0430\u043C\u043E\u0443\u0431\u0438\u0439", "\u043F\u043E\u0432\u0435\u0441\u0438\u0442", "\u043F\u043E\u0440\u0435\u0437", "suicide"],
  hate: ["\u043D\u0430\u0446\u0438\u0441\u0442", "\u0433\u0438\u0442\u043B\u0435\u0440", "\u0441\u0432\u0430\u0441\u0442\u0438\u043A", "\u0442\u0435\u0440\u0440\u043E\u0440\u0438\u0441\u0442", "\u044D\u043A\u0441\u0442\u0440\u0435\u043C\u0438\u0441\u0442", "\u0444\u0430\u0448\u0438\u0441\u0442", "nazi", "hitler", "terror"],
  profanity: ["\u0445\u0443\u0439", "\u0445\u0443\u0435", "\u0445\u0443\u044F", "\u043F\u0438\u0437\u0434", "\u0431\u043B\u044F\u0434", "\u0431\u043B\u044F\u0442", "\u0435\u0431\u0430\u043D", "\u0435\u0431\u0430\u0442", "\u0435\u0431\u043B", "\u0437\u0430\u043B\u0443\u043F", "\u043C\u0443\u0434\u0430\u043A", "\u043F\u0438\u0434\u043E\u0440", "\u043F\u0438\u0434\u0430\u0440", "\u0433\u043E\u043D\u0434\u043E\u043D", "\u0448\u043B\u044E\u0445", "\u0434\u0435\u0440\u044C\u043C", "=\u0441\u0443\u043A\u0430", "=\u0441\u0443\u043A\u0438", "fuck", "shit", "bitch", "asshole"]
};
function matches(token, stem) {
  return stem.startsWith("=") ? token === stem.slice(1) : token.startsWith(stem.replace(/ё/g, "\u0435"));
}
function checkText(text) {
  if (text.length > 160) return { ok: false, reason: "too_long" };
  if (/https?:|www\.|\.(com|ru|net|org)\b/i.test(text)) return { ok: false, reason: "link" };
  if (looksPersonal(text)) return { ok: false, reason: "personal" };
  const squashed = norm(text).replace(/[^a-zа-я]/g, "");
  const tokens = norm(text).split(/[^a-zа-я]+/).filter(Boolean);
  for (const [cat, stems] of Object.entries(BLOCK)) {
    for (const stem of stems) {
      if (tokens.some((t) => matches(t, stem))) return { ok: false, reason: cat };
    }
  }
  for (const stem of ["\u043F\u043E\u0440\u043D\u043E", "\u0441\u0435\u043A\u0441", "\u0445\u0443\u0439", "\u043F\u0438\u0437\u0434", "\u0435\u0431\u0430\u0442", "fuck", "porn"]) {
    if (squashed.includes(stem) && !tokens.some((t) => t.includes(stem))) return { ok: false, reason: "obfuscated" };
  }
  return { ok: true };
}
var FEATURE_KEYS = [
  "outfit",
  "armor",
  "scales",
  "fur",
  "skin",
  "metal",
  "crystal",
  "look",
  "eyes",
  "horns",
  "helmet",
  "ears",
  "face",
  "teeth",
  "crown",
  "head",
  "wings",
  "tail",
  "claws",
  "fire",
  "spikes",
  "weapon",
  "cape",
  "theme",
  "marks",
  "extra"
];
var ARCHS = ["dragon", "robot", "warrior", "beast", "spirit"];
var clean = (s, max) => {
  if (typeof s !== "string") return null;
  const t = s.replace(/[\u0000-\u001f\u007f<>{}`]/g, " ").replace(/\s+/g, " ").trim();
  return t.length > 0 && t.length <= max ? t : null;
};
function color(c) {
  if (!c || typeof c !== "object") return void 0;
  const { name, hex } = c;
  const n = clean(name, 24);
  if (!n || typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return void 0;
  return { name: n, hex };
}
function sanitizeSpec(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, field: "spec", reason: "invalid" };
  const r = raw;
  const spec = { features: {} };
  const k = r.kind;
  if (k && typeof k === "object") {
    const nom = clean(k.nom, 40);
    const acc = clean(k.acc, 40) ?? "\u0433\u0435\u0440\u043E\u044F";
    if (!nom || !ARCHS.includes(String(k.arch))) return { ok: false, field: "kind", reason: "invalid" };
    const v = checkText(nom);
    if (!v.ok) return { ok: false, field: "kind", reason: v.reason };
    spec.kind = { nom, acc, arch: k.arch, exact: !!k.exact, human: !!k.human, custom: !!k.custom };
  } else return { ok: false, field: "kind", reason: "missing" };
  spec.main = color(r.main);
  spec.accent = color(r.accent);
  spec.eyes = color(r.eyes);
  if (r.style === "cinema" || r.style === "toon") spec.style = r.style;
  if (r.name !== void 0) {
    const n = clean(r.name, 24);
    if (n) {
      const v = checkText(n);
      if (!v.ok) return { ok: false, field: "name", reason: v.reason };
      spec.name = n;
    }
  }
  const f = r.features ?? {};
  for (const key of FEATURE_KEYS) {
    if (f[key] === void 0) continue;
    const phrase = clean(f[key], 120);
    if (!phrase) continue;
    const v = checkText(phrase);
    if (!v.ok) return { ok: false, field: `feature:${key}`, reason: v.reason };
    spec.features[key] = phrase;
  }
  return { ok: true, spec };
}

// server/handler.ts
var MAX_BODY = 45e5;
var FAL_HOST = /(^|\.)fal\.(media|ai|run)$/;
var MAX_IMAGE_CHARS = 8e6;
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
var MESSAGES = {
  moderation: "\u042D\u0442\u043E \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0434\u043B\u044F \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043E\u043F\u0438\u0441\u0430\u0442\u044C \u0433\u0435\u0440\u043E\u044F \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438.",
  blocked: "\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043E\u043F\u0438\u0441\u0430\u0442\u044C \u0433\u0435\u0440\u043E\u044F \u0447\u0443\u0442\u044C \u0438\u043D\u0430\u0447\u0435.",
  session_limit: "\u0412 \u044D\u0442\u043E\u043C \u0443\u0440\u043E\u043A\u0435 \u043B\u0438\u043C\u0438\u0442 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D.",
  ip_limit: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u043F\u043E\u043F\u044B\u0442\u043E\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0447\u0443\u0442\u044C \u043F\u043E\u0437\u0436\u0435.",
  daily_limit: "\u041D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0435 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0437\u0430\u0432\u0442\u0440\u0430.",
  busy: "\u0421\u0435\u0439\u0447\u0430\u0441 \u043C\u043D\u043E\u0433\u043E \u0436\u0435\u043B\u0430\u044E\u0449\u0438\u0445. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443.",
  duplicate: "\u042D\u0442\u043E\u0442 \u0437\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D. \u041F\u043E\u0434\u043E\u0436\u0434\u0438 \u043D\u0435\u043C\u043D\u043E\u0433\u043E.",
  store: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u043F\u043E\u0437\u0436\u0435.",
  disabled: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u0438\u043D\u043E\u043A \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.",
  upstream: "\u041D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  timeout: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0438 \u0437\u0430\u043D\u044F\u043B\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0435\u0449\u0451 \u0440\u0430\u0437.",
  bad_request: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441."
};
async function bodyText(req) {
  const pre = req.body;
  let text;
  if (pre === void 0 || pre === null) text = await readBody(req);
  else if (typeof pre === "string") text = pre;
  else if (Buffer.isBuffer(pre)) text = pre.toString("utf8");
  else text = JSON.stringify(pre);
  if (text.length > MAX_BODY) throw new Error("too_large");
  return text;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
async function falRunner(key) {
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: key });
  return async (model, input) => {
    const result = await fal.subscribe(model, { input, logs: false });
    return result.data;
  };
}
var mockRunner = async (_model, input) => {
  await new Promise((r) => setTimeout(r, 1500));
  const spec = input.__spec;
  if (!spec?.kind) return { images: [] };
  return { images: [{ url: svgToDataUrl(renderHeroSvg(spec, spec.kind.arch)) }] };
};
async function toDataUri(url, fetcher = fetch) {
  if (url.startsWith("data:image/")) return url;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !FAL_HOST.test(u.hostname)) return null;
    const r = await fetcher(u, { redirect: "error" });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > 6e6) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
function createApi(env2, opts = {}) {
  const cfg = readConfig(env2);
  const secret = cfg.key;
  const scrub = (m) => secret ? m.split(secret).join("***") : m;
  const store2 = opts.store ?? new MemoryStore(opts.usageFile === void 0 ? join(opts.dataDir ?? ".data", "fal-usage.json") : opts.usageFile);
  const signKey = createHmac("sha256", secret || "mock-secret").update("image-signature-v1").digest();
  const sign = (src) => createHmac("sha256", signKey).update(src).digest("hex");
  const verified = (src, sig) => {
    if (typeof src !== "string" || typeof sig !== "string" || !src.startsWith("data:image/") || src.length > MAX_IMAGE_CHARS) return false;
    const a = Buffer.from(sign(src));
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  let runner = opts.runner ?? null;
  const getRunner = async () => {
    if (runner) return runner;
    runner = cfg.mock ? mockRunner : await falRunner(cfg.key);
    return runner;
  };
  const codeOk = (req) => {
    if (!cfg.accessCode) return true;
    const given = Buffer.from(String(req.headers["x-access-code"] ?? ""));
    const need = Buffer.from(cfg.accessCode);
    return given.length === need.length && timingSafeEqual(given, need);
  };
  const sameOrigin = (req) => {
    const origin = req.headers.origin;
    if (!origin) return true;
    try {
      return new URL(origin).host === req.headers.host;
    } catch {
      return false;
    }
  };
  async function generate(req, res) {
    if (!cfg.enabled) return send(res, 503, { error: "disabled", message: MESSAGES.disabled });
    if (!codeOk(req)) return send(res, 403, { error: "disabled", message: MESSAGES.disabled });
    if (!sameOrigin(req)) return send(res, 403, { error: "bad_request", message: MESSAGES.bad_request });
    const sid = String(req.headers["x-session-id"] ?? "");
    if (!/^[a-z0-9-]{8,64}$/i.test(sid)) return send(res, 400, { error: "bad_request", message: MESSAGES.bad_request });
    let body;
    try {
      body = JSON.parse(await bodyText(req));
    } catch {
      return send(res, 400, { error: "bad_request", message: MESSAGES.bad_request });
    }
    const spec = sanitizeSpec(body.spec);
    if (!spec.ok) {
      const code = spec.reason === "invalid" || spec.reason === "missing" ? "bad_request" : "moderation";
      return send(res, 422, { error: code, field: spec.field, message: MESSAGES[code] });
    }
    const rid = String(req.headers["x-request-id"] ?? "");
    if (!/^[a-z0-9-]{16,64}$/i.test(rid)) return send(res, 400, { error: "bad_request", message: MESSAGES.bad_request });
    const mode = body.mode === "edit" ? "edit" : "create";
    let prompt = buildCreatePrompt(spec.spec);
    let model = cfg.model;
    const input = { aspect_ratio: "1:1", output_format: "webp", safety_tolerance: "1", sync_mode: true, num_images: 1 };
    let usedEdit = false;
    if (mode === "edit") {
      const prev = sanitizeSpec(body.prevSpec);
      if (!prev.ok) return send(res, 422, { error: "bad_request", message: MESSAGES.bad_request });
      const changes = diffSpecs(prev.spec, spec.spec);
      if (!changes.length) return send(res, 400, { error: "bad_request", message: MESSAGES.bad_request });
      const pi = body.prevImage;
      if (pi && verified(pi.src, pi.sig)) {
        prompt = buildEditPrompt(changes, spec.spec);
        model = cfg.editModel;
        input.image_urls = [pi.src];
        usedEdit = true;
      }
    }
    input.prompt = prompt;
    if (cfg.mock) input.__spec = spec.spec;
    const fwd = cfg.trustProxy ? String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() : "";
    const ip = fwd || (req.socket.remoteAddress ?? "unknown");
    try {
      if (!await store2.once(rid)) return send(res, 409, { error: "duplicate", message: MESSAGES.duplicate });
    } catch {
      return send(res, 503, { error: "disabled", message: MESSAGES.store });
    }
    let slot;
    try {
      slot = await store2.reserve(ip, sid, cfg);
    } catch (e) {
      console.error("[store] \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E:", e instanceof Error ? e.message : "unknown");
      return send(res, 503, { error: "disabled", message: MESSAGES.store });
    }
    if (!slot.ok) return send(res, 429, { error: slot.code, message: MESSAGES[slot.code] });
    let refund = false;
    try {
      const run = await getRunner();
      const result = await Promise.race([
        run(model, input),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), cfg.timeoutMs))
      ]);
      const raw = result.images?.[0]?.url;
      const src = raw ? await toDataUri(raw, opts.fetcher) : null;
      if (!src || src.length > MAX_IMAGE_CHARS) {
        return send(res, 422, { error: "blocked", message: MESSAGES.blocked });
      }
      return send(res, 200, {
        src,
        sig: sign(src),
        model,
        mock: cfg.mock || void 0,
        edited: usedEdit,
        sessionRemaining: Math.max(0, cfg.sessionLimit - await store2.sessionUsed(sid).catch(() => 0)),
        ...cfg.debug ? { debugPrompt: prompt } : {}
      });
    } catch (e) {
      refund = true;
      const timeout = e instanceof Error && e.message === "timeout";
      console.error("[fal] \u043E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438:", timeout ? "timeout" : e instanceof Error ? scrub(`${e.name}: ${e.message}`).slice(0, 300) : "unknown");
      return send(res, timeout ? 504 : 502, { error: timeout ? "timeout" : "upstream", message: MESSAGES[timeout ? "timeout" : "upstream"] });
    } finally {
      await store2.release(ip, sid, refund).catch(() => {
      });
    }
  }
  const status = async (req, res) => {
    const sid = String(req.headers["x-session-id"] ?? "");
    let used = 0;
    if (/^[a-z0-9-]{8,64}$/i.test(sid)) used = await store2.sessionUsed(sid).catch(() => 0);
    send(res, 200, {
      enabled: cfg.enabled && codeOk(req),
      reason: cfg.enabled ? void 0 : cfg.reason,
      // подробности для диагностики: только состояния, без значений
      diag: cfg.enabled ? void 0 : { key: cfg.keyState, redis: !cfg.storeMissing },
      demoAllowed: cfg.allowDemo,
      locked: cfg.enabled && !codeOk(req) ? true : void 0,
      mock: cfg.mock || void 0,
      sessionLimit: cfg.sessionLimit,
      sessionRemaining: Math.max(0, cfg.sessionLimit - used)
    });
  };
  const middleware = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0];
    if (url === "/api/status" && req.method === "GET") return void status(req, res);
    if (url === "/api/generate" && req.method === "POST") {
      void generate(req, res).catch((e) => {
        console.error("[api] \u043D\u0435\u043E\u0431\u0440\u0430\u0431\u043E\u0442\u0430\u043D\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430:", e instanceof Error ? e.message : e);
        if (!res.headersSent) send(res, 500, { error: "upstream", message: MESSAGES.upstream });
      });
      return;
    }
    if (url.startsWith("/api/")) return send(res, 404, { error: "bad_request" });
    next();
  };
  return { middleware, config: cfg, store: store2 };
}

// serverless/entry.ts
var env = { ...process.env, FAL_TRUST_PROXY: "true" };
env.FAL_ALLOW_DEMO ??= "false";
var store = upstashFromEnv(env);
if (!store && env.FAL_MOCK !== "1") {
  console.error("[fal] Redis (Upstash) \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D: \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430");
  env.FAL_NO_STORE = "1";
}
var api = createApi(env, store ? { store } : { usageFile: null });
function handler(req, res) {
  api.middleware(req, res, () => {
    res.statusCode = 404;
    res.end("Not found");
  });
}
export {
  handler as default
};
