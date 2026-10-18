// The acquisition fee on NEW paying clients whose first contact came from a
// paid Meta ad, inside the agreed window. A sale that came from a DM, a
// referral or organic content does not count.
//
// Two modes: a flat amount per client, or a percentage of what each client
// pays inside the window. Tiers are by client number: client N is billed at
// the tier N falls in (default 10% from the first client, one tier).

export type FeeTier = { from: number; perClient: number; percent: number }
export type FeeSettings = { startDate: string; months: number; mode: 'flat' | 'percent'; tiers: FeeTier[]; currency: string }

export const DEFAULT_FEE: FeeSettings = {
  startDate: '', months: 3, mode: 'percent', currency: 'EUR',
  tiers: [{ from: 1, perClient: 50, percent: 10 }],
}

export type FeeOverrides = Record<string, 'ad' | 'not-ad'>

export function windowEnd(s: FeeSettings): Date | null {
  if (!s.startDate) return null
  const d = new Date(s.startDate + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + s.months)
  return d
}

export function tierFor(n: number, tiers: FeeTier[]): FeeTier | undefined {
  return [...tiers].filter(t => t.from >= 1 && t.from <= n).sort((a, b) => a.from - b.from).pop()
}

// clients: the counted clients in order of their first payment, with what each
// paid inside the window. Returns the fee per client and the total.
export function feeLines(clients: { revenue: number }[], s: FeeSettings): { fee: number; rate: string }[] {
  return clients.map((c, i) => {
    const t = tierFor(i + 1, s.tiers)
    if (!t) return { fee: 0, rate: '0' }
    if (s.mode === 'percent') return { fee: Math.round(c.revenue * t.percent) / 100, rate: `${t.percent}%` }
    return { fee: t.perClient, rate: `${t.perClient} ${s.currency}` }
  })
}
