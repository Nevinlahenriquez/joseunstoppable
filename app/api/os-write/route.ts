import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { CLIENT_STAGES, ensureOnboarding, startFromPayment } from '@/lib/onboarding-server'

export const runtime = 'nodejs'

const ALLOWED = new Set(['leads', 'deals', 'proposals', 'invoices', 'events', 'event_attendees', 'offers'])

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { op, table, row, id } = body as { op?: string; table?: string; row?: Record<string, unknown>; id?: string }

  if (!table || !ALLOWED.has(table)) return NextResponse.json({ ok: false, error: 'bad table' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ ok: false, error: 'no supabase config' }, { status: 500 })

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key)

    if (op === 'upsert') {
      if (!row || !row.id) return NextResponse.json({ ok: false, error: 'missing row' }, { status: 400 })
      // A payment confirmed (invoice now paid) or a deal marked Won starts the
      // client's onboarding: link emailed to them, coach told, once.
      let watch = (table === 'invoices' && row.status === 'paid') || (table === 'deals' && CLIENT_STAGES.includes(String(row.stage ?? '')))
      const prev = watch ? await sb.from(table).select(table === 'invoices' ? 'status' : 'stage').eq('id', row.id).maybeSingle() : null
      // If the old row can't be read, don't guess: save normally and start nothing.
      const before = (prev?.data ?? null) as { status?: string; stage?: string } | null
      if (prev?.error) watch = false
      const { error } = await sb.from(table).upsert(row, { onConflict: 'id' })
      if (error) return NextResponse.json({ ok: false, error: error.message })
      if (watch) {
        const ob = table === 'invoices'
          ? (before?.status !== 'paid' ? await startFromPayment(sb, row).catch(() => null) : null)
          : (!CLIENT_STAGES.includes(String(before?.stage ?? ''))
              ? await ensureOnboarding(sb, { dealId: String(row.id), name: row.client_name as string, email: row.client_email as string, phone: row.client_phone as string, service: row.service as string, amount: Number(row.value) || null, currency: row.currency as string, trigger: 'stage' }).catch(() => null)
              : null)
        if (ob) return NextResponse.json({ ok: true, onboarding: { token: ob.row.token, created: ob.created, emailed: ob.emailed } })
      }
      return NextResponse.json({ ok: true })
    }
    if (op === 'delete') {
      if (!id) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) return NextResponse.json({ ok: false, error: error.message })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: 'bad op' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
