import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminRequest, verifySessionToken, SESSION_COOKIE } from '@/lib/auth'
import { serviceDb } from '@/lib/os-supabase'
import { TABLE_NAMES, type TableName } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// WHO MAY SEE WHAT in the coaching app. Every table is deny-all in Supabase;
// only these routes read or write, with the service key, after this check.
//
// coach  = an admin session (José, or anyone on OS_ALLOWED_EMAILS). Sees all.
// client = a session whose email matches one client record. Sees only their
//          own rows, plus the coach's exercise library, brand and shared
//          resources. Writes only what a client produces (logs, metrics,
//          photos, messages, check-ins, their own intake).
// ─────────────────────────────────────────────────────────────────────────────

/** One coach per deployment today. A second coach is a second deployment (white label). */
export const COACH_ID = process.env.COACH_ID || 'coach-main'
export const PHOTO_BUCKET = 'coach-photos'

export type Viewer =
  | { role: 'coach'; coachId: string; email: string }
  | { role: 'client'; coachId: string; clientId: string; email: string; name: string }

export const dbTable = (t: TableName) => `coach_${t}`

export function isTable(t: unknown): t is TableName {
  return typeof t === 'string' && (TABLE_NAMES as string[]).includes(t)
}

export async function findClientByEmail(db: SupabaseClient, email: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const { data } = await db.from(dbTable('clients')).select('id,data').eq('coach_id', COACH_ID).ilike('data->>email', email.trim()).limit(1)
  return data?.[0] ? { id: data[0].id as string, data: (data[0].data ?? {}) as Record<string, unknown> } : null
}

export async function viewerFor(req: NextRequest, db: SupabaseClient): Promise<Viewer | null> {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (await isAdminRequest(req)) return { role: 'coach', coachId: COACH_ID, email: session?.email ?? '' }
  if (!session?.email) return null
  const c = await findClientByEmail(db, session.email)
  if (!c) return null
  return { role: 'client', coachId: COACH_ID, clientId: c.id, email: session.email, name: String(c.data.name ?? '') }
}

/** Tables a client reads beyond their own rows. */
const CLIENT_SHARED_READ: TableName[] = ['coaches', 'exercises']
/** Tables a client may write, always stamped with their own id. */
const CLIENT_WRITE: TableName[] = ['logs', 'metrics', 'photos', 'messages', 'checkins']
const CLIENT_DELETE: TableName[] = ['photos', 'metrics']
/** The only fields a client may change on their own client record. */
const CLIENT_SELF_FIELDS = ['intake', 'targets', 'phone', 'avatarUrl', 'name', 'lang'] as const

export function canRead(v: Viewer, table: TableName, row: { client_id: string | null }): boolean {
  if (v.role === 'coach') return true
  if (CLIENT_SHARED_READ.includes(table)) return true
  if (table === 'resources') return row.client_id === null || row.client_id === v.clientId
  return row.client_id === v.clientId
}

export { CLIENT_WRITE, CLIENT_DELETE, CLIENT_SELF_FIELDS }

export async function coachDb(): Promise<SupabaseClient | null> {
  return serviceDb()
}
