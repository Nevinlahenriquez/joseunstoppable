import { NextRequest, NextResponse } from 'next/server'
import { serviceDb } from '@/lib/os-supabase'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

// POST { type: 'proposal', token } | { type: 'invoice', id }: stamps viewed_at
// the first time a client opens the link, so the dashboard can show "Abierta".
// Opens by a logged-in admin don't count.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
    if (session) return NextResponse.json({ ok: true })
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const type = body.type === 'proposal' ? 'proposals' : body.type === 'invoice' ? 'invoices' : null
    const col = type === 'proposals' ? 'token' : 'id'
    const val = typeof (type === 'proposals' ? body.token : body.id) === 'string' ? String(type === 'proposals' ? body.token : body.id).slice(0, 120) : ''
    if (!type || !val) return NextResponse.json({ ok: false }, { status: 400 })
    const db = await serviceDb()
    if (!db) return NextResponse.json({ ok: true })
    await db.from(type).update({ viewed_at: new Date().toISOString() }).eq(col, val).is('viewed_at', null)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
