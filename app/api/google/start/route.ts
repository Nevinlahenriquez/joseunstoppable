import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { consentUrl, googleConfigured } from '@/lib/google-booking'

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.redirect(new URL('/admin/login', req.url))
  if (!googleConfigured()) return NextResponse.redirect(new URL('/admin/bookings?google=missing', req.url))
  const state = crypto.randomUUID()
  const res = NextResponse.redirect(consentUrl(req.nextUrl.origin, state))
  res.cookies.set('ju_g_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 })
  return res
}
