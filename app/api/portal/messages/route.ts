import { NextRequest, NextResponse } from 'next/server'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { accessFor, notifyNewQuestion, readPortalSession } from '@/lib/portal-server'
import { PORTAL_COOKIE } from '@/lib/portal'

export const runtime = 'nodejs'

// POST { body }: a signed-in client sends José a question. José gets an email.
export async function POST(req: NextRequest) {
  const email = await readPortalSession(req.cookies.get(PORTAL_COOKIE)?.value)
  if (!email) return NextResponse.json({ ok: false, error: 'Tu sesión ha caducado. Vuelve a entrar.' }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const access = await accessFor(db, email)
  if (!access?.active) return NextResponse.json({ ok: false }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const body = typeof b.body === 'string' ? b.body.trim().slice(0, 4000) : ''
  if (!body) return NextResponse.json({ ok: false, error: 'Escribe tu pregunta.' }, { status: 400 })

  // At most 20 questions a day, so a stuck button can't flood José's inbox.
  const since = new Date(Date.now() - 86400000).toISOString()
  const { count } = await db.from('portal_messages').select('id', { count: 'exact', head: true })
    .eq('email', email).eq('sender', 'client').gte('created_at', since)
  if ((count ?? 0) >= 20) return NextResponse.json({ ok: false, error: 'Has enviado muchas preguntas hoy. Escríbele a José por WhatsApp.' }, { status: 429 })

  const row = { id: 'pm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), email, sender: 'client', body, read_at: null, created_at: new Date().toISOString() }
  const { error } = await db.from('portal_messages').insert(row)
  if (error) return NextResponse.json({ ok: false, error: 'No se pudo enviar. Inténtalo otra vez.' }, { status: 500 })
  await notifyNewQuestion(access, body).catch(() => {})
  return NextResponse.json({ ok: true, message: row })
}
