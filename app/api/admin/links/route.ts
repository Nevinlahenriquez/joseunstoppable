import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { safeHref } from '@/lib/bio-links'

export const dynamic = 'force-dynamic'

// GET: every link plus its click count, and page views, over the last 30 days.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, links: [], views: 0, clicks: {} })
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const [{ data: links, error }, { data: ev }] = await Promise.all([
    db.from('bio_links').select('*').order('position', { ascending: true }),
    db.from('funnel_events').select('step,path').eq('funnel_id', 'links').gte('created_at', since).limit(20000),
  ])
  const clicks: Record<string, number> = {}
  let views = 0
  for (const e of ev ?? []) {
    if (e.step === 'view') views++
    else if (e.step === 'click' && e.path?.startsWith('/l/')) { const id = e.path.slice(3); clicks[id] = (clicks[id] ?? 0) + 1 }
  }
  return NextResponse.json({ ok: !error, error: error?.message, links: links ?? [], views, clicks })
}

// PUT { links }: replace the whole list (order = position).
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const body = await req.json().catch(() => ({}))
  const raw = Array.isArray(body.links) ? body.links : []
  const rows = []
  for (let i = 0; i < raw.length && i < 50; i++) {
    const l = raw[i] ?? {}
    const label = String(l.label ?? '').trim().slice(0, 80)
    const url = String(l.url ?? '').trim().slice(0, 500)
    if (!label || !url) continue
    if (!safeHref(url)) return NextResponse.json({ ok: false, error: `Enlace no válido: ${url}` }, { status: 400 })
    rows.push({ id: typeof l.id === 'string' && l.id ? l.id.slice(0, 60) : crypto.randomUUID(), label, url, position: i, active: l.active !== false, highlight: !!l.highlight })
  }
  const { data: existing } = await db.from('bio_links').select('id')
  const keep = new Set(rows.map(r => r.id))
  const gone = (existing ?? []).map(r => r.id).filter(id => !keep.has(id))
  if (gone.length) await db.from('bio_links').delete().in('id', gone)
  if (rows.length) {
    const { error } = await db.from('bio_links').upsert(rows)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, links: rows })
}
