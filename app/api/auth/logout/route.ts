import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieDomain } from '@/lib/auth'

const ALLOWED = new Set(['/login', '/admin/login', '/portal', '/'])

function clear(req: NextRequest) {
  const wanted = req.nextUrl.searchParams.get('next')
  const dest = wanted && ALLOWED.has(wanted) ? wanted : '/admin/login'
  const res = NextResponse.redirect(new URL(dest, req.url))
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })

  const domain = sessionCookieDomain(req.headers.get('host'))
  if (domain) {
    res.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Domain=${domain}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
  }
  return res
}

export async function POST(req: NextRequest) { return clear(req) }
export async function GET(req: NextRequest) { return clear(req) }
