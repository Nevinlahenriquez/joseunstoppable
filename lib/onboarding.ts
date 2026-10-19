// The client onboarding form (/onboarding/<token>): its answers, the checks
// that tick each section, and the WhatsApp summary. Shared by the public page,
// the API that saves it and the dashboard that reads it back.

export const ONBOARDING_PHONE = '34649764886'

export type Answers = Record<string, string | string[]>

export type OnboardingStatus = 'sent' | 'opened' | 'completed'

export type OnboardingRow = {
  id: string
  token: string
  name: string | null
  email: string | null
  phone: string | null
  deal_id: string | null
  status: OnboardingStatus
  answers: Answers | null
  source: string | null
  created_at: string
  opened_at: string | null
  completed_at: string | null
}

export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  sent: 'Enviado',
  opened: 'Abierto',
  completed: 'Completado',
}

// Five short sections; only what José needs to write the plan is required.
export const SECTIONS = ['Tus datos', 'Tu objetivo', 'Salud', 'Rutina y alimentación', 'Compromiso'] as const

const REQUIRED: Record<number, string[]> = {
  1: ['nombre', 'email', 'edad', 'peso', 'altura'],
  2: ['plazo'],
  3: [],
  4: ['dias', 'lugar'],
  5: ['compromiso', 'porque'],
}

export const str = (a: Answers, k: string) => {
  const v = a[k]
  return (Array.isArray(v) ? v.join(', ') : v ?? '').trim()
}
export const list = (a: Answers, k: string): string[] => {
  const v = a[k]
  return Array.isArray(v) ? v : v ? [v] : []
}

// The fields of a section that still block it, for the red outline.
export function missingIn(a: Answers, sec: number): string[] {
  const out = REQUIRED[sec].filter(k => !str(a, k))
  if (sec === 1 && str(a, 'email') && !EMAIL_RE.test(str(a, 'email'))) out.push('email')
  if (sec === 2 && !list(a, 'objetivo').length && !str(a, 'objetivo_detalle')) out.push('objetivo_detalle')
  if (sec === 3 && !list(a, 'salud_ok').length && !str(a, 'salud')) out.push('salud')
  return out
}

export const sectionDone = (a: Answers, sec: number) => missingIn(a, sec).length === 0

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const ALLOWED = [
  'nombre', 'email', 'whatsapp', 'edad', 'peso', 'altura', 'cintura', 'cadera', 'pecho', 'brazo', 'pierna',
  'objetivo', 'plazo', 'objetivo_detalle', 'salud_ok', 'salud', 'trabajo', 'comidas', 'sueno',
  'dias', 'lugar', 'gusta', 'no_gusta', 'compromiso', 'cambiar', 'porque',
]

// Only the form's own fields, trimmed and capped, so the row stays small.
export function cleanAnswers(raw: unknown): Answers {
  const out: Answers = {}
  if (!raw || typeof raw !== 'object') return out
  const r = raw as Record<string, unknown>
  for (const k of ALLOWED) {
    const v = r[k]
    if (Array.isArray(v)) {
      const xs = v.filter((x): x is string => typeof x === 'string').map(x => x.trim().slice(0, 80)).filter(Boolean).slice(0, 10)
      if (xs.length) out[k] = xs
    } else if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim().slice(0, 2000)
    }
  }
  return out
}

