import { NextRequest, NextResponse } from 'next/server'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { accessFor, normEmail, sendSignInLink } from '@/lib/portal-server'
import { callerKey, checkThrottle, recordFailure } from '@/lib/login-throttle'

export const runtime = 'nodejs'

// POST { email }: email the client a one-time sign-in link. The answer is the
// same for any email, so nobody can probe who is a client.
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
  const access = await accessFor(db, email).catch(() => null)
  if (access?.active) await sendSignInLink(db, access)
  return NextResponse.json({ ok: true })
}
