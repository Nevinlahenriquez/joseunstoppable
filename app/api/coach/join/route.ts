import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicToken, createSessionToken, SESSION_COOKIE, sessionCookieDomain, isAdminEmail } from '@/lib/auth'
import { coachDb, findClientByEmail } from '@/lib/coach/server'

export const runtime = 'nodejs'

// The personal link from an invite or a login email. Signs the client in for
// 30 days and sends them to onboarding (first time) or the app.
export async function GET(req: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin))
  const email = await verifyMagicToken(req.nextUrl.searchParams.get('t') ?? undefined)
  if (!email) return back('/app/login?e=link')
  const db = await coachDb()
  if (!db) return back('/app')
  const client = await findClientByEmail(db, email)
  if (!client && !isAdminEmail(email)) return back('/app/login?e=unknown')
  const token = await createSessionToken(email, isAdminEmail(email) ? 'admin' : 'client')
  const res = back(client && !client.data.intake ? '/app/onboarding' : '/app')
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    domain: sessionCookieDomain(req.headers.get('host')), maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
