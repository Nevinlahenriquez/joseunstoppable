import { NextRequest, NextResponse } from 'next/server'
import { createAdminLinkToken, readToken, isAdminEmail, createSessionToken, SESSION_COOKIE, sessionCookieDomain } from '@/lib/auth'
import { isKnownAdmin } from '@/lib/admin-users'
import { serviceDb } from '@/lib/os-supabase'
import { callerKey, checkThrottle, recordFailure, THROTTLED_MESSAGE } from '@/lib/login-throttle'
import { sendEmail, emailShell, SITE_URL } from '@/lib/email'

export const runtime = 'nodejs'

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/+$/, '')
}

function linkEmail(url: string): string {
  return emailShell({
    eyebrow: 'Panel de José',
    title: 'Tu enlace para entrar',
    preview: 'Un toque y estás dentro. Caduca en 15 minutos.',
    body: '<p>Pulsa el botón para abrir tu panel. El enlace funciona durante <strong>15 minutos</strong> y solo una vez.</p>',
    cta: { label: 'Abrir el panel', href: url },
    note: 'Si no lo has pedido tú, ignora este email. Nadie puede entrar sin él.',
    showFooterLinks: false,
  })
}

// Sends a one-tap sign-in link to an admin email. The answer is the same for
// any address so the form can't be used to find out which emails are admins.
export async function POST(req: NextRequest) {
  const key = callerKey(req.headers)
  const gate = checkThrottle(key)
  if (gate.blocked) {
    return NextResponse.json(
      { ok: false, error: THROTTLED_MESSAGE },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSeconds) } },
    )
  }

  const { email } = await req.json().catch(() => ({}))
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ ok: false, error: 'missing email' }, { status: 400 })
  }

  // Every request counts toward the limit, so nobody can flood an inbox.
  recordFailure(key)

  const clean = email.trim().toLowerCase()
  // Owner emails from Vercel and anyone added in /admin/access.
  if (await isKnownAdmin(await serviceDb(), clean)) {
    const token = await createAdminLinkToken(clean)
    const url = `${siteOrigin()}/api/auth/login-link?token=${encodeURIComponent(token)}`
    const sent = await sendEmail(clean, 'Your sign-in link · José Unstoppable', linkEmail(url))
    if (!sent) return NextResponse.json({ ok: false, error: 'email failed' }, { status: 502 })
  } else {
    await new Promise(r => setTimeout(r, 400))
  }
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const p = await readToken(req.nextUrl.searchParams.get('token') ?? undefined, 'admin-link')
  const email = typeof p?.email === 'string' ? p.email : ''
  if (!email || !(await isKnownAdmin(await serviceDb(), email))) {
    return NextResponse.redirect(new URL('/admin/login?link=expired', req.url))
  }
  const session = await createSessionToken(email, 'admin', false, !isAdminEmail(email))
  const res = NextResponse.redirect(new URL('/admin', req.url))
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/', domain: sessionCookieDomain(req.headers.get('host')),
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