export function buildMessage(a: Answers): string {
  const v = (k: string) => str(a, k)
  const cm = (k: string, label: string) => (v(k) ? `${label} ${v(k)} cm` : null)
  const meds = [cm('cintura', 'Cintura'), cm('cadera', 'Cadera'), cm('pecho', 'Pecho'), cm('brazo', 'Brazo'), cm('pierna', 'Pierna')].filter(Boolean)
  const obj = list(a, 'objetivo')
  const L: string[] = []
  L.push('*ONBOARDING · JOSÉ UNSTOPPABLE*', '')
  L.push(`*Nombre:* ${v('nombre')} (${v('edad')} años)`)
  if (v('email')) L.push(`*Email:* ${v('email')}`)
  L.push('')
  L.push('*📏 Medidas*')
  L.push(`Peso ${v('peso')} kg · Altura ${v('altura')} cm`)
  L.push(meds.length ? meds.join(' · ') : 'Perímetros: te los mando luego', '')
  L.push('*🎯 Objetivos*')
  if (obj.length) L.push(obj.join(', '))
  L.push(`Plazo: ${v('plazo')}`)
  if (v('objetivo_detalle')) L.push(v('objetivo_detalle'))
  L.push('', '*🩺 Salud*')
  L.push(list(a, 'salud_ok').length ? 'Nada que destacar' : v('salud'))
  L.push('', '*🕒 Rutina*')
  L.push(`Puede entrenar: ${v('dias')} · Dónde: ${v('lugar')}`)
  if (v('trabajo')) L.push(`Trabajo: ${v('trabajo')}`)
  if (v('comidas') || v('sueno')) L.push(`Comidas/día: ${v('comidas') || '-'} · Sueño: ${v('sueno') || '-'}`)
  if (v('gusta') || v('no_gusta')) L.push('', '*🍽️ Alimentación*')
  if (v('gusta')) L.push(`Le gusta: ${v('gusta')}`)
  if (v('no_gusta')) L.push(`No le gusta / no puede: ${v('no_gusta')}`)
  L.push('', `*🔥 Compromiso:* ${v('compromiso') || '-'}/10`)
  if (v('cambiar')) L.push(`Dispuesto/a a cambiar: ${v('cambiar')}`)
  L.push('', '*¿Por qué ahora?*', `“${v('porque')}”`, '')
  L.push('📸 Ahora te mando mis 3 fotos de inicio (frontal, perfil y espalda).')
  return L.join('\n')
}

// Label/value pairs for the dashboard and José's email.
export function answerRows(a: Answers): Array<[string, string]> {
  const v = (k: string) => str(a, k)
  const meds = [['Cintura', 'cintura'], ['Cadera', 'cadera'], ['Pecho', 'pecho'], ['Brazo', 'brazo'], ['Pierna', 'pierna']]
    .filter(([, k]) => v(k)).map(([l, k]) => `${l} ${v(k)} cm`).join(' · ')
  const rows: Array<[string, string]> = [
    ['Nombre', v('nombre')],
    ['Email', v('email')],
    ['WhatsApp', v('whatsapp')],
    ['Edad', v('edad') && `${v('edad')} años`],
    ['Peso y altura', [v('peso') && `${v('peso')} kg`, v('altura') && `${v('altura')} cm`].filter(Boolean).join(' · ')],
    ['Perímetros', meds],
    ['Objetivos', list(a, 'objetivo').join(', ')],
    ['Plazo', v('plazo')],
    ['En sus palabras', v('objetivo_detalle')],
    ['Salud', list(a, 'salud_ok').length ? 'Nada que destacar' : v('salud')],
    ['Trabajo', v('trabajo')],
    ['Comidas al día', v('comidas')],
    ['Sueño', v('sueno')],
    ['Días de entreno', v('dias')],
    ['Dónde entrena', v('lugar')],
    ['Le gusta', v('gusta')],
    ['No le gusta / no puede', v('no_gusta')],
    ['Compromiso', v('compromiso') && `${v('compromiso')}/10`],
    ['Dispuesto/a a cambiar', v('cambiar')],
    ['¿Por qué ahora?', v('porque')],
  ]
  return rows.filter(([, val]) => val)
}

export const waLink = (text: string, phone = ONBOARDING_PHONE) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

export function newToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 20)
}

// The welcome video José sets in the dashboard (any YouTube link form).
export const WELCOME_SETTING = 'onboarding_welcome'
export type WelcomeSettings = { videoUrl: string; message: string }
export const DEFAULT_WELCOME: WelcomeSettings = { videoUrl: '', message: '' }

export function youtubeId(url: string): string | null {
  const m = url.trim().match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return m ? m[1] : null
}
