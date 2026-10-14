import type { Spec } from '../src/types'

/**
 * Промпт для модели собирается на сервере из проверенного Spec.
 * Англоязычный каркас не зависит от того, насколько модель понимает русский;
 * слова ребёнка добавляются в скобках как есть.
 */

const KIND_EN: Record<string, string> = {
  дракон: 'dragon', робот: 'friendly battle robot', киборг: 'cyborg', андроид: 'android', рыцарь: 'knight', воин: 'warrior',
  самурай: 'samurai', викинг: 'viking', гладиатор: 'gladiator', паладин: 'paladin', ниндзя: 'ninja', солдат: 'soldier',
  космонавт: 'astronaut', супергерой: 'superhero', герой: 'hero', волк: 'wolf', лис: 'fox', зверь: 'fantasy beast',
  животное: 'fantasy animal', монстр: 'friendly fantasy monster', медведь: 'bear', тигр: 'tiger', лев: 'lion', пантера: 'panther',
  кот: 'cat', собака: 'dog', динозавр: 'dinosaur', единорог: 'unicorn', лошадь: 'horse', заяц: 'hare', акула: 'shark',
  феникс: 'phoenix', призрак: 'friendly ghost', дух: 'spirit', фея: 'fairy', эльф: 'elf', волшебник: 'wizard', маг: 'mage',
  колдун: 'sorcerer', ангел: 'angel', демон: 'mischievous horned imp', пришелец: 'friendly alien', существо: 'magical creature',
  принцесса: 'princess', принц: 'prince', королева: 'queen', король: 'king', пират: 'pirate', ковбой: 'cowboy',
  девочка: 'girl', мальчик: 'boy', человек: 'person',
  // герои чужих вселенных заменяем оригинальными персонажами
  'человек-паук': 'original superhero in a red-and-blue suit with a web pattern',
  бэтмен: 'original dark-caped night hero',
  супермен: 'original flying hero with a cape',
  'герой майнкрафта': 'blocky voxel-style adventurer',
  покемон: 'original cute pocket-sized creature',
}
const ARCH_EN = { dragon: 'dragon', robot: 'battle robot', warrior: 'armored warrior', beast: 'fantasy beast', spirit: 'magical spirit creature' } as const

const COLOR_EN: Record<string, string> = {
  чёрный: 'black', белый: 'white', серый: 'gray', красный: 'red', синий: 'blue', голубой: 'light blue', бирюзовый: 'turquoise',
  зелёный: 'green', изумрудный: 'emerald green', жёлтый: 'yellow', оранжевый: 'orange', рыжий: 'ginger orange', огненный: 'fiery orange-red',
  фиолетовый: 'purple', розовый: 'pink', золотой: 'gold', серебристый: 'silver', бронзовый: 'bronze', коричневый: 'brown', стальной: 'steel gray',
}
const FEATURE_EN: Record<string, string> = {
  outfit: 'outfit', armor: 'armor', scales: 'scales', fur: 'fur', skin: 'skin', metal: 'metal plating', crystal: 'crystals', look: 'look',
  eyes: 'eyes', horns: 'horns', helmet: 'helmet', ears: 'ears', face: 'face', teeth: 'fangs', crown: 'crown', head: 'head details',
  wings: 'wings', tail: 'tail', claws: 'claws', fire: 'flames', spikes: 'spikes', weapon: 'fantasy gear', cape: 'cape', theme: 'theme',
  marks: 'markings', extra: 'extra detail',
}
const WORD_EN: [string, string][] = [
  ['огромн', 'huge'], ['гигант', 'giant'], ['больш', 'large'], ['маленьк', 'small'], ['небольш', 'small'], ['светящ', 'glowing'],
  ['металлическ', 'metallic'], ['золот', 'golden'], ['серебр', 'silver'], ['красн', 'red'], ['голуб', 'light blue'], ['син', 'blue'],
  ['зелен', 'green'], ['зелён', 'green'], ['чёрн', 'black'], ['черн', 'black'], ['бел', 'white'], ['остр', 'sharp'], ['длинн', 'long'],
  ['пушист', 'fluffy'], ['прозрачн', 'transparent'], ['огненн', 'fiery'], ['ледян', 'icy'], ['фиолет', 'purple'], ['розов', 'pink'],
  ['оранж', 'orange'], ['жёлт', 'yellow'], ['желт', 'yellow'], ['платье', 'dress'], ['костюм', 'suit'], ['плащ', 'cape'], ['маска', 'mask'],
  ['доспех', 'armor'], ['глаза', 'eyes'], ['рога', 'horns'], ['крылья', 'wings'], ['хвост', 'tail'], ['когти', 'claws'], ['шипы', 'spikes'],
  ['шлем', 'helmet'], ['корона', 'crown'], ['чешуя', 'scales'], ['шерсть', 'fur'], ['неоновая', 'neon'], ['подсветка', 'glow'],
  ['из будущего', 'futuristic'], ['боевой', 'battle'], ['волшебный', 'magical'], ['космический', 'space'], ['древний', 'ancient'],
]

