// José's clients come for a handful of reasons. These are the tags the
// dashboard offers, and the words that tag a person automatically when they
// show up in what they wrote (booking answers, onboarding, lead notes).

// The first four are the booking form's goal options (GOAL_TAGS in lib/site.ts),
// so a tag from the form and a tag read from free text are the same tag.
export const GOALS = [
  { label: 'Perder grasa',    words: ['perder grasa', 'perder peso', 'adelgaz', 'bajar de peso', 'bajar peso', 'kilos', 'kg', 'barriga', 'grasa', 'lose fat', 'lose weight', 'fat loss', 'weight loss', 'slim'] },
  { label: 'Ganar músculo',   words: ['músculo', 'musculo', 'masa muscular', 'ganar masa', 'volumen', 'hipertrofia', 'build muscle', 'muscle', 'strength', 'bulk'] },
  { label: 'Ganar confianza', words: ['confianza', 'autoestima', 'seguridad en mí', 'verme bien', 'sentirme bien', 'fotos', 'espejo', 'confidence', 'self-esteem', 'look good'] },
  { label: 'Más energía',     words: ['energía', 'energia', 'salud', 'hábitos', 'habitos', 'dolor', 'espalda', 'colesterol', 'cansad', 'dormir', 'energy', 'health', 'habits'] },
  { label: 'Recomposición',   words: ['recomposición', 'recomposicion', 'definir', 'definición', 'tonificar', 'tonific', 'recomp', 'tone', 'toned'] },
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
