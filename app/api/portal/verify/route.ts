import { NextRequest, NextResponse } from 'next/server'
import { sessionCookieDomain } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { consumeSignInLink, createPortalSession } from '@/lib/portal-server'
import { PORTAL_COOKIE, PORTAL_SESSION_DAYS } from '@/lib/portal'

export const runtime = 'nodejs'

// POST { t }: open an emailed sign-in link and keep the client signed in.
// A POST (not the link itself) so email scanners that open links can't use it up.
export async function POST(req: NextRequest) {
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const email = typeof b.t === 'string' ? await consumeSignInLink(db, b.t) : null
  if (!email) return NextResponse.json({ ok: false, error: 'Este enlace ya se usó o ha caducado. Pide uno nuevo.' }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PORTAL_COOKIE, await createPortalSession(email), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    domain: sessionCookieDomain(req.headers.get('host')), maxAge: 60 * 60 * 24 * PORTAL_SESSION_DAYS,
  })
  return res
}
