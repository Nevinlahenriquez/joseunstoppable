import { NextRequest, NextResponse } from 'next/server'
import { serviceDb } from '@/lib/os-supabase'
import { detectSpam, SPAM_REJECTION } from '@/lib/anti-spam'
import { sendEmail, wrapEmail, detailRows, OWNER_EMAIL, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { answerRows, cleanAnswers, newToken, SECTIONS, sectionDone, str } from '@/lib/onboarding'
import { writeAnswersToDeal } from '@/lib/onboarding-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_RE = /^[a-z0-9]{8,40}$/
const noStore = { 'cache-control': 'no-store' }

// GET ?token=: the client's name and saved answers, so the link greets them
// and a second visit picks up where they left off. The first visit marks it opened.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!TOKEN_RE.test(token)) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404, headers: noStore })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ok: false, error: 'offline' }, { status: 503, headers: noStore })
  const { data } = await db.from('onboardings').select('id, name, status, answers, opened_at').eq('token', token).maybeSingle()
  if (!data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404, headers: noStore })
  if (!data.opened_at) {
    await db.from('onboardings')
      .update({ opened_at: new Date().toISOString(), ...(data.status === 'sent' ? { status: 'opened' } : {}) })
      .eq('id', data.id)
  }
  return NextResponse.json({ ok: true, name: data.name ?? '', status: data.status, answers: data.answers ?? null }, { headers: noStore })
}

// POST { token?, answers }: save the form. Without a token (the generic
// /onboarding link) a new row is created so José still sees it in the dashboard.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  if (detectSpam(b).spam) return NextResponse.json(SPAM_REJECTION.body, { status: SPAM_REJECTION.status })
  const answers = cleanAnswers(b.answers)
  if (!SECTIONS.every((_, i) => sectionDone(answers, i + 1))) {
    return NextResponse.json({ ok: false, error: 'Te falta algún dato.' }, { status: 400 })
  }
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ok: false, error: 'offline' }, { status: 503 })

  const now = new Date().toISOString()
  const token = typeof b.token === 'string' ? b.token : ''
  let row: { id: string; name: string | null; email: string | null; phone: string | null } | null = null
  let firstTime = true

  if (token) {
    if (!TOKEN_RE.test(token)) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
    const { data } = await db.from('onboardings').select('id, name, email, phone, deal_id, completed_at').eq('token', token).maybeSingle()
    if (!data) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
    firstTime = !data.completed_at
    const { error } = await db.from('onboardings')
      .update({ answers, status: 'completed', completed_at: now, opened_at: now, ...(data.name ? {} : { name: str(answers, 'nombre') }) })
      .eq('id', data.id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (data.deal_id) await writeAnswersToDeal(db, data.deal_id, answers).catch(() => {})
    row = data
  } else {
    const id = 'ob-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const insert = {
      id, token: newToken(), name: str(answers, 'nombre').slice(0, 120), status: 'completed', answers,
      source: 'link', created_at: now, opened_at: now, completed_at: now,
    }
    const { error } = await db.from('onboardings').insert(insert)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    row = { id, name: insert.name, email: null, phone: null }
  }

  const name = row.name || str(answers, 'nombre')
  const html = wrapEmail(
    firstTime ? 'Onboarding completado' : 'Onboarding actualizado',
    `<p>${escapeHtml(name)} ${firstTime ? 'ha rellenado' : 'ha actualizado'} su onboarding.</p>` +
      detailRows([['Email', row.email], ['WhatsApp', row.phone], ...answerRows(answers)]),
    { label: 'Abrir onboarding', href: `${SITE_URL}/admin/onboarding` },
  )
  await sendEmail(OWNER_EMAIL, `${firstTime ? 'Onboarding' : 'Onboarding actualizado'}: ${name}`, html).catch(() => false)
  return NextResponse.json({ ok: true })
}
