import type { Arch, Chip, Conv, FeatureKey, Q, Spec, Sticker } from '../types'
import { customKind, isEmptyParse, parse, parseHeroName, type Parsed } from './nlu'

/**
 * Сценарная логика наставника: решает, что уже известно о герое,
 * о чём спросить дальше и когда достаточно деталей для первого изображения.
 */

export const MAX_QUESTIONS = 4

export const newConv = (): Conv => ({
  spec: { features: {} },
  phase: 'collect',
  asked: [],
  pending: null,
  confused: 0,
  taught: [],
  changes: 0,
})

// ---------- Категории деталей ----------
const SURFACE: FeatureKey[] = ['outfit', 'armor', 'scales', 'fur', 'skin', 'metal', 'crystal', 'look']
const HEAD: FeatureKey[] = ['eyes', 'horns', 'helmet', 'ears', 'face', 'teeth', 'crown', 'head']
const EXTRA: FeatureKey[] = ['wings', 'tail', 'claws', 'fire', 'spikes', 'weapon', 'cape', 'theme', 'marks', 'extra']

const hasAny = (s: Spec, keys: FeatureKey[]) => keys.some((k) => !!s.features[k])
export const hasColor = (s: Spec) => !!(s.main || s.accent)
export const hasSurface = (s: Spec) => hasAny(s, SURFACE)
export const hasHead = (s: Spec) => hasAny(s, HEAD) || !!s.eyes
export const hasExtra = (s: Spec) => hasAny(s, EXTRA)

/** Сколько из 5 групп описано: цвет, материал, голова, стиль, дополнительные детали. */
export function filledCount(s: Spec): number {
  return [hasColor(s), hasSurface(s), hasHead(s), !!s.style, hasExtra(s)].filter(Boolean).length
}

const isFilled = (q: Q, s: Spec) =>
  q === 'look' ? hasColor(s) || hasSurface(s) : q === 'head' ? hasHead(s) : q === 'style' ? !!s.style : hasExtra(s)

// ---------- Названия для реплик ----------
const NOUN: Partial<Record<FeatureKey, string>> = {
  armor: 'доспехи', scales: 'чешую', fur: 'шерсть', skin: 'кожу', metal: 'металл', crystal: 'кристаллы',
  eyes: 'глаза', horns: 'рога', helmet: 'шлем', ears: 'уши', face: 'морду', teeth: 'клыки', crown: 'корону',
  wings: 'крылья', tail: 'хвост', claws: 'когти', fire: 'огонь', spikes: 'шипы', weapon: 'оружие', cape: 'плащ',
  theme: 'детали', marks: 'узоры', outfit: 'одежду',
}
export const STYLE_NAME = { cinema: 'реалистичный, как в кино', toon: 'стилизованный, как в мультфильме' } as const

interface Diff { key: string; label: string; short: string; isNew: boolean; prev?: string }

