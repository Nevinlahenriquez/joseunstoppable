import type { SupabaseClient } from '@supabase/supabase-js'

// No membership grants free seats here.
export const CIRCLE_SEAT_NOTE = ''
export async function isCircleMember(_db: SupabaseClient, _email: string): Promise<boolean> {
  return false
}
