import type { Arch, ColorRef, Spec } from '../../types'
import { type ArtParams, L } from './common'
import { beast } from './beast'
import { dragon } from './dragon'
import { robot } from './robot'
import { spirit } from './spirit'
import { warrior } from './warrior'

const DEFAULTS: Record<Arch, { main: string; accent: string; eye: string }> = {
  dragon: { main: '#3d2f4f', accent: '#d5a63a', eye: '#ffb21a' },
  robot: { main: '#5b6678', accent: '#d9dfe8', eye: '#39e1ff' },
  warrior: { main: '#8e99ac', accent: '#c93a3a', eye: '#7fe9ff' },
  beast: { main: '#5d6677', accent: '#7cd3ff', eye: '#ffd23f' },
  spirit: { main: '#6d5be8', accent: '#ffe27a', eye: '#a8f4ff' },
}

function hornScale(phrase: string | undefined, dflt: number): number {
  if (!phrase) return dflt
  if (/огромн|гигант|больш|длинн/.test(phrase)) return 1.3
  if (/маленьк|небольш|коротк|крошеч/.test(phrase)) return 0.62
  return 1
}

export function paramsFor(spec: Spec, arch: Arch): ArtParams {
  const d = DEFAULTS[arch]
  const pick = (c: ColorRef | undefined, fallback: string) => c?.hex ?? fallback
  const main = pick(spec.main, d.main)
  let accent = pick(spec.accent, spec.main ? L(spec.main.hex, 0.3) : d.accent)
  if (!spec.accent && spec.main && arch === 'dragon') accent = d.accent
  const f = spec.features
  const horns = f.horns ? hornScale(f.horns, 1) : arch === 'dragon' ? 1 : 0
  const seed = (spec.name ?? spec.kind?.nom ?? 'hero').split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)
  return {
    arch,
    main,
    accent,
    eye: pick(spec.eyes, d.eye),
    style: spec.style ?? 'cinema',
    horns,
    wings: !!f.wings || arch === 'dragon',
    armor: !!(f.armor || f.metal || f.helmet),
    fire: !!f.fire,
    seed: Math.abs(seed) || 1,
  }
}

const RENDER: Record<Arch, (p: ArtParams) => string> = { dragon, robot, warrior, beast, spirit }

export function renderHeroSvg(spec: Spec, arch: Arch): string {
  const p = paramsFor(spec, arch)
  return RENDER[arch](p)
}

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