function applyParsed(spec: Spec, p: Parsed): Diff[] {
  const diffs: Diff[] = []
  const set = <T extends { name: string }>(key: 'main' | 'accent' | 'eyes', v: T | undefined, label: string) => {
    if (!v) return
    const old = spec[key]
    if (old?.name === v.name) return
    ;(spec as unknown as Record<string, unknown>)[key] = v
    diffs.push({ key, label: `${label} — ${v.name}`, short: key === 'main' ? 'цвет' : key === 'accent' ? 'акценты' : 'глаза', isNew: !old, prev: old?.name })
  }
  if (p.kind && (!spec.kind || (!p.kind.generic && spec.kind.nom !== p.kind.nom))) {
    diffs.push({ key: 'kind', label: `герой — ${p.kind.nom}`, short: 'тип героя', isNew: !spec.kind, prev: spec.kind?.nom })
    spec.kind = p.kind
  }
  const mentioned = (c?: { name: string }) => !!c && Object.values(p.features).some((ph) => ph?.includes(c.name.slice(0, 4)))
  set('main', p.main, 'основной цвет')
  set('accent', p.accent, 'акцентный цвет')
  set('eyes', p.eyes, 'цвет глаз')
  // цвет, уже названный внутри фразы («золотые доспехи»), отдельной строкой не повторяем
  for (let i = diffs.length - 1; i >= 0; i--) {
    const d = diffs[i]
    if ((d.key === 'accent' && mentioned(p.accent)) || (d.key === 'eyes' && p.features.eyes && mentioned(p.eyes))) diffs.splice(i, 1)
  }
  for (const [k, phrase] of Object.entries(p.features) as [FeatureKey, string][]) {
    if (spec.features[k] === phrase) continue
    if (k === 'outfit' && spec.features.outfit && !p.changeIntent) {
      if (!spec.features.outfit.includes(phrase)) {
        diffs.push({ key: k, label: phrase, short: NOUN[k] ?? 'деталь', isNew: true })
        spec.features.outfit = `${spec.features.outfit}, ${phrase}`
      }
      continue
    }
    if (k === 'theme' && spec.features.theme) {
      if (!spec.features.theme.includes(phrase)) {
        diffs.push({ key: k, label: phrase, short: 'детали', isNew: true })
        spec.features.theme = `${spec.features.theme}, ${phrase}`
      }
      continue
    }
    diffs.push({ key: k, label: phrase, short: NOUN[k] ?? 'деталь', isNew: !spec.features[k], prev: spec.features[k] })
    spec.features[k] = phrase
  }
  if (p.style && spec.style !== p.style) {
    diffs.push({ key: 'style', label: `стиль — ${STYLE_NAME[p.style]}`, short: 'стиль', isNew: !spec.style, prev: spec.style ? STYLE_NAME[spec.style] : undefined })
    spec.style = p.style
  }
  if (p.name && spec.name !== p.name) {
    diffs.push({ key: 'name', label: `имя — ${p.name}`, short: 'имя', isNew: !spec.name })
    spec.name = p.name
  }
  return diffs
}

