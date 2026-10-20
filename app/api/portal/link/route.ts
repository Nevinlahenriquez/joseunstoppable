import { NextRequest, NextResponse } from 'next/server'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { accessFor, normEmail, sendSignInLink } from '@/lib/portal-server'
import { detectSpam } from '@/lib/anti-spam'
import { callerKey, checkThrottle, recordFailure } from '@/lib/login-throttle'

export const runtime = 'nodejs'

// POST { email }: email a paying client a one-time sign-in link. Anyone else
// is told they are not a client yet, so the page can send them to join or
// book a call. Bots (honeypot, too fast) get a quiet ok and no email.
export async function POST(req: NextRequest) {
  const key = callerKey(req.headers)
  const gate = checkThrottle(key)
  if (gate.blocked) return NextResponse.json({ ok: false, error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const email = normEmail(b.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: 'Escribe un email válido.' }, { status: 400 })
  recordFailure(key)
  if (detectSpam(b).spam) return NextResponse.json({ ok: true })
  const access = await accessFor(db, email).catch(() => null)
  if (!access?.active) return NextResponse.json({ ok: false, notClient: true })
  const sent = await sendSignInLink(db, access)
  if (!sent) return NextResponse.json({ ok: false, error: 'No se pudo enviar el email. Inténtalo otra vez en un momento.' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
