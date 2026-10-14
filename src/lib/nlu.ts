import type { Arch, ColorRef, FeatureKey, KindInfo, Q, Spec, Style } from '../types'

/**
 * Локальное «понимание» текста ребёнка: словари и правила, без API.
 * Всё, что не удаётся распознать, честно возвращается как «не понял».
 */

const norm = (s: string) => s.replace(/ё/g, 'е')

// ---------- Типы героев ----------
// stems: основа слова; «=» — точные формы через «|»
type KindRow = [stems: string[], nom: string, acc: string, arch: Arch, exact: boolean, generic?: boolean, human?: boolean]
const KINDS: KindRow[] = [
  [['дракон'], 'дракон', 'дракона', 'dragon', true],
  [['робот'], 'робот', 'робота', 'robot', true],
  [['киборг'], 'киборг', 'киборга', 'robot', true],
  [['андроид'], 'андроид', 'андроида', 'robot', true],
  [['рыцар'], 'рыцарь', 'рыцаря', 'warrior', true],
  [['воин'], 'воин', 'воина', 'warrior', true],
  [['самурай'], 'самурай', 'самурая', 'warrior', true],
  [['викинг'], 'викинг', 'викинга', 'warrior', true],
  [['гладиатор'], 'гладиатор', 'гладиатора', 'warrior', true],
  [['паладин'], 'паладин', 'паладина', 'warrior', true],
  [['ниндзя'], 'ниндзя', 'ниндзя', 'warrior', true],
  [['солдат'], 'солдат', 'солдата', 'warrior', true],
  [['космонавт', 'астронавт'], 'космонавт', 'космонавта', 'warrior', false],
  [['супергер'], 'супергерой', 'супергероя', 'warrior', true],
  [['=герой|героя|героем|персонаж|персонажа'], 'герой', 'героя', 'warrior', false, true],
  [['волк'], 'волк', 'волка', 'beast', true],
  [['=лис|лиса|лису|лисица|лисицу|лисенок'], 'лис', 'лиса', 'beast', true],
  [['звер'], 'зверь', 'зверя', 'beast', true],
  [['животн'], 'животное', 'животное', 'beast', true, true],
  [['монстр'], 'монстр', 'монстра', 'beast', true],
  [['медвед'], 'медведь', 'медведя', 'beast', false],
  [['тигр'], 'тигр', 'тигра', 'beast', false],
  [['=лев|льва'], 'лев', 'льва', 'beast', false],
  [['пантер'], 'пантера', 'пантеру', 'beast', false],
  [['=кот|кота|котик|котика|кошка|кошку|кошки|котенок'], 'кот', 'кота', 'beast', false],
  [['собак', '=пес|пса|щенок|щенка'], 'собака', 'собаку', 'beast', false],
  [['динозавр'], 'динозавр', 'динозавра', 'beast', false],
  [['единорог'], 'единорог', 'единорога', 'beast', false],
  [['лошад', '=конь|коня|пони'], 'лошадь', 'лошадь', 'beast', false],
  [['зайц', '=заяц|кролик|кролика'], 'заяц', 'зайца', 'beast', false],
  [['акул'], 'акула', 'акулу', 'beast', false],
  [['феникс'], 'феникс', 'феникса', 'spirit', false],
  [['призрак'], 'призрак', 'призрака', 'spirit', true],
  [['привиден'], 'призрак', 'призрака', 'spirit', true],
  [['=дух|духа'], 'дух', 'духа', 'spirit', true],
  [['=фея|фею|феи'], 'фея', 'фею', 'spirit', true],
  [['эльф'], 'эльф', 'эльфа', 'spirit', false],
  [['волшебник'], 'волшебник', 'волшебника', 'spirit', false],
  [['=маг|мага'], 'маг', 'мага', 'spirit', false],
  [['колдун'], 'колдун', 'колдуна', 'spirit', false],
  [['ангел'], 'ангел', 'ангела', 'spirit', false],
  [['демон'], 'демон', 'демона', 'spirit', false],
  [['пришел', 'инопланет'], 'пришелец', 'пришельца', 'spirit', false],
  [['существ'], 'существо', 'существо', 'spirit', true, true],
  // люди и персонажи из любимых вселенных: в демо ближайшая иллюстрация — воин в доспехах
  [['паук'], 'человек-паук', 'человека-паука', 'warrior', false, false, true],
  [['бэтмен', 'бетмен', 'batman'], 'Бэтмен', 'Бэтмена', 'warrior', false, false, true],
  [['супермен', 'superman'], 'Супермен', 'Супермена', 'warrior', false, false, true],
  [['майнкрафт', 'minecraft', '=стив|стива'], 'герой Майнкрафта', 'героя', 'warrior', false, false, true],
  [['принцесс'], 'принцесса', 'принцессу', 'warrior', false, false, true],
  [['=принц|принца'], 'принц', 'принца', 'warrior', false, false, true],
  [['королев'], 'королева', 'королеву', 'warrior', false, false, true],
  [['=король|короля'], 'король', 'короля', 'warrior', false, false, true],
  [['пират'], 'пират', 'пирата', 'warrior', false, false, true],
  [['ковбой'], 'ковбой', 'ковбоя', 'warrior', false, false, true],
  [['девочк', 'девушк'], 'девочка', 'девочку', 'warrior', false, false, true],
  [['мальчик', 'парн'], 'мальчик', 'мальчика', 'warrior', false, false, true],
  [['=человек|человека|человеком'], 'человек', 'человека', 'warrior', false, true, true],
  [['покемон', 'пикачу'], 'покемон', 'покемона', 'beast', false],
  // английские слова
  [['dragon'], 'дракон', 'дракона', 'dragon', true],
  [['robot'], 'робот', 'робота', 'robot', true],
  [['knight'], 'рыцарь', 'рыцаря', 'warrior', true],
  [['wolf'], 'волк', 'волка', 'beast', true],
  [['=fox'], 'лис', 'лиса', 'beast', true],
  [['=cat|kitten'], 'кот', 'кота', 'beast', false],
  [['unicorn'], 'единорог', 'единорога', 'beast', false],
  [['monster'], 'монстр', 'монстра', 'beast', true],
  [['ghost'], 'призрак', 'призрака', 'spirit', true],
  [['wizard'], 'волшебник', 'волшебника', 'spirit', false],
]

