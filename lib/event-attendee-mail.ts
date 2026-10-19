import { escapeHtml } from '@/lib/escape-html'
import { emailShell, weekdayDate } from '@/lib/email'
import { applyTemplate, defaultReminderBody, defaultFollowUpBody } from '@/lib/event-email-defaults'
import { buildRegistrantConfirmation, isPaidEvent } from '@/lib/event-confirmation'
import { inviteEmailBlock } from '@/lib/event-referral'

export type MailKind = 'confirmation' | 'r24' | 'r10' | 'r5' | 'r3' | 'r1' | 'followup'

export const REMINDER_STAGES: Array<{ kind: MailKind; col: string; hours: number; label: string }> = [
  { kind: 'r24', col: 'reminder_sent_24', hours: 24, label: '24h' },
  { kind: 'r10', col: 'reminder_sent_10', hours: 10, label: '10h' },
  { kind: 'r5', col: 'reminder_sent_5', hours: 5, label: '5h' },
  { kind: 'r3', col: 'reminder_sent_3', hours: 3, label: '3h' },
  { kind: 'r1', col: 'reminder_sent', hours: 1, label: '1h' },
]

export const FOLLOWUP_COL = 'followup_sent'

export function columnFor(kind: MailKind): string | null {
  if (kind === 'followup') return FOLLOWUP_COL
  return REMINDER_STAGES.find(s => s.kind === kind)?.col ?? null
}

export function zonedTimeToUtcMs(dateStr: string, timeStr: string, timeZone: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = (timeStr || '00:00').split(':').map(Number)
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi)
  const dtf = new Intl.DateTimeFormat('es-ES', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const map: Record<string, number> = {}
  for (const p of dtf.formatToParts(new Date(utcGuess))) if (p.type !== 'literal') map[p.type] = Number(p.value)
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second)
  return utcGuess - (asUtc - utcGuess)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function eventTimes(ev: any): { startMs: number | null; endMs: number | null } {
  if (!ev?.date) return { startMs: null, endMs: null }
  const tz = String(ev.timezone || 'Europe/Madrid')
  const startMs = zonedTimeToUtcMs(String(ev.date), String(ev.time || '00:00'), tz)
  const endMs = ev.end_time ? zonedTimeToUtcMs(String(ev.date), String(ev.end_time), tz) : startMs
  return { startMs, endMs }
}

export function dueAt(ev: any, kind: MailKind): number | null {
  const { startMs, endMs } = eventTimes(ev)
  if (kind === 'confirmation') return null
  if (kind === 'followup') return endMs === null ? null : endMs + 30 * 60_000
  const st = REMINDER_STAGES.find(s => s.kind === kind)
  return st && startMs !== null ? startMs - st.hours * 3600_000 : null
}

export function seatBlock(ev: any, seat: any): '' | 'unpaid' | 'cancelled' {
  if (!['registered', 'attended'].includes(String(seat.status || 'registered'))) return 'cancelled'
  if (isPaidEvent(ev) && !seat.paid) return 'unpaid'
  return ''
}

export function buildMail(ev: any, seat: any, kind: MailKind): { subject: string; html: string } | null {
  const title = String(ev.title || '').trim() || 'José Unstoppable event'
  if (kind === 'confirmation') {
    if (!seat.ticket_code) return null
    return buildRegistrantConfirmation(ev, {
      name: String(seat.name || ''),
      ticketCode: String(seat.ticket_code),
      notes: String(seat.notes || ''),
      referralCode: seat.referral_code ?? null,
    })
  }
  if (kind === 'followup') {
    const name = escapeHtml(String(seat.name || '').trim() || '')
    const templated = String(ev.email_follow_up || '').trim()
    const body = templated
      ? applyTemplate(templated, { name, eventTitle: escapeHtml(title) })
      : defaultFollowUpBody({ name, eventTitle: escapeHtml(title), notes: typeof seat.notes === 'string' ? seat.notes : '' })
    return { subject: `Gracias por venir a ${title}`, html: emailShell({ title, preview: `Qué hacer ahora después de ${title}.`, body }) }
  }
  const st = REMINDER_STAGES.find(s => s.kind === kind)
  if (!st) return null
  const fmtDate = weekdayDate(ev.date, 'Fecha por confirmar')
  const fmtTime = String(ev.time || '').trim() || 'Hora por confirmar'
  const joinUrl = (String(ev.location_name || '').match(/https?:\/\/[^\s<"']+/) ?? [''])[0]
  const subjects: Record<number, [string, string]> = {
    24: [`Mañana: ${title}`, `${fmtDate}, ${fmtTime}. Dentro tienes el botón para unirte.`],
    10: [`Hoy: ${title}`, `Hoy a las ${fmtTime}. Dentro tienes el botón para unirte.`],
    5: [`Quedan pocas horas: ${title}`, `Empieza a las ${fmtTime}. Dentro tienes el botón para unirte.`],
    3: [`Ya casi: ${title}`, `Empieza a las ${fmtTime}. Dentro tienes el botón para unirte.`],
    1: [`Empieza enseguida: ${title}`, `Empieza a las ${fmtTime}. Dentro tienes el botón para unirte.`],
  }
  const [subject, preview] = subjects[st.hours]
  const vars = {
    name: escapeHtml(String(seat.name || '').trim() || ''),
    eventTitle: escapeHtml(title),
    date: escapeHtml(fmtDate),
    time: escapeHtml(fmtTime),
    joinUrl,
  }
  const templated = String(ev.email_reminder || '').trim()
  const body = templated ? applyTemplate(templated, vars) : defaultReminderBody({ ...vars, notes: typeof seat.notes === 'string' ? seat.notes : '' }, st.hours)
  const html = emailShell({ title, preview, body: body + inviteEmailBlock({ slug: String(ev.slug || ''), code: seat.referral_code ?? null, price: Number(ev.price) || 0 }) })
  return { subject, html }
}

export function sequenceKinds(ev: any, now = Date.now()): MailKind[] {
  const out: MailKind[] = ['confirmation']
  const { startMs } = eventTimes(ev)
  if (startMs !== null && now < startMs) {
    const due = REMINDER_STAGES.filter(s => startMs - s.hours * 3600_000 <= now)
    if (due.length) out.push(due[due.length - 1].kind)
  }
  const f = dueAt(ev, 'followup')
  if (f !== null && now >= f) out.push('followup')
  return out
}
/* eslint-enable @typescript-eslint/no-explicit-any */
