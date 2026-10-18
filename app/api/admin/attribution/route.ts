import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { readSetting, writeSetting } from '@/lib/app-settings'
import { AD_TAG, AD_URL_PARAMS, CHANNEL_TAGS, channelOf } from '@/lib/lead-attribution'
import { DEFAULT_FEE, feeFor, windowEnd, type FeeOverrides, type FeeSettings } from '@/lib/fee'

export const dynamic = 'force-dynamic'

const key = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '')
const tagsOf = (t: unknown): string[] => (Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : [])

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const [fee, overrides] = await Promise.all([readSetting<FeeSettings>('fee', DEFAULT_FEE), readSetting<FeeOverrides>('fee-overrides', {})])
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, fee, overrides, adParams: AD_URL_PARAMS })

  const [leads, deals, bookings, invoices] = await Promise.all([
    db.from('leads').select('email,tags,created_at').limit(10000),
    db.from('deals').select('client_email,client_name,tags,created_at').limit(10000),
    db.from('bookings').select('email,source,status,start_at').limit(10000),
    db.from('invoices').select('client_email,client_name,status,paid_at,amount_paid,line_items,currency,deleted_at,number').limit(10000),
  ])

  // One channel per person: the first channel tag seen on their lead or deal.
  const channel = new Map<string, string>()
  const names = new Map<string, string>()
  const seen = [...(leads.data ?? []).map(l => ({ e: key(l.email), tags: tagsOf(l.tags), at: l.created_at })),
    ...(deals.data ?? []).map(d => ({ e: key(d.client_email), tags: tagsOf(d.tags), at: d.created_at, name: d.client_name }))]
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
  for (const s of seen) {
    if (!s.e) continue
    if ('name' in s && s.name && !names.has(s.e)) names.set(s.e, String(s.name))
    if (!channel.has(s.e) && s.tags.some(t => (CHANNEL_TAGS as readonly string[]).includes(t))) channel.set(s.e, channelOf(s.tags))
  }
  const chanOf = (e: string) => channel.get(e) ?? 'Directo'
  const isAd = (e: string) => overrides[e] ? overrides[e] === 'ad' : chanOf(e) === AD_TAG

  const tally = () => Object.fromEntries(CHANNEL_TAGS.map(c => [c, 0])) as Record<string, number>
  const leadsBy = tally()
  for (const e of new Set(seen.map(s => s.e).filter(Boolean))) leadsBy[chanOf(e)]++
  const callsBy = tally()
  for (const b of bookings.data ?? []) if (b.status !== 'cancelled') callsBy[(CHANNEL_TAGS as readonly string[]).includes(b.source) ? b.source : chanOf(key(b.email))]++

  // Paying clients: first paid invoice per email.
  const firstPaid = new Map<string, { at: string; name: string; total: number }>()
  for (const inv of invoices.data ?? []) {
    if (inv.status !== 'paid' || inv.deleted_at) continue
    const e = key(inv.client_email); if (!e) continue
    const at = inv.paid_at ?? ''
    const sum = Array.isArray(inv.line_items) ? inv.line_items.reduce((a: number, li: { qty?: number; price?: number; quantity?: number; unitPrice?: number }) => a + (Number(li.qty ?? li.quantity ?? 1) * Number(li.price ?? li.unitPrice ?? 0)), 0) : 0
    const prev = firstPaid.get(e)
    if (!prev || (at && at < prev.at)) firstPaid.set(e, { at, name: inv.client_name || names.get(e) || e, total: (prev?.total ?? 0) + sum })
    else prev.total += sum
  }
  const start = fee.startDate ? new Date(fee.startDate + 'T00:00:00Z').toISOString() : ''
  const end = windowEnd(fee)?.toISOString() ?? ''
  const clients = [...firstPaid.entries()].map(([email, v]) => {
    const inWindow = !!start && !!v.at && v.at >= start && v.at < end
    return { email, name: v.name, firstPaidAt: v.at, revenue: Math.round(v.total * 100) / 100, channel: chanOf(email), ad: isAd(email), overridden: !!overrides[email], inWindow }
  }).sort((a, b) => b.firstPaidAt.localeCompare(a.firstPaidAt))
  const counted = clients.filter(c => c.ad && c.inWindow).length
  const paidBy = tally()
  for (const c of clients) paidBy[c.ad ? AD_TAG : c.channel === AD_TAG ? 'Directo' : c.channel]++

  return NextResponse.json({
    ok: true, fee, overrides, adParams: AD_URL_PARAMS, channels: CHANNEL_TAGS,
    leadsBy, callsBy, paidBy, clients, counted, feeTotal: feeFor(counted, fee.tiers), windowEnd: end,
  })
}

// PUT { fee?, override?: { email, value: 'ad'|'not-ad'|null } }
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  if (body.fee) {
    const f = body.fee
    const tiers = (Array.isArray(f.tiers) ? f.tiers : []).map((t: { from?: unknown; perClient?: unknown }) => ({ from: Math.max(1, Math.round(Number(t.from) || 1)), perClient: Math.max(0, Number(t.perClient) || 0) })).slice(0, 10)
    const clean: FeeSettings = {
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(f.startDate ?? '') ? f.startDate : '',
      months: Math.min(36, Math.max(1, Math.round(Number(f.months) || 3))),
      tiers: tiers.length ? tiers : DEFAULT_FEE.tiers,
      currency: typeof f.currency === 'string' ? f.currency.slice(0, 3).toUpperCase() : 'EUR',
    }
    if (!(await writeSetting('fee', clean)).ok) return NextResponse.json({ ok: false, error: 'No se guardó' }, { status: 500 })
  }
  if (body.override?.email) {
    const o = await readSetting<FeeOverrides>('fee-overrides', {})
    const e = key(body.override.email)
    if (body.override.value === 'ad' || body.override.value === 'not-ad') o[e] = body.override.value
    else delete o[e]
    if (!(await writeSetting('fee-overrides', o)).ok) return NextResponse.json({ ok: false, error: 'No se guardó' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