function matchStem(token: string, stem: string): boolean {
  if (stem.startsWith('=')) return stem.slice(1).split('|').includes(token)
  return token.startsWith(stem)
}

function findKind(tokens: string[]): KindInfo | undefined {
  let generic: KindInfo | undefined
  for (const t of tokens) {
    for (const [stems, nom, acc, arch, exact, isGeneric, human] of KINDS) {
      if (stems.some((s) => matchStem(t, s))) {
        const info: KindInfo = { nom, acc, arch, exact, generic: isGeneric, human }
        if (!isGeneric) return info
        generic ??= info
      }
    }
  }
  return generic
}

// ---------- Цвета ----------
interface ColorRow { name: string; hex: string; stems: string[] }
const COLORS: ColorRow[] = [
  { name: 'чёрный', hex: '#262632', stems: ['черн', 'черно'] },
  { name: 'белый', hex: '#e6eaf2', stems: ['=белый|белая|белое|белые|белым|белыми|белой|белых|бело|белого', 'снеж'] },
  { name: 'серый', hex: '#7b8494', stems: ['=серый|серая|серое|серые|серым|серыми|серой|серых|серо|серого'] },
  { name: 'красный', hex: '#d62839', stems: ['красн', 'алый', 'алая', 'алые', 'алым', 'алыми', 'багров'] },
  { name: 'синий', hex: '#2f5de0', stems: ['сини', 'синя', 'сине', 'синей'] },
  { name: 'голубой', hex: '#3ab0f0', stems: ['голуб'] },
  { name: 'бирюзовый', hex: '#18c7b5', stems: ['бирюз'] },
  { name: 'зелёный', hex: '#25a244', stems: ['зелен', 'салатов'] },
  { name: 'изумрудный', hex: '#10b981', stems: ['изумруд'] },
  { name: 'жёлтый', hex: '#f2c418', stems: ['желт', 'лимонн'] },
  { name: 'оранжевый', hex: '#f2711c', stems: ['оранж'] },
  { name: 'рыжий', hex: '#d9692a', stems: ['рыж'] },
  { name: 'огненный', hex: '#f0511b', stems: ['огненн'] },
  { name: 'фиолетовый', hex: '#7c3aed', stems: ['фиолет', 'пурпур', 'сирен', 'лилов'] },
  { name: 'розовый', hex: '#ec4899', stems: ['розов', 'малинов'] },
  { name: 'золотой', hex: '#e0a81f', stems: ['золот'] },
  { name: 'серебристый', hex: '#b8c2d4', stems: ['серебр'] },
  { name: 'бронзовый', hex: '#b0793a', stems: ['бронзов', 'медн'] },
  { name: 'коричневый', hex: '#7a4a2a', stems: ['коричн'] },
  { name: 'стальной', hex: '#8d99ae', stems: ['стальн'] },
  { name: 'чёрный', hex: '#262632', stems: ['=black'] },
  { name: 'белый', hex: '#e6eaf2', stems: ['=white'] },
  { name: 'красный', hex: '#d62839', stems: ['=red'] },
  { name: 'синий', hex: '#2f5de0', stems: ['=blue'] },
  { name: 'зелёный', hex: '#25a244', stems: ['=green'] },
  { name: 'золотой', hex: '#e0a81f', stems: ['=gold|golden'] },
  { name: 'серебристый', hex: '#b8c2d4', stems: ['=silver'] },
  { name: 'фиолетовый', hex: '#7c3aed', stems: ['=purple'] },
  { name: 'розовый', hex: '#ec4899', stems: ['=pink'] },
  { name: 'оранжевый', hex: '#f2711c', stems: ['=orange'] },
  { name: 'жёлтый', hex: '#f2c418', stems: ['=yellow'] },
]

