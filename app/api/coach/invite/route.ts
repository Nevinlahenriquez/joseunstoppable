import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest, createMagicToken } from '@/lib/auth'
import { coachDb, dbTable, COACH_ID } from '@/lib/coach/server'
import { NO_DB } from '@/lib/os-supabase'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'

export const runtime = 'nodejs'

// The coach's "Invitar" button: a personal link (14 days) the coach can send by
// WhatsApp, and the same link by email when Resend is set up.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const db = await coachDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const { clientId, email: send } = await req.json().catch(() => ({})) as { clientId?: string; email?: boolean }
  const { data } = await db.from(dbTable('clients')).select('data').eq('id', clientId ?? '').eq('coach_id', COACH_ID).maybeSingle()
  const client = data?.data as { email?: string; name?: string } | undefined
  if (!client?.email) return NextResponse.json({ ok: false, error: 'Este cliente no tiene email.' }, { status: 400 })
  const token = await createMagicToken(client.email)
  const url = `${req.nextUrl.origin}/api/coach/join?t=${encodeURIComponent(token)}`
  let emailed = false
  if (send) {
    const first = escapeHtml((client.name ?? '').split(' ')[0] || '')
    emailed = await sendEmail(client.email, 'Tu acceso a la app de entrenamiento',
      `<p>Hola ${first},</p><p>Aquí tienes tu acceso personal a la app: entrenamientos, nutrición y tu progreso en un solo sitio.</p><p><a href="${url}" style="display:inline-block;background:#2D6BFF;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Entrar a la app</a></p><p>El enlace es personal y vale 14 días. Después puedes pedir uno nuevo desde la pantalla de acceso.</p>`)
  }
  return NextResponse.json({ ok: true, url, emailed })
}
