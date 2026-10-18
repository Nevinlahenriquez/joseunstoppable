import { SITE_URL } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/auth'
import { escapeHtml } from '@/lib/escape-html'
import { EMAIL_FROM, EMAIL_REPLY_TO, emailShell, weekdayDate } from '@/lib/email'
import { applyTemplate, defaultConfirmationBody, defaultReminderBody, defaultFollowUpBody } from '@/lib/event-email-defaults'

export const runtime = 'nodejs'

export const maxDuration = 300

async function sendEmail(to: string, subject: string, html: string, attempt = 0): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY not set')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      reply_to: EMAIL_REPLY_TO,
      subject,
      html,
    }),
  })

  if (res.status === 429 && attempt < 4) {
    await sleep(1000 * (attempt + 1))
    return sendEmail(to, subject, html, attempt + 1)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`)
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function sendAll<T>(items: T[], fn: (item: T) => Promise<void>): Promise<PromiseSettledResult<void>[]> {
  const out: PromiseSettledResult<void>[] = []
  for (const item of items) {
    try { await fn(item); out.push({ status: 'fulfilled', value: undefined }) }
    catch (reason) { out.push({ status: 'rejected', reason }) }
    await sleep(550)
  }
  return out
}

function plainReason(err: unknown): string {
  const m = String(err instanceof Error ? err.message : err)
  if (/429/.test(m)) return 'The mail service was busy. Retry it.'
  if (/422|invalid|validation/i.test(m)) return 'The address looks invalid. Check it for a typo.'
  if (/403/.test(m)) return 'The mail service refused it.'
  return m.slice(0, 160)
}

type Attendee = { id?: string; name: string; email: string; status: string; company?: string; }

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const body = await req.json()
    const { type, eventId, attendeeId, broadcast } = body

    const offerSubject = String(body.subject ?? '').trim()
    const offerBody = String(body.bodyHtml ?? '').trim()
    const excludeMembers = body.excludeMembers === true

    const onlyEmails: string[] | null = Array.isArray(body.onlyEmails)
      ? body.onlyEmails.map((e: unknown) => String(e || '').trim().toLowerCase()).filter(Boolean).slice(0, 500)
      : null
    const audience = body.audience === 'attended' ? 'attended' : body.audience === 'paid' ? 'paid' : 'all'

    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const fmtDate = weekdayDate(event.date, 'Fecha por confirmar')
    const fmtTime = String(event.time || '').trim() || 'Hora por confirmar'
    const fmtLocation = String(event.location || event.location_name || '').trim() || 'Te enviamos los datos para entrar por email'
    const title = String(event.title || '').trim() || 'Evento de José Unstoppable'

    const templateMap: Record<string, string> = {
      confirmation: event.email_confirmation ?? '',
      reminder: event.email_reminder ?? '',
      followup: event.email_follow_up ?? '',

      offer: offerBody,
    }

    const subjectMap: Record<string, string> = {
      confirmation: `Estás registrado: ${title}`,
      reminder: `Recordatorio: ${title} se acerca`,
      followup: `Gracias por venir a ${title}`,
      offer: offerSubject || `Un mensaje sobre ${title}`,
    }

    const previewMap: Record<string, string> = {
      confirmation: `Tu plaza está confirmada. ${fmtDate}, ${fmtTime}.`,
      reminder: `${fmtDate}, ${fmtTime}. Aquí tienes los datos para entrar.`,
      followup: `Qué hacer ahora después de ${title}.`,
      offer: offerSubject || `${title}`,
    }

    const template = templateMap[type]

    const subject = applyTemplate(subjectMap[type] ?? `Mensaje de ${title}`, { eventTitle: title })
    const preview = previewMap[type] ?? `${title}, ${fmtDate}`

    const joinUrl = (String(event.location_name || '').match(/https?:\/\/[^\s<"']+/) ?? [''])[0]
    const eventUrl = `${SITE_URL}/events/${encodeURIComponent(String(event.slug || '').trim())}`
    const buildDefaultBody = (vars: { name: string }): string => {
      if (type === 'reminder') {
        return defaultReminderBody({ name: vars.name, eventTitle: title, date: fmtDate, time: fmtTime, joinUrl }, 24)
      }
      if (type === 'followup') {
        return defaultFollowUpBody({ name: vars.name, eventTitle: title })
      }
      return defaultConfirmationBody({ name: vars.name, eventTitle: title, date: fmtDate, time: fmtTime, location: fmtLocation, ticketCode: '', eventUrl })
    }

    if (!subjectMap[type]) {
      return NextResponse.json({ error: `Unknown email type "${type}"` }, { status: 400 })
    }

    if (type === 'offer' && (!offerSubject || !offerBody)) {
      return NextResponse.json({ error: 'Una oferta necesita asunto y mensaje.' }, { status: 400 })
    }

    let query = supabase.from('event_attendees').select('id, name, email, status, company').eq('event_id', eventId)
    if (!broadcast && attendeeId) {
      query = query.eq('id', attendeeId)
    } else if (broadcast) {

      query = audience === 'attended'
        ? query.eq('status', 'attended')
        : audience === 'paid'
          ? query.in('status', ['registered', 'attended', 'no_show']).or('paid.eq.true,status.eq.attended')
          : query.in('status', ['registered', 'attended'])
    }

    const { data: attendees, error: attErr } = await query
    if (attErr) {
      return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 })
    }

    const guard = 'none'
    const alreadySent = 0
    let recipients = (attendees as Attendee[]) ?? []
    if (onlyEmails) {
      const want = new Set(onlyEmails)
      recipients = recipients.filter(a => want.has(String(a.email || '').trim().toLowerCase()))
    }
    const excluded = 0

    const results = await sendAll(
      recipients, a => {

        const name = escapeHtml(String(a.name || '').trim() || '')

        const emailBody = template
          ? applyTemplate(template, { name, eventTitle: escapeHtml(title), date: escapeHtml(fmtDate), time: escapeHtml(fmtTime), location: escapeHtml(fmtLocation) })
          : buildDefaultBody({ name })
        return sendEmail(a.email, subject, emailShell({ title, preview, body: emailBody }))
      }
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    const failedList = results.flatMap((r, i) => r.status === 'rejected'
      ? [{ email: recipients[i].email, name: recipients[i].name, reason: plainReason(r.reason) }]
      : [])
    if (failedList.length) console.error('[send-event-email] failed:', JSON.stringify(failedList.map((f, i) => ({ ...f, raw: String((results.filter(r => r.status === 'rejected')[i] as PromiseRejectedResult).reason) }))))

    return NextResponse.json({ success: true, sent, failed, failedList, excluded, alreadySent, guard })
  } catch (err) {
    console.error('Send event email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