function findColor(token: string): ColorRef | undefined {
  for (const c of COLORS) if (c.stems.some((s) => matchStem(token, s))) return { name: c.name, hex: c.hex }
  return undefined
}

// существительные, к которым «прилипает» цвет
const EYE_NOUNS = ['глаз', 'взгляд', 'зрачк']
const ACCENT_NOUNS = ['доспех', 'брон', 'лат', 'панцир', 'метал', 'шлем', 'рог', 'когт', 'шип', 'корон', 'плащ', 'узор', 'метк', 'полос', 'пластин', 'клык', 'крыл', 'визор', 'украшен', 'вставк', 'огн', 'пламя', 'сияни', 'оружи', 'меч', 'щит']
const MAIN_NOUNS = ['чешу', 'шерст', 'кож', 'мех', 'пух', 'тел', 'корпус', 'цвет', 'окрас']

// ---------- Детали внешности ----------
type Gender = 'm' | 'f' | 'n' | 'p'
interface FeatureRow { key: FeatureKey; stems: string[]; lemma: string; g: Gender }
const FEATURES: FeatureRow[] = [
  { key: 'armor', stems: ['доспех'], lemma: 'доспехи', g: 'p' },
  { key: 'armor', stems: ['=латы|лат|латах|латами'], lemma: 'латы', g: 'p' },
  { key: 'armor', stems: ['брон'], lemma: 'броня', g: 'f' },
  { key: 'armor', stems: ['панцир'], lemma: 'панцирь', g: 'm' },
  { key: 'scales', stems: ['чешу'], lemma: 'чешуя', g: 'f' },
  { key: 'fur', stems: ['шерст'], lemma: 'шерсть', g: 'f' },
  { key: 'fur', stems: ['=мех|меха|мехом'], lemma: 'мех', g: 'm' },
  { key: 'skin', stems: ['кож'], lemma: 'кожа', g: 'f' },
  { key: 'metal', stems: ['=металл|металла|металлом|сталь|стали|сталью'], lemma: 'металл', g: 'm' },
  { key: 'crystal', stems: ['кристалл'], lemma: 'кристаллы', g: 'p' },
  { key: 'eyes', stems: ['глаз', 'взгляд'], lemma: 'глаза', g: 'p' },
  { key: 'horns', stems: ['рог'], lemma: 'рога', g: 'p' },
  { key: 'helmet', stems: ['шлем', 'визор', 'капюшон'], lemma: 'шлем', g: 'm' },
  { key: 'ears', stems: ['=уши|ушки|ушами|ушей'], lemma: 'уши', g: 'p' },
  { key: 'face', stems: ['морд', 'пасть', 'пасти'], lemma: 'морда', g: 'f' },
  { key: 'teeth', stems: ['клык', 'зуб'], lemma: 'клыки', g: 'p' },
  { key: 'crown', stems: ['корон'], lemma: 'корона', g: 'f' },
  { key: 'outfit', stems: ['платье', 'платья', 'платьем'], lemma: 'платье', g: 'n' },
  { key: 'outfit', stems: ['костюм'], lemma: 'костюм', g: 'm' },
  { key: 'outfit', stems: ['куртк'], lemma: 'куртка', g: 'f' },
  { key: 'outfit', stems: ['шляп'], lemma: 'шляпа', g: 'f' },
  { key: 'outfit', stems: ['мантия', 'мантию', 'мантии'], lemma: 'мантия', g: 'f' },
  { key: 'outfit', stems: ['футболк'], lemma: 'футболка', g: 'f' },
  { key: 'outfit', stems: ['маск'], lemma: 'маска', g: 'f' },
  { key: 'outfit', stems: ['=очки|очков|очками'], lemma: 'очки', g: 'p' },
  { key: 'wings', stems: ['крыл'], lemma: 'крылья', g: 'p' },
  { key: 'tail', stems: ['хвост'], lemma: 'хвост', g: 'm' },
  { key: 'claws', stems: ['когт', 'лап'], lemma: 'когти', g: 'p' },
  { key: 'spikes', stems: ['шип'], lemma: 'шипы', g: 'p' },
  { key: 'fire', stems: ['=огонь|огня|огнем|пламя|пламенем|огненное|огненные'], lemma: 'огонь', g: 'm' },
  { key: 'weapon', stems: ['меч', 'щит', 'оруж', 'пушк', 'топор', 'копь', '=лук|лука'], lemma: 'оружие', g: 'n' },
  { key: 'cape', stems: ['плащ'], lemma: 'плащ', g: 'm' },
  { key: 'marks', stems: ['узор', 'метк', 'полос', 'татуир'], lemma: 'узоры', g: 'p' },
]