/** Грубый перевод фразы по словарю; незнакомые слова остаются русскими. */
export function toEnglish(phrase: string): string {
  let s = phrase.toLowerCase()
  const out: string[] = []
  for (const [ru, en] of WORD_EN) {
    if (s.includes(ru)) {
      out.push(en)
      s = s.split(ru).join(' ')
    }
  }
  const rest = s.replace(/[,.;]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
  return [...out, ...rest].join(' ').trim()
}

const kindEn = (spec: Spec) => {
  const k = spec.kind!
  return KIND_EN[k.nom.toLowerCase()] ?? `${ARCH_EN[k.arch]} (the child calls it «${k.nom}»)`
}
const colorEn = (c?: { name: string }) => (c ? COLOR_EN[c.name] ?? c.name : '')

const GUARD =
  'Child-friendly, wholesome illustration for ages 8 to 14. No blood, no gore, no nudity, no realistic firearms, no text, no logos or watermarks, ' +
  'no real people, not a copy of any existing franchise character. Original character design.'

function describe(spec: Spec): string {
  const parts: string[] = []
  const palette = [colorEn(spec.main) && `main color ${colorEn(spec.main)}`, colorEn(spec.accent) && `accent color ${colorEn(spec.accent)}`, colorEn(spec.eyes) && `eye color ${colorEn(spec.eyes)}`].filter(Boolean)
  if (palette.length) parts.push(`Colors: ${palette.join(', ')}.`)
  const feats = Object.entries(spec.features)
    .filter(([, v]) => v)
    .map(([k, v]) => `${FEATURE_EN[k] ?? k}: ${toEnglish(v!)} (${v})`)
  if (feats.length) parts.push(`Details: ${feats.join('; ')}.`)
  return parts.join(' ')
}

const styleLine = (spec: Spec) =>
  spec.style === 'toon'
    ? 'Style: polished stylized 3D animated-film look, expressive shapes, vibrant clean colors, soft bright lighting.'
    : 'Style: cinematic photorealistic film still, detailed textures, dramatic contrasty lighting, shallow depth of field.'

export function buildCreatePrompt(spec: Spec): string {
  return [
    `A chest-up portrait of a ${kindEn(spec)}${spec.name ? ` named ${spec.name}` : ''}, centered, square composition, clean readable silhouette.`,
    describe(spec),
    styleLine(spec),
    GUARD,
  ].filter(Boolean).join(' ')
}

/** Различия между прошлой и новой версией героя в виде короткого списка пожеланий. */
export function diffSpecs(prev: Spec, next: Spec): string[] {
  const out: string[] = []
  const cmpColor = (label: string, a?: { name: string }, b?: { name: string }) => {
    if (b && a?.name !== b.name) out.push(`${label}: ${colorEn(b)}`)
  }
  cmpColor('main color', prev.main, next.main)
  cmpColor('accent color', prev.accent, next.accent)
  cmpColor('eye color', prev.eyes, next.eyes)
  for (const [k, v] of Object.entries(next.features)) {
    if (v && prev.features[k as keyof Spec['features']] !== v) out.push(`${FEATURE_EN[k] ?? k}: ${toEnglish(v)} (${v})`)
  }
  if (next.style && prev.style !== next.style) out.push(next.style === 'toon' ? 'change to polished stylized 3D animated-film look' : 'change to cinematic photorealistic look')
  if (next.kind && prev.kind && prev.kind.nom !== next.kind.nom) out.push(`character type: ${kindEn(next)}`)
  return out
}

/** Правка: сохраняем героя и просим изменить только названное. */
export function buildEditPrompt(changes: string[], spec: Spec): string {
  return [
    'Edit the provided image of the character. Keep the same character identity, face, proportions, pose, composition, background and art style.',
    `Apply only these changes: ${changes.join('; ')}.`,
    'Do not change anything else.',
    spec.style === 'toon' ? 'Keep the polished stylized 3D animated-film look.' : 'Keep the cinematic photorealistic look.',
    GUARD,
  ].join(' ')
}
