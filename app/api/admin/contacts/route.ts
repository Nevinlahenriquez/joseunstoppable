import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB, isMissingTable } from '@/lib/os-supabase'
import { syncContacts } from '@/lib/contacts-db'

export const dynamic = 'force-dynamic'

const MISSING = 'Falta la tabla de contactos. Pulsa "Preparar base de datos" en Inicio.'
const cap = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// GET: bring `contacts` up to date with every other table, then return it.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, contacts: [] })
  const r = await syncContacts(db)
  const error = r.error && /contacts/.test(r.error) && /exist|find/i.test(r.error) ? MISSING : r.error
  return NextResponse.json({ ok: r.ok, error, written: r.written, contacts: r.contacts })
}

// PATCH { id, notes?, tags?, invoiceshift_customer_id? }: the fields José keeps by hand.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const id = cap(b.id, 200).toLowerCase()
  if (!id) return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('notes' in b) patch.notes = cap(b.notes, 4000) || null
  if ('invoiceshift_customer_id' in b) patch.invoiceshift_customer_id = cap(b.invoiceshift_customer_id, 120) || null
  if (Array.isArray(b.tags)) patch.tags = b.tags.filter((t): t is string => typeof t === 'string').map(t => t.trim().slice(0, 40)).filter(Boolean).slice(0, 30)
  const { error } = await db.from('contacts').update(patch).eq('id', id)
  if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING }, { status: 503 })
  return NextResponse.json({ ok: !error, error: error?.message })
}
