export type Arch = 'dragon' | 'robot' | 'warrior' | 'beast' | 'spirit'

export interface KindInfo {
  nom: string
  acc: string
  arch: Arch
  /** true — в демо есть иллюстрация именно этого типа, false — только ближайшая */
  exact: boolean
  generic?: boolean
  /** человек или персонаж-человек: одежда вместо шерсти и морды */
  human?: boolean
  /** слово придумал ребёнок, в демо для него нет точной иллюстрации */
  custom?: boolean
}

export interface ColorRef {
  name: string
  hex: string
}

export type FeatureKey =
  | 'armor' | 'scales' | 'fur' | 'skin' | 'metal' | 'crystal' | 'look'
  | 'eyes' | 'horns' | 'helmet' | 'ears' | 'face' | 'teeth' | 'crown' | 'head'
  | 'outfit' | 'wings' | 'tail' | 'claws' | 'fire' | 'spikes' | 'weapon' | 'cape' | 'theme' | 'marks' | 'extra'

export type Style = 'cinema' | 'toon'

/** Всё, что система поняла о герое из слов ребёнка. */
export interface Spec {
  kind?: KindInfo
  main?: ColorRef
  accent?: ColorRef
  eyes?: ColorRef
  features: Partial<Record<FeatureKey, string>>
  style?: Style
  name?: string
}

export type Q = 'look' | 'head' | 'style' | 'extra'

export interface Conv {
  spec: Spec
  phase: 'collect' | 'review' | 'naming' | 'finished'
  asked: Q[]
  pending: Q | null
  confused: number
  taught: string[]
  changes: number
  /** ребёнок нажал «Хочу изменить»: показываем примеры правок */
  editing?: boolean
  namingAsked?: boolean
}

/** Итоги урока: показываются ребёнку в финале и родителю в окне программы. */
export interface LessonSummary {
  details: string[]
  questions: number
  edits: number
  firstIdea: string
  promptWords: number
}

export interface Chip {
  label: string
  /** fill — подставить в поле, send — отправить сразу, focus — просто сфокусировать поле */
  mode: 'fill' | 'send' | 'focus'
  text?: string
}

export interface HeroImage {
  src: string
  /** demo — готовая иллюстрация, ai — создано нейросетью через сервер */
  mode: 'demo' | 'ai'
  /** подпись сервера: по ней сервер узнаёт собственную картинку, когда её присылают на правку */
  sig?: string
  /** тестовый режим сервера: ответ имитируется, ИИ не вызывался */
  mock?: boolean
  arch: Arch
  exact: boolean
  alt: string
}

interface Base { id: string; finale?: boolean }
export type Msg =
  | (Base & { role: 'ai'; type: 'text'; text: string; animate?: boolean; prompt?: string })
  | (Base & { role: 'user'; type: 'text'; text: string })
  | (Base & { role: 'ai'; type: 'loading'; variant?: 'demo' | 'ai' | 'edit' })
  | (Base & { role: 'ai'; type: 'image'; image: HeroImage; name?: string; prompt: string; tags?: string[] })
  | (Base & { role: 'ai'; type: 'herocard'; image: HeroImage })
  | (Base & { role: 'ai'; type: 'learned'; summary: LessonSummary })
  | (Base & { role: 'ai'; type: 'upsell' })
  | (Base & { role: 'ai'; type: 'parentcta' })

export type Stage =
  | 'creating_character'
  | 'editing_character'
  | 'character_approved'
  | 'next_project_offer'
  | 'parent_handoff'
  | 'parent_offer'

export interface ChatState {
  conv: Conv
  messages: Msg[]
  stage: Stage
  cartoonClicked: boolean
}
