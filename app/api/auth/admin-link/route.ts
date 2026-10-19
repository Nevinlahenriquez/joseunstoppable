import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, isAdminEmail, SESSION_COOKIE, sessionCookieDomain } from '@/lib/auth'
import { consumeAdminLink, sendAdminLink } from '@/lib/admin-users'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { callerKey, checkThrottle, recordFailure, THROTTLED_MESSAGE } from '@/lib/login-throttle'

export const runtime = 'nodejs'

// POST { email }: email an admin sign-in link (same answer whether or not the
// email is an admin, so it can't be used to guess who is one).
// POST { t }: open the link and sign in for 30 days.
export async function POST(req: NextRequest) {
  const key = callerKey(req.headers)
  const gate = checkThrottle(key)
  if (gate.blocked) return NextResponse.json({ ok: false, error: THROTTLED_MESSAGE }, { status: 429 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>

  if (typeof b.t === 'string' && b.t) {
    const email = await consumeAdminLink(db, b.t)
    if (!email) {
      recordFailure(key)
      return NextResponse.json({ ok: false, error: 'Este enlace ya se usó o ha caducado. Pide uno nuevo.' }, { status: 401 })
    }
    const token = await createSessionToken(email, 'admin', false, !isAdminEmail(email))
    const res = NextResponse.json({ ok: true, redirect: '/admin' })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      domain: sessionCookieDomain(req.headers.get('host')), maxAge: 60 * 60 * 24 * 30,
    })
    return res
  }

  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : ''
  if (!email.includes('@')) return NextResponse.json({ ok: false, error: 'Escribe tu email.' }, { status: 400 })
  recordFailure(key)
  await sendAdminLink(db, email).catch(() => false)
  return NextResponse.json({ ok: true })
}
