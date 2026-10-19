// José's clients come for a handful of reasons. These are the tags the
// dashboard offers, and the words that tag a person automatically when they
// show up in what they wrote (booking answers, onboarding, lead notes).

export const GOALS = [
  { label: 'Perder peso',     words: ['perder peso', 'perder grasa', 'adelgaz', 'bajar de peso', 'bajar peso', 'kilos', 'kg', 'barriga', 'grasa', 'lose weight', 'fat loss', 'weight loss', 'slim'] },
  { label: 'Ganar músculo',   words: ['músculo', 'musculo', 'masa muscular', 'ganar masa', 'volumen', 'hipertrofia', 'fuerza', 'build muscle', 'muscle', 'strength', 'bulk'] },
  { label: 'Recomposición',   words: ['recomposición', 'recomposicion', 'definir', 'definición', 'tonificar', 'tonific', 'recomp', 'tone', 'toned'] },
  { label: 'Ganar confianza', words: ['confianza', 'autoestima', 'seguridad', 'verme bien', 'sentirme bien', 'fotos', 'espejo', 'confidence', 'self-esteem', 'look good'] },
  { label: 'Salud y energía', words: ['salud', 'energía', 'energia', 'hábitos', 'habitos', 'dolor', 'espalda', 'colesterol', 'tensión', 'dormir', 'health', 'energy', 'habits'] },
  { label: 'Rendimiento',     words: ['rendimiento', 'deporte', 'competir', 'maratón', 'maraton', 'carrera', 'resistencia', 'performance', 'athlet', 'endurance'] },
] as const

export type Goal = typeof GOALS[number]['label']

export const GOAL_LABELS: string[] = GOALS.map(g => g.label)

export const isGoal = (t: string) => GOAL_LABELS.includes(t)

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Every goal whose words appear in any of the texts, in GOALS order.
export function goalsFromText(...parts: (string | string[] | null | undefined)[]): Goal[] {
  const text = norm(parts.flat().filter(Boolean).join(' \n '))
  if (!text.trim()) return []
  return GOALS.filter(g => g.words.some(w => {
    const n = norm(w)
    // Short words ("kg") only as whole words, so "background" is not a goal.
    return n.length <= 3 ? new RegExp(`(^|[^a-z])${n}([^a-z]|$)`).test(text) : text.includes(n)
  })).map(g => g.label)
}

// Tags from the agency template this dashboard started from; they mean nothing
// for a personal trainer and are hidden wherever tags are listed.
export const LEGACY_TAGS = ['Real Estate', 'AI Agent', 'E-commerce', 'Tour Company', 'Beauty', 'Restaurant', 'Coaching', 'Other']

export const cleanTags = (tags?: string[] | null) => (tags ?? []).filter(t => t && !LEGACY_TAGS.includes(t))