// тематические слова (без существительного)
const THEMES: [string, string][] = [
  ['будущ', 'из будущего'], ['футур', 'футуристичный'], ['кибер', 'киберпанк'], ['космическ', 'космический'],
  ['неон', 'неоновая подсветка'], ['боев', 'боевой'], ['волшебн', 'волшебный'], ['магическ', 'магический'],
  ['ледян', 'ледяной'], ['древн', 'древний'], ['огромн', ''], ['гигант', ''],
]

const ADJ_END = /(ый|ий|ой|ая|яя|ое|ее|ые|ие|ых|их|ым|им|ую|юю|ого|его|ыми|ими|ом|ем|ся)$/
const COPULA = new Set(['будут', 'будет', 'были', 'был', 'была', 'станут', 'станет', 'стали', 'бы'])
const NOT_ADJ = new Set(['чтобы', 'будет', 'пусть', 'сделай', 'хочу', 'него', 'такой', 'этого', 'своего', 'своей', 'моего', 'другой', 'другие', 'который', 'тоже', 'самый', 'какой', 'какого', 'такие', 'такого', 'нужно', 'можно', 'просто', 'всего', 'более', 'после', 'перед', 'около', 'снова', 'вместо'])

/** Приводит прилагательное к форме именительного падежа, согласованной с существительным. */
function adjNom(adj: string, g: Gender): string {
  if (g === 'p') return adj.replace(/(ыми|ых|ые|ым)$/, 'ые').replace(/(ими|их|ие|им)$/, 'ие').replace(/(имися|имся)$/, 'иеся').replace(/(ыми|ыми)$/, 'ые')
  if (g === 'f') return adj.replace(/(ой|ую|ою)$/, 'ая').replace(/(ей|юю|ею)$/, 'яя')
  if (g === 'm') return adj.replace(/(ым|ого|ом)$/, 'ый').replace(/(им|его|ем)$/, 'ий')
  if (g === 'n') return adj.replace(/(ым|ого|ом)$/, 'ое').replace(/(им|его|ем)$/, 'ее')
  return adj
}

