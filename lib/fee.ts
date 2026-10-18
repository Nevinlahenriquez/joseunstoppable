// The acquisition fee: a set amount for every NEW paying client whose first
// contact came from a paid Meta ad, inside the agreed window. A sale that came
// from a DM, a referral or organic content does not count.

export type FeeTier = { from: number; perClient: number }
export type FeeSettings = { startDate: string; months: number; tiers: FeeTier[]; currency: string }

export const DEFAULT_FEE: FeeSettings = { startDate: '', months: 3, tiers: [{ from: 1, perClient: 25 }], currency: 'EUR' }

// Overrides: email -> 'ad' | 'not-ad', set by hand when a tag is wrong.
export type FeeOverrides = Record<string, 'ad' | 'not-ad'>

export function windowEnd(s: FeeSettings): Date | null {
  if (!s.startDate) return null
  const d = new Date(s.startDate + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + s.months)
  return d
}

// Tiers are marginal: client N is billed at the tier that N falls in.
export function feeFor(count: number, tiers: FeeTier[]): number {
  const sorted = [...tiers].filter(t => t.from >= 1).sort((a, b) => a.from - b.from)
  let total = 0
  for (let n = 1; n <= count; n++) {
    const tier = sorted.filter(t => t.from <= n).pop()
    total += tier?.perClient ?? 0
  }
  return total
}
