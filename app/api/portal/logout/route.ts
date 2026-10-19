import { NextRequest, NextResponse } from 'next/server'
import { sessionCookieDomain } from '@/lib/auth'
import { PORTAL_COOKIE } from '@/lib/portal'

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/portal', req.url))
  res.cookies.set(PORTAL_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0, domain: sessionCookieDomain(req.headers.get('host')) })
  return res
}