function collectAdjectives(orig: string[], normT: string[], i: number, skip: (t: string) => boolean): string[] {
  const out: string[] = []
  for (let j = i - 1; j >= 0 && out.length < 2; j--) {
    const t = normT[j]
    if (t.length < 4 || NOT_ADJ.has(t) || !ADJ_END.test(t) || skip(t)) break
    out.unshift(orig[j])
  }
  return out
}

// ---------- Стиль ----------
const CINEMA = /реалист|(^|[^а-я])кино|киношн|настоящ|фотореал|3d|3д/
const TOON = /мульт|стилиз|анимац|игров|комикс|рисованн|аниме|anime|пиксар|pixar|дисней|disney|пиксел/

// ---------- Намерения ----------
const POSITIVE = /нравит|все хорошо|все отлично|отлично|доволен|круто|класс|оставь|так и оставим|без изменений|ничего не надо|ничего менять|идеально|хорош|готов|супер/
const NEGATED_POSITIVE = /(^|[^а-я])(не нравит|не очень|не то|не так|не хочу)/
const WANT_CHANGE = /хочу измен|измен(и|ить)|поменя|переделат|переделай|исправ/
const CHANGE_INTENT = /^(нет|не так|не то|не надо|стоп|подожди|ой|а лучше|лучше|давай|пусть|сделай|поменяй|измени|переделай|замени|а можно|хочу чтобы|хочу, чтобы|теперь|пусть он|на самом деле)|пусть|поменя|измени|замени|переделай|вместо|(^|[^а-я])не хочу/
const HELP = /не знаю|не придумал|не могу придумать|затрудня|помоги|подскажи|идей нет|нет идей|не понима|придумай (ты|сам)|что писать|не уверен|сам не знаю/
const FINISH = /создавай|создай (его|уже)|генерируй|хватит|давай создавать|достаточно|поехали|делай уже|покажи (его|результат)/
const SKIP = /^(нет|не надо|ничего|не нужно|без этого|пропустим|пропусти|ничего не надо|неважно|не важно)[ .!]*$/

const KEYBOARD_MASH = ['фыва', 'йцук', 'asdf', 'qwer', 'ячсм', 'олдж', 'пролд', 'ыва', 'zxcv', 'вапр']
const SHORT_OK = new Set(['да', 'нет', 'ок', 'ну', 'не', 'ага', 'угу', 'ага'])

export function isNonsense(text: string): boolean {
  const tokens = norm(text.toLowerCase()).split(/[^a-zа-я0-9]+/).filter(Boolean)
  if (!tokens.length) return true
  const good = tokens.filter((t) => {
    if (SHORT_OK.has(t)) return true
    if (t.length < 3) return false
    if (!/[аеиоуыэюяaeiou]/.test(t)) return false
    if (/(.)\1{3,}/.test(t)) return false
    if (KEYBOARD_MASH.some((k) => t.includes(k))) return false
    return true
  })
  return good.length === 0
}

const STOP_KIND = new Set(['хочу', 'создать', 'создай', 'сделать', 'сделай', 'нарисуй', 'нарисовать', 'своего', 'своей', 'моего', 'мой', 'который', 'такой', 'очень', 'чтобы', 'будет', 'пусть', 'мне', 'нужно', 'можно', 'просто', 'какой', 'какого', 'такого', 'давай', 'пожалуйста', 'придумать', 'придумай', 'нового', 'новый', 'новую', 'что', 'где', 'как', 'это', 'этого', 'тоже'])

/** Если тип героя не распознан, но ребёнок назвал кого-то — берём это слово как есть (картинка будет «ближайшей»). */
export function customKind(text: string): KindInfo | undefined {
  const tokens = norm(text.toLowerCase()).split(/[^a-zа-я]+/).filter(Boolean)
  const orig = text.toLowerCase().split(/[^a-zа-яё]+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.length < 4 || STOP_KIND.has(t) || findColor(t) || ADJ_END.test(t) || /(ать|ить|ять|еть|уть|ся)$/.test(t)) continue
    if (FEATURES.some((f) => f.stems.some((s) => matchStem(t, s)))) continue
    if (THEMES.some(([s]) => t.startsWith(s))) continue
    const nom = orig[i].replace(/у$/, 'а').replace(/ю$/, 'я')
    return { nom, acc: 'героя', arch: 'beast', exact: false, custom: true }
  }
  return undefined
}

