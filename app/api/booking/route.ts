import { NextRequest, NextResponse } from 'next/server'
import { serviceDb } from '@/lib/os-supabase'
import { readSetting } from '@/lib/app-settings'
import { DEFAULT_AVAILABILITY, type Availability, computeSlots, slotLabelEs } from '@/lib/booking'
import { busyBlocks, createCallEvent } from '@/lib/google-booking'
import { channelTag } from '@/lib/lead-attribution'
import { sendCapiEvent } from '@/lib/meta-capi'
import { sendEmail, wrapEmail, detailRows, firstNameOf, OWNER_EMAIL, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { googleCalendarUtcUrl } from '@/lib/calendar-links'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cap = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

async function busyFromBookings(fromIso: string, toIso: string, duration: number) {
  const db = await serviceDb()
  if (!db) return []
  const { data } = await db.from('bookings').select('start_at, end_at').neq('status', 'cancelled').gte('start_at', fromIso).lte('start_at', toIso)
  return (data ?? []).map(b => ({ start: Date.parse(b.start_at), end: b.end_at ? Date.parse(b.end_at) : Date.parse(b.start_at) + duration * 60_000 }))
}

async function freeSlots(av: Availability) {
  const from = new Date().toISOString()
  const to = new Date(Date.now() + 45 * 86400_000).toISOString()
  const [own, google] = await Promise.all([busyFromBookings(from, to, av.duration), busyBlocks(from, to)])
  return computeSlots(av, [...own, ...(google ?? [])])
}

// GET: free slots for the next few days, in José's time zone.
export async function GET() {
  const av = await readSetting<Availability>('availability', DEFAULT_AVAILABILITY)
  const days = await freeSlots(av)
  return NextResponse.json({ ok: true, timeZone: av.timeZone, duration: av.duration, days }, { headers: { 'cache-control': 'no-store' } })
}

// POST: book a slot.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const name = cap(b.name, 120), email = cap(b.email, 160).toLowerCase(), whatsapp = cap(b.whatsapp, 40)
  const start = cap(b.start, 40)
  if (!name || (!email && !whatsapp)) return NextResponse.json({ ok: false, error: 'Faltan tus datos.' }, { status: 400 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ok: false, error: 'La agenda no está conectada todavía.' }, { status: 503 })

  const av = await readSetting<Availability>('availability', DEFAULT_AVAILABILITY)
  const answers = cap(b.answers, 4000)
  const pageUrl = cap(b.pageUrl, 500), landing = cap(b.landing, 500), referrer = cap(b.referrer, 300), fbc = cap(b.fbc, 300)
  const channel = channelTag({ fbc, pageUrl, landing, referrer })
  const attribution = { channel, pageUrl, landing, referrer, fbc: fbc || null, visitorId: cap(b.visitorId, 60) || null }

  // The slot must still be free. Without a valid one the request is kept as
  // "requested" so José can set a time by hand: a lead is never dropped.
  let startIso: string | null = null
  if (start && !Number.isNaN(Date.parse(start))) {
    const days = await freeSlots(av)
    if (days.some(d => d.slots.some(s => s.start === new Date(start).toISOString()))) startIso = new Date(start).toISOString()
  }
  const endIso = startIso ? new Date(Date.parse(startIso) + av.duration * 60_000).toISOString() : null
  const id = 'bk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  const row = {
    id, name, email: email || null, phone: whatsapp || null, notes: answers || null,
    start_at: startIso, end_at: endIso, status: startIso ? 'booked' : 'requested',
    source: channel, attribution, created_at: new Date().toISOString(),
  }
  const { error } = await db.from('bookings').insert(row)
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: false, error: 'Esa hora se acaba de ocupar. Elige otra.' }, { status: 409 })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const when = startIso ? slotLabelEs(startIso, av.timeZone) : (cap(b.slotLabel, 80) || 'por confirmar')

  // Calendar event with a Meet link, invites the lead.
  let meetUrl: string | undefined
  if (startIso && endIso) {
    const ev = await createCallEvent({
      summary: `Llamada con ${name}`,
      description: [`WhatsApp: ${whatsapp || '-'}`, `Email: ${email || '-'}`, `Origen: ${channel}`, '', answers].join('\n'),
      startIso, endIso, attendeeEmail: email || undefined, requestId: id,
    })
    if (ev) {
      meetUrl = ev.meetUrl
      await db.from('bookings').update({ google_event_id: ev.id, meet_url: ev.meetUrl ?? null }).eq('id', id)
    }
  }

  // The lead card in the pipeline, with its channel.
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? ''
  const crm = fetch(`${proto}://${host}/api/crm-lead`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email, whatsapp, source: 'reserva', goal: 'Llamada gratuita', notes: `Llamada: ${when}\n\n${answers}`, tags: [channel, 'Llamada reservada'], pageUrl, referrer, visitorId: attribution.visitorId }),
  }).catch(() => {})

  // Without Google connected there is no event yet, so both emails carry a
  // one-click "add to Google Calendar" link instead.
  const calLink = (title: string, details: string) =>
    startIso && endIso && !meetUrl ? googleCalendarUtcUrl({ title, details, startIso, endIso }) : ''
  const ownerCal = calLink(`Llamada con ${name}`, [`WhatsApp: ${whatsapp || '-'}`, `Email: ${email || '-'}`, `Origen: ${channel}`, '', answers].join('\n'))
  const clientCal = calLink('Llamada con José Unstoppable', 'Llamada gratuita. José te escribe por WhatsApp con el enlace.')
  const calButton = (href: string) => href ? `<p><a href="${href}">Añadir a Google Calendar</a></p>` : ''

  const ownerHtml = wrapEmail('Llamada reservada', `<p>${escapeHtml(name)} ha reservado una llamada.</p>` + calButton(ownerCal) + detailRows([
    ['Cuándo', when], ['WhatsApp', whatsapp], ['Email', email], ['Origen', channel], ['Meet', meetUrl ?? 'Sin Google conectado'],
  ]) + (answers ? `<p style="white-space:pre-line">${escapeHtml(answers)}</p>` : ''), { label: 'Abrir llamadas', href: `${SITE_URL}/admin/bookings` })
  const clientHtml = email ? wrapEmail('Tu llamada está reservada', `<p>Hola ${escapeHtml(firstNameOf(name, ''))},</p><p>Tu llamada gratuita de ${av.duration} minutos está reservada: <strong>${escapeHtml(when)}</strong> (hora de España).</p>` + (meetUrl ? `<p>Te conectas aquí: <a href="${meetUrl}">${meetUrl}</a></p>` : '<p>Te escribo por WhatsApp con el enlace.</p>') + (av.meetingNote ? `<p>${escapeHtml(av.meetingNote)}</p>` : '') + calButton(clientCal) + '<p>Si no puedes, respóndeme a este correo y la cambiamos.</p>') : ''

  await Promise.allSettled([
    crm,
    sendEmail(OWNER_EMAIL, `Llamada reservada: ${name} · ${when}`, ownerHtml),
    clientHtml ? sendEmail(email, `Tu llamada con José: ${when}`, clientHtml) : Promise.resolve(),
    sendCapiEvent({ eventName: 'Schedule', eventId: cap(b.eventId, 60) || id, email, name, phone: whatsapp, fbc: fbc || undefined, fbp: cap(b.fbp, 300) || undefined, pageUrl, ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), userAgent: req.headers.get('user-agent') ?? undefined, customData: { content_name: 'Llamada reservada' } }),
  ])
  return NextResponse.json({ ok: true, id, when, meetUrl: meetUrl ?? null })
}
