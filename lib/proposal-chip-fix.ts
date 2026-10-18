
const MORELA_COMPANY = 'MD Administration & Consulting Services'

const PREFIX = /^(Goal \d+,[^:]*:|Partnership:)\s*/i

export function hasGoalPrefix(services: unknown): boolean {
  return Array.isArray(services) && services.some(s => typeof s === 'string' && PREFIX.test(s))
}

export function stripGoalPrefixes(services: string[]): string[] {
  return services.map(s => {
    if (typeof s !== 'string' || !PREFIX.test(s)) return s
    const rest = s.replace(PREFIX, '')
    return rest.charAt(0).toUpperCase() + rest.slice(1)
  })
}

export function draftRowPatch(row: Record<string, unknown>): Record<string, unknown> | null {
  if (row.status !== 'draft') return null
  const patch: Record<string, unknown> = {}
  if (hasGoalPrefix(row.services)) patch.services = stripGoalPrefixes(row.services as string[])

  if (typeof row.intro === 'string' && row.intro.includes('a great session yesterday')) {
    patch.intro = row.intro.replace('thank you for a great session yesterday', 'thank you for our session')
  }

  if (row.token === 'morela-starter-program' && row.client_company !== MORELA_COMPANY) {
    patch.client_company = MORELA_COMPANY
  }
  return Object.keys(patch).length ? patch : null
}