// ---------- Разбор ----------
export interface Parsed {
  kind?: KindInfo
  main?: ColorRef
  accent?: ColorRef
  eyes?: ColorRef
  features: Partial<Record<FeatureKey, string>>
  style?: Style
  name?: string
  /** ребёнок попросил «аниме» и т. п.: в демо два стиля, нужно честно сказать об этом */
  styleNote?: string
  positive: boolean
  wantChange: boolean
  changeIntent: boolean
  help: boolean
  finish: boolean
  skip: boolean
  nonsense: boolean
}

export interface ParseCtx {
  pending: Q | null
  spec: Spec
}

export function parse(text: string, ctx: ParseCtx): Parsed {
  const lower = text.toLowerCase().trim()
  const orig = lower.split(/[^a-zа-яё0-9-]+/).filter((t) => t && t !== '-')
  const tokens = orig.map(norm)
  const out: Parsed = {
    features: {},
    positive: false,
    wantChange: false,
    changeIntent: false,
    help: false,
    finish: false,
    skip: false,
    nonsense: false,
  }
  const nl = norm(lower)

  out.help = HELP.test(nl)
  out.finish = FINISH.test(nl)
  out.skip = SKIP.test(nl)
  out.wantChange = WANT_CHANGE.test(nl) || NEGATED_POSITIVE.test(nl)
  out.positive = POSITIVE.test(nl) && !NEGATED_POSITIVE.test(nl) && !WANT_CHANGE.test(nl)
  out.changeIntent = CHANGE_INTENT.test(nl)

  if (/аниме|anime/.test(nl)) out.styleNote = 'В демо два стиля: кино и мультфильм. Аниме отнесу к мультяшному.'
  else if (/пиксар|pixar|дисней|disney/.test(nl)) out.styleNote = 'В демо два стиля: кино и мультфильм. Это отнесу к мультяшному.'
  out.kind = findKind(tokens.flatMap((t) => t.split('-')))

  // стиль
  if (CINEMA.test(nl) && !TOON.test(nl)) out.style = 'cinema'
  else if (TOON.test(nl) && !CINEMA.test(nl)) out.style = 'toon'
  else if (CINEMA.test(nl) && TOON.test(nl)) {
    // «не мультяшный, а как в кино» — побеждает последнее упоминание
    out.style = nl.search(CINEMA) > nl.search(TOON) ? 'cinema' : 'toon'
  }

  // имя
  const nameRe = /(?:его зовут|её зовут|ее зовут|зовут|имя|назову|назовем|назвать|назови его)\s+([a-zA-Zа-яА-ЯёЁ-]{2,})/i
  const nm = text.match(nameRe)
  if (nm && !/^(его|её|ее|он|она)$/i.test(nm[1])) out.name = nm[1][0].toUpperCase() + nm[1].slice(1)

  // детали
  const used = new Set<number>()
  const isColorTok = (t: string) => !!findColor(t)
  tokens.forEach((t, i) => {
    for (const f of FEATURES) {
      if (!f.stems.some((s) => matchStem(t, s))) continue
      if (tokens[i - 1] === 'без') break
      const adj = collectAdjectives(orig, tokens, i, (a) => a === t)
      let adjs = adj
      if (!adjs.length) {
        let j = i + 1
        while (COPULA.has(tokens[j])) j++
        if (tokens[j] && ADJ_END.test(tokens[j]) && tokens[j].length >= 5 && !NOT_ADJ.has(tokens[j])) {
          adjs = [orig[j]]
          used.add(j)
        }
      }
      const phrase = [...adjs.map((a) => adjNom(a, f.g)), f.lemma].join(' ')
      if (!out.features[f.key]) out.features[f.key] = phrase
      else if (f.key === 'outfit' && !out.features.outfit!.includes(phrase)) out.features.outfit += `, ${phrase}`
      adj.forEach((_, k) => used.add(i - 1 - k))
      used.add(i)
      break
    }
  })

  // темы
  tokens.forEach((t) => {
    for (const [stem, phrase] of THEMES) {
      if (phrase && t.startsWith(stem) && !out.features.theme) out.features.theme = phrase
    }
  })
  if (out.features.theme && out.kind === undefined) { /* тема без типа — ок */ }

  // цвета
  let sawMain = !!ctx.spec.main
  const pushColor = (c: ColorRef, role: 'eyes' | 'accent' | 'main' | 'bare', i: number) => {
    let r = role
    if (r === 'bare') {
      if (ctx.pending === 'head' && !out.eyes && !out.changeIntent) r = 'eyes'
      else if (!sawMain || out.changeIntent) r = 'main'
      else r = 'accent'
    }
    if (r === 'eyes') out.eyes ??= c
    else if (r === 'accent') out.accent ??= c
    else if (!out.main) { out.main = c; sawMain = true } else out.accent ??= c
    void i
  }
  const colorTokens: [number, string][] = []
  tokens.forEach((t, i) => {
    if (t.includes('-')) t.split('-').forEach((p) => colorTokens.push([i, p]))
    else colorTokens.push([i, t])
  })
  for (const [i, t] of colorTokens) {
    const c = findColor(t)
    if (!c) continue
    const n1 = tokens[i + 1]
    const next = [n1, n1 && ADJ_END.test(n1) ? tokens[i + 2] : undefined].filter(Boolean) as string[]
    const nounAfter = (list: string[]) => next.some((n) => list.some((s) => n.startsWith(s)))
    const nextKind = next.some((n) => !!findKind([n]))
    let role: 'eyes' | 'accent' | 'main' | 'bare' = 'bare'
    if (nounAfter(EYE_NOUNS)) role = 'eyes'
    else if (nounAfter(ACCENT_NOUNS)) role = 'accent'
    else if (nounAfter(MAIN_NOUNS) || nextKind) role = 'main'
    else if (tokens[i - 1] && findKind([tokens[i - 1]])) role = 'main'
    else {
      // «глаза голубые», «крылья будут красные»: цвет стоит после существительного
      let j = i - 1
      while (j >= 0 && COPULA.has(tokens[j])) j--
      const prev = tokens[j]
      if (prev) {
        if (EYE_NOUNS.some((s) => prev.startsWith(s))) role = 'eyes'
        else if (ACCENT_NOUNS.some((s) => prev.startsWith(s))) role = 'accent'
        else if (MAIN_NOUNS.some((s) => prev.startsWith(s))) role = 'main'
      }
    }
    pushColor(c, role, i)
  }

  out.nonsense = isNonsense(text)
  return out
}