const listRu = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} и ${items[items.length - 1]}`)
const uniq = <T,>(a: T[]) => [...new Set(a)]
const archOf = (s: Spec): Arch | undefined => s.kind?.arch
/** Ключ формулировок: для людей — одежда, для придуманных ребёнком слов — нейтральные вопросы. */
const qKey = (s: Spec): Arch | 'human' | 'any' => (s.kind?.custom ? 'any' : s.kind?.human ? 'human' : s.kind?.arch ?? 'any')

// ---------- Вопросы и подсказки ----------
const QUESTIONS: Record<Q, Record<Arch | 'human' | 'any', string>> = {
  look: {
    dragon: 'Какого он будет цвета? Может, у него будет необычная кожа, чешуя или металлические доспехи?',
    robot: 'Какого цвета будет его корпус? Может, он будет из тёмного металла, с яркими вставками или в боевой броне?',
    beast: 'Какого цвета будет его шерсть? Может, у него будут необычные узоры, броня или светящиеся метки?',
    warrior: 'Какие у него будут доспехи: цвет и материал? Может, золото, тёмная сталь или что-то необычное?',
    spirit: 'Из чего он состоит и какого цвета? Может, светящийся туман, кристаллы или пламя?',
    any: 'Какого он будет цвета? Из чего он сделан или чем покрыт: кожа, шерсть, металл, чешуя?',
    human: 'Во что он одет и какого цвета? Может, костюм, плащ или необычная одежда?',
  },
  head: {
    dragon: 'А теперь представь его голову: огромные рога, светящиеся глаза или что-то совершенно другое?',
    robot: 'А теперь представь его лицо: какие у него глаза или экран? Может, антенны, визор или рога-лезвия?',
    beast: 'А теперь представь его морду: какие у него глаза, клыки или рога?',
    warrior: 'А теперь шлем и взгляд: как выглядит шлем и что видно в прорези — светящиеся глаза, рога, плюмаж?',
    spirit: 'А теперь представь его лицо: какие у него глаза? Может, корона, рога или сияние?',
    any: 'А теперь представь его голову: какие у него глаза? Может, рога, корона или что-то совершенно другое?',
    human: 'А теперь представь лицо и голову: какие у него волосы и глаза? Может, маска, шлем или корона?',
  },
  style: {
    dragon: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    robot: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    beast: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    warrior: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    spirit: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    any: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
    human: 'Остался важный момент. Как ты хочешь его увидеть: реалистичным, как в кино, или стилизованным, как в современном мультфильме?',
  },
  extra: {
    dragon: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: крылья, хвост, огонь или что-то своё?',
    robot: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: оружие, крылья, необычные руки или что-то своё?',
    beast: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: хвост, когти, шипы или что-то своё?',
    warrior: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: оружие, плащ, щит или что-то своё?',
    spirit: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: крылья, хвост, узоры света или что-то своё?',
    any: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: крылья, хвост, оружие или что-то своё?',
    human: 'Есть ли ещё деталь, которая сделает его узнаваемым с первого взгляда: оружие, плащ, питомец или что-то своё?',
  },
}

const CHIPS: Record<Q, Record<Arch | 'human' | 'any', string[]>> = {
  look: {
    dragon: ['Чёрный, с золотыми доспехами', 'Изумрудная чешуя и серебряные шипы'],
    robot: ['Тёмный металл с красными вставками', 'Белый корпус с неоновой подсветкой'],
    beast: ['Серебристая шерсть со светящимися метками', 'Тёмная шерсть и стальная броня'],
    warrior: ['Золотые доспехи', 'Чёрная сталь и красный плащ'],
    spirit: ['Голубой светящийся туман', 'Фиолетовые кристаллы'],
    any: ['Чёрный, с золотыми доспехами', 'Серебристый, со светящимися метками'],
    human: ['Красный костюм и тёмный плащ', 'Золотые доспехи'],
  },
  head: {
    dragon: ['Красные глаза и большие рога', 'Светящиеся голубые глаза'],
    robot: ['Голубые светящиеся глаза и антенны', 'Красный визор'],
    beast: ['Жёлтые глаза и острые клыки', 'Светящиеся голубые глаза'],
    warrior: ['Шлем с рогами и светящимися глазами', 'Золотой шлем'],
    spirit: ['Большие светящиеся глаза', 'Корона из света'],
    any: ['Светящиеся глаза и рога', 'Красные глаза'],
    human: ['Голубые глаза и маска', 'Корона и тёмные волосы'],
  },
  style: {
    dragon: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    robot: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    beast: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    warrior: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    spirit: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    any: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
    human: ['Реалистичный, как в кино', 'Стилизованный, как в мультфильме'],
  },
  extra: {
    dragon: ['Металлические крылья', 'Огненное дыхание'],
    robot: ['Крылья-лезвия', 'Встроенное оружие'],
    beast: ['Длинный хвост', 'Острые когти'],
    warrior: ['Красный плащ', 'Большой щит'],
    spirit: ['Светящиеся крылья', 'Узоры из света'],
    any: ['Большие крылья', 'Острые когти'],
    human: ['Большой плащ', 'Светящийся меч'],
  },
}

const ask = (q: Q, s: Spec) => QUESTIONS[q][qKey(s)]

const EDIT_EXAMPLES = ['Пусть глаза будут голубыми', 'Добавь большие крылья', 'Сделай стиль мультяшным']
const NAMES: Record<Arch, string[]> = {
  dragon: ['Рэйн', 'Угольок'],
  robot: ['Бип', 'Нова-7'],
  warrior: ['Рассвет', 'Атлас'],
  beast: ['Лунар', 'Искорка'],
  spirit: ['Люмо', 'Сияна'],
}

export function chipsFor(c: Conv): Chip[] {
  const s = c.spec
  if (c.phase === 'naming') {
    return [...NAMES[s.kind?.human ? 'warrior' : s.kind?.arch ?? 'beast'].map((t) => ({ label: t, mode: 'fill' as const, text: t })), { label: 'Без имени', mode: 'send' as const, text: 'Без имени' }]
  }
  if (c.phase !== 'collect') {
    if (c.editing) {
      return [
        ...EDIT_EXAMPLES.map((t) => ({ label: t, mode: 'fill' as const, text: t })),
        { label: 'Мне нравится', mode: 'send' as const, text: 'Мне нравится' },
      ]
    }
    return [
      { label: 'Хочу изменить', mode: 'send', text: 'Хочу изменить' },
      { label: 'Мне нравится', mode: 'send', text: 'Мне нравится' },
    ]
  }
  if (!s.kind) {
    return ['Дракон', 'Робот', 'Волшебное существо'].map((t) => ({ label: t, mode: 'fill' as const, text: `Хочу создать ${t.toLowerCase()}` }))
  }
  if (!c.pending) return [{ label: 'Попробовать ещё раз', mode: 'send', text: 'Создавай' }]
  const fills = CHIPS[c.pending][qKey(s)].map((t) => ({ label: t, mode: 'fill' as const, text: t }))
  return c.pending === 'style' ? fills : [...fills, { label: 'Придумаю сам', mode: 'focus' as const }]
}

// ---------- Запрос для ИИ ----------
export function buildPrompt(s: Spec): string {
  const lead =
    s.style === 'cinema' ? 'Реалистичный кинематографичный кадр'
    : s.style === 'toon' ? 'Стилизованная 3D-иллюстрация в духе современного мультфильма'
    : 'Детализированный концепт-арт'
  const kind = s.kind?.nom ?? 'персонаж'
  const nameStr = s.name ? ` по имени ${s.name}` : ''
  const colors = [
    s.main ? `основной цвет — ${s.main.name}` : '',
    s.accent ? `акценты — ${s.accent.name}` : '',
    s.eyes && !s.features.eyes ? `цвет глаз — ${s.eyes.name}` : '',
  ].filter(Boolean)
  const order: FeatureKey[] = [...SURFACE, ...HEAD, ...EXTRA]
  const details = order.map((k) => s.features[k]).filter(Boolean) as string[]
  const parts = [`${lead}: ${kind}${nameStr}.`]
  if (colors.length) parts.push(`Цвета: ${colors.join(', ')}.`)
  if (details.length) parts.push(`Детали: ${uniq(details).join(', ')}.`)
  parts.push(
    s.style === 'toon'
      ? 'Освещение: яркое, мягкое. Композиция: портрет по грудь, чистые цвета, выразительная форма.'
      : 'Освещение: драматичный контрастный свет, глубокие тени. Композиция: портрет по грудь, высокая детализация.',
  )
  return parts.join(' ')
}

// ---------- Ход диалога ----------
export interface Turn {
  conv: Conv
  say: string[]
  /** нужно перерисовать героя по правке (только при включённой генерации) */
  regenerate?: boolean
  /** к последней реплике прикрепить ссылку «Посмотреть мой AI-запрос» */
  promptNote?: boolean
  generate?: boolean
  upsell?: boolean
}

const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length]

function nextQuestion(c: Conv): Q | null {
  const s = c.spec
  if (filledCount(s) >= 4 || c.asked.length >= MAX_QUESTIONS) return null
  const order: Q[] = ['look', 'head', 'style', 'extra']
  for (const q of order) {
    if (isFilled(q, s)) continue
    if (c.asked.includes(q)) continue
    return q
  }
  return null
}

export const REVIEW_PROMPT = 'Вот твой герой. Посмотри внимательно: что получилось так, как ты хотел, а что стоит изменить?'

export function readyLine(c: Conv, rich: boolean): string {
  const who = c.spec.kind?.acc ?? 'героя'
  if (rich) {
    const labels = describeFilled(c.spec)
    return `Ты описал ${listRu(labels)}. Этого достаточно, чтобы создать твоего ${who}.`
  }
  return `Отлично. Теперь у нас достаточно деталей, чтобы создать твоего ${who}.`
}

export function describeFilled(s: Spec): string[] {
  const out: string[] = []
  if (hasColor(s)) out.push('цвет')
  const surf = SURFACE.find((k) => s.features[k])
  if (surf) out.push(NOUN[surf] ?? 'материал')
  if (s.eyes || s.features.eyes) out.push('глаза')
  if (s.features.horns) out.push('рога')
  const ex = EXTRA.find((k) => k !== 'theme' && s.features[k])
  if (ex) out.push(NOUN[ex] ?? 'детали')
  if (s.style) out.push('стиль')
  return uniq(out)
}

export function respond(prev: Conv, raw: string, seed = 0, live = false): Turn {
  const c: Conv = JSON.parse(JSON.stringify(prev))
  const text = raw.trim()
  const p = parse(text, { pending: c.pending, spec: c.spec })
  if (c.phase === 'naming') {
    if (!(p.changeIntent && !isEmptyParse(p))) return respondNaming(c, text)
    c.phase = 'review'
  }
  const unknownKind = !c.spec.kind && !p.kind
  const before = JSON.stringify(c.spec)
  const diffs = applyParsed(c.spec, p)
  if (!c.spec.kind && unknownKind && !p.positive && !p.wantChange && !p.help) {
    const ck = customKind(text)
    if (ck) {
      c.spec.kind = ck
      diffs.unshift({ key: 'kind', label: `герой — ${ck.nom}`, short: 'тип героя', isNew: true })
    }
  }
  const changed = JSON.stringify(c.spec) !== before
  const meaningful = diffs.filter((d) => d.key !== 'kind' && d.key !== 'name')
  const swapped = diffs.filter((d) => !d.isNew)
  const turn = (say: string[], extra: Partial<Turn> = {}): Turn => ({ conv: c, say, ...extra })

  // ----- после первой генерации: улучшение героя -----
  if (c.phase !== 'collect') {
    if (changed) {
      c.phase = 'review'
      c.editing = false
      c.changes += 1
      const note =
        c.changes === 1
          ? 'В демо-версии картинка не перерисовывается, поэтому она осталась прежней, а запрос обновился. Рисунок по новому запросу станет возможен после подключения генерации.\n\nСовет: чем точнее правка, тем ближе результат. Называй часть героя и как она должна выглядеть.'
          : 'Картинка в демо остаётся прежней, но запрос уже обновлён.'
      const list = diffs.map((d) => `${d.label}${d.prev ? ` (было: ${d.prev})` : ''}`).join('; ')
      if (live) {
        const tip = c.changes === 1 ? '\n\nСовет: чем точнее правка, тем ближе результат. Называй часть героя и как она должна выглядеть.' : ''
        return turn(
          [`${p.styleNote ? p.styleNote + '\n\n' : ''}Принял: ${list}. Запрос обновлён.\n\nСейчас обновлю героя: прошлая версия берётся за основу, чтобы он остался узнаваемым.${tip}`],
          { promptNote: true, regenerate: true },
        )
      }
      return turn(
        [`${p.styleNote ? p.styleNote + '\n\n' : ''}Принял: ${list}. Запрос обновлён.\n\n${note}`, 'Хочешь изменить что-то ещё или герой готов?'],
        { promptNote: true },
      )
    }
    if (p.help) {
      c.editing = true
      return turn(['Можно изменить цвет, глаза, рога, броню, крылья или стиль. Выбери пример ниже или опиши своими словами.'])
    }
    if (p.positive && !p.wantChange) {
      if (c.phase === 'finished') {
        return turn(['Герой готов. Нажми «Информация для родителей», чтобы вместе выбрать следующий этап.'])
      }
      c.editing = false
      if (!c.spec.name && !c.namingAsked) {
        c.namingAsked = true
        c.phase = 'naming'
        return turn(['Прежде чем идти дальше: как зовут твоего героя? Придумай имя именно для него, не своё настоящее.'])
      }
      c.phase = 'finished'
      return turn([], { upsell: true })
    }
    if (p.wantChange) {
      c.editing = true
      return turn(['Что именно хочешь изменить? Опиши своими словами или выбери пример ниже.'])
    }
    if (p.nonsense) return turn(['Не совсем понял. Скажи, что изменить у героя: цвет, глаза, рога, броню или стиль?'])
    c.editing = true
    return turn(['Я пока не уверен, что именно нужно изменить. Назови часть героя и как она должна выглядеть. Можно выбрать пример ниже.'])
  }

  // ----- сбор деталей -----
  if (p.help && !changed) {
    const lead = c.spec.kind
      ? 'Бывает. Посмотри на подсказки ниже: можно взять любую и изменить по-своему, или просто опиши то, что первым пришло в голову.'
      : 'Бывает. Можно начать с подсказок ниже: выбери любую и измени по-своему.'
    return turn([lead])
  }

  let skipped = false
  if (!changed && c.pending && (p.skip || (p.nonsense && c.confused >= 1))) {
    skipped = true
  } else if (!changed && p.nonsense) {
    c.confused += 1
    if (!c.spec.kind) return turn(['Не совсем понял. Кого ты хочешь создать? Например: дракона, робота или волшебное существо.'])
    const line: Record<Q, string> = {
      look: 'Не совсем понял. Попробуй описать, какого цвета и из чего будет твой герой.',
      head: 'Не совсем понял. Попробуй описать, какие глаза будут у твоего героя.',
      style: 'Не совсем понял. Выбери: реалистичный, как в кино, или стилизованный, как в мультфильме?',
      extra: 'Не совсем понял. Какая ещё деталь будет у героя: крылья, хвост, оружие?',
    }
    return turn([line[c.pending ?? 'look']])
  }

  let noteLine = ''
  if (!changed && !skipped && c.spec.kind && c.pending && !p.positive && !p.wantChange && !p.finish && isEmptyParse(p)) {
    // свободное описание, которое словарь не разобрал: сохраняем как есть и говорим об этом
    const phrase = text.replace(/[.!\s]+$/g, '')
    const key: FeatureKey = c.pending === 'look' ? 'look' : c.pending === 'head' ? 'head' : 'extra'
    if (c.pending !== 'style' && phrase.length <= 140) {
      c.spec.features[key] = phrase[0].toLowerCase() + phrase.slice(1)
      noteLine = `Записал это как есть: «${phrase}».`
      diffs.push({ key, label: phrase, short: 'деталь', isNew: true })
    } else if (c.pending === 'style') {
      return turn(['Не уверен, что понял. Выбери: реалистичный, как в кино, или стилизованный, как в мультфильме?'])
    }
  }
  if (diffs.length || skipped) c.confused = 0

  if (!c.spec.kind) {
    return turn(['Кого ты хочешь создать? Например: дракона, робота или волшебное существо. Расскажи своими словами.'])
  }

  const pendingOpen = c.pending && !isFilled(c.pending, c.spec) && !skipped
  const richStart = c.asked.length === 0 && filledCount(c.spec) >= 4
  let reaction = ''
  const swappedLabels = swapped.filter((d) => d.key !== 'kind').map((d) => d.label)
  const fresh = meaningful.filter((d) => d.isNew)

  if (swappedLabels.length) reaction = `Поменял: ${diffs.filter((d) => !d.isNew && d.key !== 'kind').map((d) => `${d.label}${d.prev ? ` (было: ${d.prev})` : ''}`).join('; ')}.`
  else if (skipped) reaction = 'Хорошо, пока пропустим. Детали можно будет поправить после первой версии.'
  else if (noteLine) reaction = noteLine
  else if (diffs.some((d) => d.key === 'name')) reaction = `Запомнил имя: ${c.spec.name}.`
  else if (fresh.length >= 2 && c.asked.length > 0) {
    const hasPhrase = fresh.some((d) => !['main', 'accent', 'eyes', 'style'].includes(d.key))
    const labels = uniq(fresh.filter((d) => !(d.key === 'accent' && hasPhrase)).map((d) => d.short))
    reaction = pick(['Уже интереснее.', 'Образ становится яснее.', 'Хорошо, картина проясняется.'], seed)
    if (!c.taught.includes('detail')) {
      c.taught.push('detail')
      reaction += `\n\nТы добавил ${listRu(labels)}. Теперь искусственному интеллекту гораздо проще представить твоего героя.`
    }
  } else if (fresh.length === 1 && c.asked.length > 0) {
    reaction = `Принял: ${fresh[0].label}.`
  }

  if (p.styleNote) reaction = reaction ? `${p.styleNote} ${reaction}` : p.styleNote

  if (p.finish) return finish(c, reaction)

  // вопрос, на который ответа ещё нет, — спрашиваем повторно после изменения
  if (pendingOpen && changed && !noteLine) {
    return turn([`${reaction ? reaction + ' ' : ''}Вернёмся к вопросу. ${ask(c.pending!, c.spec).replace(/^А теперь п/, 'П')}`])
  }

  if (skipped) c.pending = null
  const q = nextQuestion(c)
  if (!q) return finish(c, reaction, richStart)

  c.pending = q
  c.asked.push(q)
  const intro =
    c.asked.length === 1 && !reaction
      ? 'Отлично. Давай сделаем его уникальным: чем точнее ты опишешь внешность, тем ближе результат будет к твоей задумке.\n\n'
      : reaction
        ? reaction.includes('\n') ? `${reaction}\n\n` : `${reaction} `
        : ''
  return turn([`${intro}${ask(q, c.spec)}`])
}

function finish(c: Conv, reaction: string, rich = false): Turn {
  c.pending = null
  c.phase = 'review'
  const line = readyLine(c, rich)
  return { conv: c, say: [reaction ? `${reaction}\n\n${line}` : line], generate: true }
}

/** Если ребёнок сам попросил не ждать, но героя ещё нет — вернуть вопрос. */
export const FIRST_TURN_HINT = 'Опиши, кого хочешь создать...'

/** Ответ на вопрос «как зовут героя?». */
function respondNaming(c: Conv, text: string): Turn {
  const skip = /(^|\s)(без имени|пропустим|пропусти|потом|не надо|не нужно)(\s|$)/i.test(text.toLowerCase()) || /^нет[.!\s]*$/i.test(text.trim())
  if (skip) {
    c.phase = 'finished'
    return { conv: c, say: ['Хорошо, имя можно придумать позже.'], upsell: true }
  }
  const name = parseHeroName(text)
  if (name) {
    c.spec.name = name
    c.phase = 'finished'
    return { conv: c, say: [`Запомнил: ${name}.`], upsell: true }
  }
  if (c.confused < 1) {
    c.confused += 1
    return { conv: c, say: ['Не похоже на имя. Напиши одно-два слова (не своё настоящее имя) или нажми «Без имени».'] }
  }
  c.phase = 'finished'
  return { conv: c, say: ['Хорошо, вернёмся к имени позже.'], upsell: true }
}

/** Итоги урока для финала: что описал ребёнок и сколько правок сделал. */
export function summarize(c: Conv) {
  return { labels: describeFilled(c.spec), edits: c.changes, kind: c.spec.kind?.nom, name: c.spec.name }
}

/** Что ребёнок задал сам: цвета, детали и стиль в виде коротких тегов под картинкой. */
export function contributionTags(s: Spec): string[] {
  const out: string[] = []
  if (s.main) out.push(s.main.name)
  if (s.accent && !Object.values(s.features).some((v) => v?.includes(s.accent!.name.slice(0, 4)))) out.push(s.accent.name)
  const order: FeatureKey[] = [...SURFACE, ...HEAD, ...EXTRA]
  for (const k of order) if (s.features[k]) out.push(s.features[k]!)
  if (s.style) out.push(s.style === 'cinema' ? 'стиль: кино' : 'стиль: мультфильм')
  return uniq(out).slice(0, 8)
}

const CAT_OF = (k: FeatureKey): Sticker['c'] => (SURFACE.includes(k) ? 'material' : HEAD.includes(k) ? 'head' : 'extra')

/** Те же детали, но с категорией: из них строятся цветные стикеры «ты задал» и полоса прогресса. */
export function contributionStickers(s: Spec): Sticker[] {
  const out: Sticker[] = []
  if (s.kind) out.push({ t: s.kind.nom, c: 'who' })
  if (s.main) out.push({ t: s.main.name, c: 'color' })
  if (s.accent && !Object.values(s.features).some((v) => v?.includes(s.accent!.name.slice(0, 4)))) out.push({ t: s.accent.name, c: 'color' })
  for (const k of [...SURFACE, ...HEAD, ...EXTRA] as FeatureKey[]) if (s.features[k]) out.push({ t: s.features[k]!, c: CAT_OF(k) })
  if (s.style) out.push({ t: s.style === 'cinema' ? 'стиль: кино' : 'стиль: мультфильм', c: 'style' })
  const seen = new Set<string>()
  return out.filter((x) => (seen.has(x.t) ? false : (seen.add(x.t), true))).slice(0, 10)
}

/** Слоты полосы «из чего собирается герой»: заполненные показывают слова ребёнка, пустые — подсказку. */
export const SLOT_ORDER: { c: Sticker['c']; empty: string }[] = [
  { c: 'who', empty: 'кто' },
  { c: 'color', empty: 'цвет' },
  { c: 'material', empty: 'материал' },
  { c: 'head', empty: 'глаза и голова' },
  { c: 'extra', empty: 'детали' },
  { c: 'style', empty: 'стиль' },
]
