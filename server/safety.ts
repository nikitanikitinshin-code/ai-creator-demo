import type { ColorRef, FeatureKey, KindInfo, Spec } from '../src/types'
import { looksPersonal } from '../src/lib/nlu'

/**
 * Серверная проверка всего, что ребёнок мог написать. Фильтры модели — только последний рубеж:
 * здесь мы сами решаем, что вообще можно отправлять во внешний сервис.
 */

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е')

// основы слов (RU) и целые слова (EN). «=» — только точное совпадение.
const BLOCK: Record<string, string[]> = {
  sexual: ['секс', 'порно', 'эрот', 'голый', 'голая', 'голые', 'обнажен', 'раздет', 'интим', '=sex', 'porn', 'nude', 'naked', 'nsfw', 'erotic'],
  violence: ['кровь', 'кровав', 'крови', 'убий', 'убить', 'убит', 'расчлен', 'труп', 'пытк', 'казн', 'изнасил', 'gore', 'blood', 'murder', 'kill', 'torture', 'corpse'],
  weapons: ['пистолет', 'револьвер', 'автомат', 'винтовк', 'ружье', 'ружья', 'снайпер', 'гранат', 'бомб', 'пулемет', 'пулемёт', '=gun', 'rifle', 'pistol', 'grenade', 'bomb'],
  drugs: ['наркот', 'героин', 'кокаин', 'марихуан', 'травк', 'сигарет', 'вейп', 'водк', 'алкогол', 'пиво', 'пьян', 'cocaine', 'heroin', 'weed', 'vodka', 'alcohol'],
  selfharm: ['суицид', 'самоубий', 'повесит', 'порез', 'suicide'],
  hate: ['нацист', 'гитлер', 'свастик', 'террорист', 'экстремист', 'фашист', 'nazi', 'hitler', 'terror'],
  profanity: ['хуй', 'хуе', 'хуя', 'пизд', 'бляд', 'блят', 'ебан', 'ебат', 'ебл', 'залуп', 'мудак', 'пидор', 'пидар', 'гондон', 'шлюх', 'дерьм', '=сука', '=суки', 'fuck', 'shit', 'bitch', 'asshole'],
}

function matches(token: string, stem: string): boolean {
  return stem.startsWith('=') ? token === stem.slice(1) : token.startsWith(stem.replace(/ё/g, 'е'))
}

export type Verdict = { ok: true } | { ok: false; reason: string }

/** Проверка одной текстовой строки. */
export function checkText(text: string): Verdict {
  if (text.length > 160) return { ok: false, reason: 'too_long' }
  if (/https?:|www\.|\.(com|ru|net|org)\b/i.test(text)) return { ok: false, reason: 'link' }
  if (looksPersonal(text)) return { ok: false, reason: 'personal' }
  // склеенные «пор.но», «с е к с» и подобное
  const squashed = norm(text).replace(/[^a-zа-я]/g, '')
  const tokens = norm(text).split(/[^a-zа-я]+/).filter(Boolean)
  for (const [cat, stems] of Object.entries(BLOCK)) {
    for (const stem of stems) {
      if (tokens.some((t) => matches(t, stem))) return { ok: false, reason: cat }
    }
  }
  for (const stem of ['порно', 'секс', 'хуй', 'пизд', 'ебат', 'fuck', 'porn']) {
    if (squashed.includes(stem) && !tokens.some((t) => t.includes(stem))) return { ok: false, reason: 'obfuscated' }
  }
  return { ok: true }
}

const FEATURE_KEYS: FeatureKey[] = [
  'outfit', 'armor', 'scales', 'fur', 'skin', 'metal', 'crystal', 'look', 'eyes', 'horns', 'helmet', 'ears', 'face', 'teeth', 'crown', 'head',
  'wings', 'tail', 'claws', 'fire', 'spikes', 'weapon', 'cape', 'theme', 'marks', 'extra',
]
const ARCHS = ['dragon', 'robot', 'warrior', 'beast', 'spirit']

export type Sanitized = { ok: true; spec: Spec } | { ok: false; field: string; reason: string }

const clean = (s: unknown, max: number): string | null => {
  if (typeof s !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/[\u0000-\u001f\u007f<>{}`]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.length > 0 && t.length <= max ? t : null
}

function color(c: unknown): ColorRef | undefined {
  if (!c || typeof c !== 'object') return undefined
  const { name, hex } = c as Record<string, unknown>
  const n = clean(name, 24)
  if (!n || typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined
  return { name: n, hex }
}

/**
 * Приводит пришедший от браузера объект к безопасному Spec: только известные поля, ограниченная длина,
 * проверка каждой строки. Возвращает поле, которое не прошло, чтобы клиент мог убрать именно его.
 */
export function sanitizeSpec(raw: unknown): Sanitized {
  if (!raw || typeof raw !== 'object') return { ok: false, field: 'spec', reason: 'invalid' }
  const r = raw as Record<string, unknown>
  const spec: Spec = { features: {} }

  const k = r.kind as Record<string, unknown> | undefined
  if (k && typeof k === 'object') {
    const nom = clean(k.nom, 40)
    const acc = clean(k.acc, 40) ?? 'героя'
    if (!nom || !ARCHS.includes(String(k.arch))) return { ok: false, field: 'kind', reason: 'invalid' }
    const v = checkText(nom)
    if (!v.ok) return { ok: false, field: 'kind', reason: v.reason }
    spec.kind = { nom, acc, arch: k.arch as KindInfo['arch'], exact: !!k.exact, human: !!k.human, custom: !!k.custom }
  } else return { ok: false, field: 'kind', reason: 'missing' }

  spec.main = color(r.main)
  spec.accent = color(r.accent)
  spec.eyes = color(r.eyes)
  if (r.style === 'cinema' || r.style === 'toon') spec.style = r.style

  if (r.name !== undefined) {
    const n = clean(r.name, 24)
    if (n) {
      const v = checkText(n)
      if (!v.ok) return { ok: false, field: 'name', reason: v.reason }
      spec.name = n
    }
  }

  const f = (r.features ?? {}) as Record<string, unknown>
  for (const key of FEATURE_KEYS) {
    if (f[key] === undefined) continue
    const phrase = clean(f[key], 120)
    if (!phrase) continue
    const v = checkText(phrase)
    if (!v.ok) return { ok: false, field: `feature:${key}`, reason: v.reason }
    spec.features[key] = phrase
  }
  return { ok: true, spec }
}
