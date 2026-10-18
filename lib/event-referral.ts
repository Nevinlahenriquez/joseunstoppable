import type { SupabaseClient } from '@supabase/supabase-js'

// Referral rewards are not part of this system. These keep the event flow's
// call sites unchanged so the code stays mergeable with the original.
export function newReferralCode(): string {
  return Math.random().toString(36).slice(2, 9)
}

export async function resolveReferrer(
  _db: SupabaseClient, _eventId: string, _ref: unknown, _email: string,
): Promise<{ attendeeId: string | null; partnerId: string | null }> {
  return { attendeeId: null, partnerId: null }
}

export function inviteEmailBlock(_o: { slug: string; code: string | null | undefined; price: number }): string {
  return ''
}

export async function afterSeatPaid(_db: SupabaseClient, _seat: unknown, _opts?: unknown): Promise<void> {}
