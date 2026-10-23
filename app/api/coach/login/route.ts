import { NextRequest, NextResponse } from 'next/server'
import { createMagicToken } from '@/lib/auth'
import { coachDb, findClientByEmail } from '@/lib/coach/server'
import { sendEmail } from '@/lib/email'
import { callerKey, checkThrottle, recordFailure, THROTTLED_MESSAGE } from '@/lib/login-throttle'

export const runtime = 'nodejs'

// "Send me a login link". Always answers the same way, so it never tells a
// stranger who is a client.
export async function POST(req: NextRequest) {
  const key = callerKey(req.headers)
  if (checkThrottle(key).blocked) return NextResponse.json({ ok: false, error: THROTTLED_MESSAGE }, { status: 429 })
  const { email } = await req.json().catch(() => ({})) as { email?: string }
  const e = String(email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return NextResponse.json({ ok: false, error: 'Escribe un email válido.' }, { status: 400 })
  const db = await coachDb()
  if (!db) return NextResponse.json({ ok: true })
  const client = await findClientByEmail(db, e)
  if (!client) { recordFailure(key); return NextResponse.json({ ok: true }) }
  const token = await createMagicToken(e)
  const url = `${req.nextUrl.origin}/api/coach/join?t=${encodeURIComponent(token)}`
  await sendEmail(e, 'Tu enlace para entrar',
    `<p>Pulsa para entrar a tu app de entrenamiento:</p><p><a href="${url}" style="display:inline-block;background:#2D6BFF;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Entrar</a></p><p>Si no lo pediste, ignora este email.</p>`)
  return NextResponse.json({ ok: true })
}
