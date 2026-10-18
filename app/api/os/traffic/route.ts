import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'

export const dynamic = 'force-dynamic'

const LIMIT = 20000

function sourceOf(path: string | null, referrer: string | null): string {
  const q = path?.includes('?') ? new URLSearchParams(path.slice(path.indexOf('?') + 1)) : null
  const utm = q?.get('utm_source')
  if (utm) return utm.toLowerCase()
  if (!referrer) return 'directo'
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '')
    if (/(^|\.)(facebook|fb|instagram|l\.instagram)\.com$/.test(host) || host === 'lm.facebook.com') return host.includes('instagram') ? 'instagram' : 'facebook'
    if (host.startsWith('google.')) return 'google'
    return host
  } catch {
    return 'directo'
  }
}

// GET ?days=30: visitors, page views, leads and conversion from funnel_events.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30))
  const empty = { days, totals: { visitors: 0, pageViews: 0, leads: 0, purchases: 0, conversion: 0 }, series: [], topPages: [], sources: [], funnels: [] }
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, ...empty })

  const since = new Date(Date.now() - days * 864e5)
  const { data, error } = await db
    .from('funnel_events')
    .select('visitor_id, funnel_id, step, path, referrer, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(LIMIT)
  if (error) return NextResponse.json({ ok: false, error: error.message, ...empty })

  const rows = data ?? []
  const visitors = new Set<string>()
  const byDay = new Map<string, { v: Set<string>; views: number }>()
  const pages = new Map<string, { views: number; v: Set<string> }>()
  const sources = new Map<string, Set<string>>()
  const funnels = new Map<string, { v: Set<string>; clicks: number; leads: number; purchases: number }>()
  let pageViews = 0, leads = 0, purchases = 0

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 864e5).toISOString().slice(0, 10)
    byDay.set(d, { v: new Set(), views: 0 })
  }

  for (const r of rows) {
    const vid = r.visitor_id || 'anon'
    const f = funnels.get(r.funnel_id) ?? { v: new Set(), clicks: 0, leads: 0, purchases: 0 }
    funnels.set(r.funnel_id, f)
    if (r.step === 'view') {
      pageViews++
      visitors.add(vid)
      f.v.add(vid)
      const day = byDay.get(String(r.created_at).slice(0, 10))
      if (day) { day.views++; day.v.add(vid) }
      const path = (r.path || '/').split('?')[0]
      const p = pages.get(path) ?? { views: 0, v: new Set() }
      p.views++; p.v.add(vid); pages.set(path, p)
      const src = sourceOf(r.path, r.referrer)
      const s = sources.get(src) ?? new Set(); s.add(vid); sources.set(src, s)
    } else if (r.step === 'click') f.clicks++
    else if (r.step === 'lead') { leads++; f.leads++ }
    else if (r.step === 'purchase') { purchases++; f.purchases++ }
  }

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
  return NextResponse.json({
    ok: true,
    days,
    capped: rows.length >= LIMIT,
    totals: { visitors: visitors.size, pageViews, leads, purchases, conversion: pct(leads, visitors.size) },
    series: [...byDay].map(([day, d]) => ({ day, visitors: d.v.size, views: d.views })),
    topPages: [...pages].map(([path, p]) => ({ path, views: p.views, visitors: p.v.size })).sort((a, b) => b.views - a.views).slice(0, 10),
    sources: [...sources].map(([source, s]) => ({ source, visitors: s.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 10),
    funnels: [...funnels].map(([funnelId, f]) => ({ funnelId, visitors: f.v.size, clicks: f.clicks, leads: f.leads, purchases: f.purchases, conversion: pct(f.leads, f.v.size) })).sort((a, b) => b.visitors - a.visitors),
  })
}
