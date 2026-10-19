import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { gatherEventAnalytics, ruleInsights } from '@/lib/event-analytics'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({})) as { id?: string }
  if (!body.id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const a = await gatherEventAnalytics(db, body.id)
  if (!a) return NextResponse.json({ ok: false, error: 'Evento no encontrado' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    via: 'rules',
    insights: ruleInsights(a),
  })
}
