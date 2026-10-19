import { NextRequest, NextResponse } from 'next/server'
import { createAdminLinkToken, verifyAdminLinkToken, isAdminEmail, createSessionToken, SESSION_COOKIE, sessionCookieDomain } from '@/lib/auth'
import { callerKey, checkThrottle, recordFailure, THROTTLED_MESSAGE } from '@/lib/login-throttle'
import { sendEmail, SITE_URL, LOGO_URL } from '@/lib/email'

export const runtime = 'nodejs'

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/+$/, '')
}

function linkEmail(url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#07040f;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
    <div style="border-radius:20px;padding:36px 30px;background:linear-gradient(135deg,#1a0b3d 0%,#0b2a4a 55%,#0E71AC 100%);color:#fff;">
      <img src="${LOGO_URL}" alt="José Unstoppable" width="44" height="44" style="display:block;border-radius:11px;margin:0 0 22px;" />
      <h1 style="font-size:22px;margin:0 0 10px;">Your sign-in link</h1>
      <p style="font-size:15px;line-height:1.55;color:rgba(255,255,255,.8);margin:0 0 26px;">Tap the button to open your admin dashboard. The link works for 15 minutes.</p>
      <a href="${url}" style="display:inline-block;padding:14px 26px;border-radius:12px;background:#fff;color:#1a0b3d;font-weight:700;font-size:15px;text-decoration:none;">Open the dashboard</a>
      <p style="font-size:12px;color:rgba(255,255,255,.55);margin:28px 0 0;">If you didn't ask for this, ignore this email. Nobody can sign in without it.</p>
    </div>
  </div></body></html>`
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
  if (isAdminEmail(clean)) {
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
  const email = await verifyAdminLinkToken(req.nextUrl.searchParams.get('token') ?? undefined)
  if (!email) {
    return NextResponse.redirect(new URL('/admin/login?link=expired', req.url))
  }
  const session = await createSessionToken(email, 'admin')
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
