import { NextRequest, NextResponse } from 'next/server'
import { coachDb, viewerFor, isTable, dbTable, canRead, CLIENT_WRITE, CLIENT_DELETE, CLIENT_SELF_FIELDS, type Viewer } from '@/lib/coach/server'
import { NO_DB } from '@/lib/os-supabase'
import type { TableName } from '@/lib/coach/types'

export const runtime = 'nodejs'

type Row = { id: string; coach_id: string; client_id: string | null; data: Record<string, unknown>; created_at?: string }

const deny = (msg = 'No autorizado') => NextResponse.json({ ok: false, error: msg }, { status: 403 })

/** The client id column: the client table points at itself so one rule covers every table. */
function clientIdOf(table: TableName, row: Record<string, unknown>): string | null {
  if (table === 'clients') return String(row.id)
  if (table === 'coaches') return null
  const c = row.clientId
  return typeof c === 'string' && c ? c : null
}

export async function GET(req: NextRequest) {
  const db = await coachDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const v = await viewerFor(req, db)
  if (!v) return deny()
  const sp = req.nextUrl.searchParams
  const table = sp.get('table')
  if (!isTable(table)) return NextResponse.json({ ok: false, error: 'bad table' }, { status: 400 })

  let q = db.from(dbTable(table)).select('id,coach_id,client_id,data').eq('coach_id', v.coachId)
  const id = sp.get('id')
  if (id) q = q.eq('id', id)
  const clientId = sp.get('clientId')
  if (clientId === 'null') q = q.is('client_id', null)
  else if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q.limit(5000)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const rows = ((data ?? []) as Row[]).filter(r => canRead(v, table, r)).map(r => r.data)
  return NextResponse.json({ ok: true, rows })
}

export async function PUT(req: NextRequest) {
  const db = await coachDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const v = await viewerFor(req, db)
  if (!v) return deny()
  const body = await req.json().catch(() => null) as { table?: string; row?: Record<string, unknown> } | null
  const table = body?.table
  let row = body?.row
  if (!isTable(table) || !row || typeof row.id !== 'string' || !row.id) {
    return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  }
  row = { ...row, coachId: v.coachId }

  const guarded = await guardClientWrite(v, table, row, db)
  if (guarded instanceof NextResponse) return guarded
  row = guarded

  const rec: Row = { id: String(row.id), coach_id: v.coachId, client_id: clientIdOf(table, row), data: row }
  const { error } = await db.from(dbTable(table)).upsert(rec)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

async function guardClientWrite(v: Viewer, table: TableName, row: Record<string, unknown>, db: NonNullable<Awaited<ReturnType<typeof coachDb>>>) {
  if (v.role === 'coach') return row
  // An existing row must already be theirs (no taking over someone else's id).
  const { data: existing } = await db.from(dbTable(table)).select('client_id,data').eq('id', row.id as string).maybeSingle()
  if (existing && existing.client_id !== v.clientId) return deny()

  if (table === 'clients') {
    if (row.id !== v.clientId || !existing) return deny()
    const before = (existing.data ?? {}) as Record<string, unknown>
    const next: Record<string, unknown> = { ...before }
    for (const f of CLIENT_SELF_FIELDS) if (f in row) next[f] = row[f]
    if (before.status === 'invited' && next.intake) next.status = 'active'
    return next
  }
  if (!CLIENT_WRITE.includes(table)) return deny()
  const out: Record<string, unknown> = { ...row, clientId: v.clientId }
  if (table === 'messages') out.from = 'client'
  return out
}

export async function DELETE(req: NextRequest) {
  const db = await coachDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const v = await viewerFor(req, db)
  if (!v) return deny()
  const table = req.nextUrl.searchParams.get('table')
  const id = req.nextUrl.searchParams.get('id')
  if (!isTable(table) || !id) return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  let q = db.from(dbTable(table)).delete().eq('id', id).eq('coach_id', v.coachId)
  if (v.role === 'client') {
    if (!CLIENT_DELETE.includes(table)) return deny()
    q = q.eq('client_id', v.clientId)
  }
  const { error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