export function isEmptyParse(p: Parsed): boolean {
  return !p.kind && !p.main && !p.accent && !p.eyes && !p.style && !p.name && Object.keys(p.features).length === 0
}

// ---------- Личные данные ----------
const PII = [
  /\d[\d\s().-]{6,}\d/,                      // телефон и длинные числа
  /[\w.-]+@[\w.-]+/,                           // e-mail
  /(^|\s)@[\w.]{3,}/,                          // ник в соцсети
  /меня зовут/i,
  /мо(е|ё) имя/i,
  /мне\s+\d{1,2}\s*(лет|год|года)/i,
  /\bя\s+(живу|учусь|из)\b/i,
  /живу\s+(в|на)\s/i,
  /(моя|наша)\s+школ/i,
  /школ[аеуы]?\s*(№|номер)?\s*\d+/i,
  /(улиц|проспект|переул)\w*\s+[А-ЯЁA-Z]/i,
  /мой\s+(адрес|телефон|номер|город)/i,
  /(http|www\.)/i,
]
/** Похоже ли сообщение на ввод личных данных (имя, возраст, адрес, телефон, ссылки). */
export const looksPersonal = (text: string) => PII.some((re) => re.test(text))

/** Имя героя из ответа на вопрос «как его зовут?»; null — если ответ не похож на имя. */
export function parseHeroName(text: string): string | null {
  const t = text.trim().replace(/^(его |её |ее )?(зовут|имя|назову|назовем|пусть будет|пусть его зовут)\s+/i, '').replace(/[.!?"«»]+/g, '').trim()
  if (!t || t.length > 24 || t.split(/\s+/).length > 3) return null
  if (isNonsense(t) || looksPersonal(t)) return null
  return t[0].toUpperCase() + t.slice(1)
}
