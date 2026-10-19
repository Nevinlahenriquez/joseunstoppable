import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminPassword, verifyPartnerPassword, verifyStaffPassword, createSessionToken, isAdminEmail, SESSION_COOKIE, sessionCookieDomain, type Role } from '@/lib/auth'
import { verifyAdminUser } from '@/lib/admin-users'
import { serviceDb } from '@/lib/os-supabase'
import { callerKey, checkThrottle, clearFailures, recordFailure, THROTTLED_MESSAGE } from '@/lib/login-throttle'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {

  const key = callerKey(req.headers)
  const gate = checkThrottle(key)
  if (gate.blocked) {
    return NextResponse.json(
      { ok: false, error: THROTTLED_MESSAGE },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } },
    )
  }

  const body = await req.json().catch(() => ({}))
  const password = typeof body.password === 'string' ? body.password : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : ''
  if (!password) {
    return NextResponse.json({ ok: false, error: 'missing password' }, { status: 400 })
  }

  // An email + password added in /admin/access, then the passcodes in Vercel.
  let fromDb: { email: string; role: Role } | null = null
  if (email) {
    const db = await serviceDb()
    if (db && await verifyAdminUser(db, email, password).catch(() => false)) fromDb = { email, role: 'admin' }
  }
  const owner = fromDb ?? verifyAdminPassword(password)

  const partner = verifyPartnerPassword(password)
  const staff = verifyStaffPassword(password)
  const result = owner ?? partner ?? staff

  await new Promise(r => setTimeout(r, 400))
  if (!result) {
    const after = recordFailure(key)
    return NextResponse.json(
      { ok: false, error: after.blocked ? THROTTLED_MESSAGE : 'not authorized' },
      after.blocked
        ? { status: 429, headers: { 'Retry-After': String(after.retryAfterSeconds) } }
        : { status: 401 },
    )
  }

  clearFailures(key)

  const isStaff = !owner && !partner && !!staff
  const token = await createSessionToken(result.email, result.role, isStaff, !!fromDb && !isAdminEmail(result.email))
  const res = NextResponse.json({ ok: true, redirect: result.role === 'partner' ? '/admin/projects' : '/admin' })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/', domain: sessionCookieDomain(req.headers.get('host')),
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
