import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB, isMissingTable } from '@/lib/os-supabase'

export const dynamic = 'force-dynamic'

export type Touchpoint = { id: string; at: string; kind: 'email' | 'from-client' | 'to-client'; text: string }

// GET ?email=: every email sent to this client and every portal message, newest first.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, items: [] })
  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase().slice(0, 160)
  if (!email) return NextResponse.json({ ok: false, error: 'email', items: [] }, { status: 400 })
  const [mails, msgs] = await Promise.all([
    db.from('email_log').select('id, subject, created_at').eq('email', email).order('created_at', { ascending: false }).limit(200),
    db.from('portal_messages').select('id, sender, body, created_at').eq('email', email).order('created_at', { ascending: false }).limit(200),
  ])
  const items: Touchpoint[] = [
    ...(mails.data ?? []).map(m => ({ id: m.id as string, at: m.created_at as string, kind: 'email' as const, text: m.subject as string })),
    ...(msgs.data ?? []).map(m => ({
      id: m.id as string, at: m.created_at as string,
      kind: m.sender === 'client' ? 'from-client' as const : 'to-client' as const, text: m.body as string,
    })),
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
  const missing = isMissingTable(mails.error) ? 'Pulsa "Preparar base de datos" en Inicio para empezar a guardar los emails.' : ''
  return NextResponse.json({ ok: true, items, missing })
}
