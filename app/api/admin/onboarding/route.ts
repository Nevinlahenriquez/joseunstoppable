import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB, isMissingTable } from '@/lib/os-supabase'
import { newToken } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

const cap = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const MISSING = 'Falta la tabla de onboarding. Pulsa "Preparar base de datos" en Inicio.'

// GET [?email=]: every onboarding, newest first, or one contact's.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, onboardings: [] })
  const email = cap(req.nextUrl.searchParams.get('email'), 160).toLowerCase()
  let q = db.from('onboardings').select('*').order('created_at', { ascending: false }).limit(500)
  if (email) q = q.eq('email', email)
  const { data, error } = await q
  if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING, onboardings: [] })
  return NextResponse.json({ ok: !error, error: error?.message, onboardings: data ?? [] })
}

// POST { name, email?, phone?, dealId? }: activate onboarding for a client.
// A contact who already has one that is not finished gets the same link back.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const name = cap(b.name, 120)
  const email = cap(b.email, 160).toLowerCase()
  const phone = cap(b.phone, 40)
  const dealId = cap(b.dealId, 80)
  if (!name) return NextResponse.json({ ok: false, error: 'Pon el nombre del cliente.' }, { status: 400 })

  if (email) {
    const { data, error } = await db.from('onboardings').select('*').eq('email', email).neq('status', 'completed')
      .order('created_at', { ascending: false }).limit(1)
    if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING }, { status: 503 })
    if (data?.[0]) return NextResponse.json({ ok: true, onboarding: data[0], existing: true })
  }

  const row = {
    id: 'ob-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    token: newToken(), name, email: email || null, phone: phone || null, deal_id: dealId || null,
    status: 'sent', answers: null, source: 'dashboard', created_at: new Date().toISOString(),
  }
  const { error } = await db.from('onboardings').insert(row)
  if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING }, { status: 503 })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, onboarding: row })
}

// DELETE ?id=: remove one (the link stops working).
export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const id = cap(req.nextUrl.searchParams.get('id'), 80)
  if (!id) return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  const { error } = await db.from('onboardings').delete().eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}
