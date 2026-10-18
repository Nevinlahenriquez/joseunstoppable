const sessions = {
  'free-call': { sessionType: 'Llamada gratuita', duration: '30 min', dealValue: 0 },
  strategy: { sessionType: 'Sesión estratégica', duration: '60 min', dealValue: 0 },
} as const

export type QualificationTier = 'qualified' | 'review' | 'not-qualified'

export interface RevenueBand {

  readonly value: string

  readonly title: string
  readonly tier: QualificationTier
}

export const TOP_BAND = '$5M+ a year'

export const QUALIFYING_REVENUE = '$1 million a year'

export const REVENUE_BANDS: readonly RevenueBand[] = [
  { value: 'Under $250k a year', title: 'Under $250k a year', tier: 'not-qualified' },
  { value: '$250k to $1M a year', title: '$250k to $1M a year', tier: 'not-qualified' },
  { value: '$1M to $5M a year', title: '$1M to $5M a year', tier: 'qualified' },
  { value: '$5M+ a year', title: '$5M+ a year', tier: 'qualified' },
]

export const ABC_REVENUE_BANDS: readonly RevenueBand[] = [
  { value: '$1M+ / month', title: '$1M+ / month', tier: 'qualified' },
  { value: '$500k to $1M / month', title: '$500k to $1M / month', tier: 'qualified' },
  { value: '$250k to $500k / month', title: '$250k to $500k / month', tier: 'qualified' },
  { value: '$100k to $250k / month', title: '$100k to $250k / month', tier: 'qualified' },
  { value: '$25k to $100k / month', title: '$25k to $100k / month', tier: 'qualified' },
  { value: '$5k to $25k / month', title: '$5k to $25k / month', tier: 'not-qualified' },
]

export const ABC_TOP_BAND = '$1M+ / month'

export interface RoutedSession {

  readonly slug: string
  readonly path: string
  readonly name: string
  readonly duration: string

  readonly priceLabel: string
}

function routed(slug: 'free-call' | 'strategy'): RoutedSession {
  const session = sessions[slug]
  return {
    slug,
    path: `/book-now/${slug}`,
    name: session.sessionType,
    duration: session.duration,
    priceLabel: session.dealValue > 0 ? `$${session.dealValue}` : 'Free',
  }
}

export interface QualificationOutcome {
  readonly tier: QualificationTier

  readonly band: RevenueBand | null

  readonly revenue: string

  readonly offersFreeCall: boolean

  readonly urgent: boolean

  readonly session: RoutedSession

  readonly tags: readonly string[]

  readonly label: string

  readonly color: string
}

const OUTCOMES: Record<QualificationTier, () => Omit<QualificationOutcome, 'band' | 'revenue'>> = {
  qualified: () => ({
    tier: 'qualified',
    offersFreeCall: true,

    urgent: false,
    session: routed('free-call'),
    tags: ['Qualified', 'Free assessment call'],
    label: '🟢 QUALIFIED for the free 30-minute assessment',
    color: '#16a34a',
  }),
  review: () => ({
    tier: 'review',
    offersFreeCall: false,
    urgent: false,
    session: routed('strategy'),
    tags: ['Review', 'Decide manually'],
    label: '🟡 REVIEW, decide this one yourself',
    color: '#d97706',
  }),
  'not-qualified': () => ({
    tier: 'not-qualified',
    offersFreeCall: false,
    urgent: false,
    session: routed('strategy'),
    tags: ['Not qualified for free call', 'Strategy session fit'],
    label: '🔴 NOT QUALIFIED for the free call, route to the paid session',
    color: '#dc2626',
  }),
}

export function findRevenueBand(revenue: unknown): RevenueBand | null {
  const answer = String(revenue ?? '').trim().toLowerCase()
  if (!answer) return null
  return REVENUE_BANDS.find(b => b.value.toLowerCase() === answer) ?? null
}

export function qualify(revenue: unknown): QualificationOutcome {
  const band = findRevenueBand(revenue)

  const base = OUTCOMES[band?.tier ?? 'review']()

  const isTopBand = band?.value === TOP_BAND
  const outcome = isTopBand
    ? { ...base, urgent: true, tags: [...base.tags, 'URGENT'], label: `🟢 URGENT, ${TOP_BAND}, qualified for the free 30-minute assessment` }
    : base
  return { ...outcome, band, revenue: String(revenue ?? '').trim() }
}

export function qualifyAbc(revenue: unknown): QualificationOutcome {
  const answer = String(revenue ?? '').trim().toLowerCase()
  const band = ABC_REVENUE_BANDS.find(b => b.value.toLowerCase() === answer) ?? null
  const base = OUTCOMES[band?.tier ?? 'review']()
  const isTopBand = band?.value === ABC_TOP_BAND
  const outcome = isTopBand
    ? { ...base, urgent: true, tags: [...base.tags, 'URGENT'], label: `🟢 URGENT, ${ABC_TOP_BAND}, qualified` }
    : base
  return { ...outcome, band, revenue: String(revenue ?? '').trim() }
}

export function qualificationNote(outcome: QualificationOutcome): string {
  const answered = outcome.revenue || 'Not answered'
  return `Annual revenue: ${answered}\nQualification: ${outcome.label}`
}
