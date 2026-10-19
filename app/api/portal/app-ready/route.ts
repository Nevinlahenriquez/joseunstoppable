import { NextRequest, NextResponse } from 'next/server'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { readPortalSession } from '@/lib/portal-server'
import { PORTAL_COOKIE } from '@/lib/portal'

export const runtime = 'nodejs'

// POST: the signed-in client says they already have their app account, so
// the portal sends them straight into the app from now on.
export async function POST(req: NextRequest) {
  const email = await readPortalSession(req.cookies.get(PORTAL_COOKIE)?.value)
  if (!email) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const { error } = await db.from('portal_access').update({ app_ready: true }).eq('id', email).eq('active', true)
  return NextResponse.json({ ok: !error })
}
