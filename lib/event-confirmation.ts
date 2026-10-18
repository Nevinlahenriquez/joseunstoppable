
import { personalReasonLine, applyTemplate } from '@/lib/event-email-defaults'
import { escapeHtml } from '@/lib/escape-html'
import { inviteEmailBlock } from '@/lib/event-referral'
import { eventTimeRangesLine } from '@/lib/event-time'
import { EVENT_WHATSAPP_URL, isCommunityLinkSet, COMMUNITY_BODY, COMMUNITY_CTA } from '@/lib/event-community'
import { SITE_URL, detailRows, emailShell, signature, weekdayDate } from '@/lib/email'

export function isPaidEvent(event: { price?: unknown }): boolean {
  return Number(event?.price) > 0
}

function defaultConfirmationBody(vars: { name: string; eventTitle: string; date: string; time: string; joinUrl: string; ticketCode: string; eventUrl: string; notes?: string }): string {

  const group = isCommunityLinkSet()
    ? `<div style="background:#f1fbf5;border:1px solid #b7e4c7;border-radius:12px;padding:20px 22px;margin:0 0 22px;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1f8a5b;text-transform:uppercase;letter-spacing:1px;">Haz esto ahora</p>
  <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;color:#4a4459;">${COMMUNITY_BODY}</p>
  <a href="${EVENT_WHATSAPP_URL}" style="display:inline-block;background:#25D366;color:#042a14;font-weight:800;font-size:15px;padding:13px 26px;border-radius:999px;text-decoration:none;">${COMMUNITY_CTA}</a>
</div>`
    : ''

  const join = vars.joinUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px;">
  <tr><td bgcolor="#7C3AED" style="background-color:#7C3AED;border-radius:12px;">
    <a href="${vars.joinUrl}" style="display:inline-block;padding:17px 42px;font-family:Helvetica,Arial,sans-serif;font-size:16.5px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:12px;">Entrar a la llamada</a>
  </td></tr>
</table>
<p style="margin:0 0 22px;text-align:center;font-size:13px;color:#8b839a;">El mismo enlace el día del evento. Guarda este email.</p>`
    : `<p style="margin:0 0 20px;">El enlace para entrar llega por email antes de empezar.</p>`

  return `<p style="margin:0 0 16px;">Hola ${vars.name},</p>
<p style="margin:0 0 14px;">Tu plaza para <strong>${vars.eventTitle}</strong> está confirmada.</p>
${personalReasonLine(vars.notes)}

${detailRows([['Fecha', vars.date], ['Hora', vars.time]])}
${group}
${join}
<p style="margin:0 0 20px;">Si tienes preguntas antes del día, responde a este email. Lo lee una persona real.</p>

<div style="background:#F3F0EA;border:1px solid #e7dffb;border-radius:10px;padding:16px 18px;margin:0 0 20px;">
  <p style="margin:0;font-size:14px;line-height:1.65;color:#4a4459;">Un pequeño favor: si este email llegó a <strong>spam o promociones</strong>, márcalo como <strong>no es spam</strong> y añade esta dirección a tus contactos. Así te llega el recordatorio antes de empezar.</p>
</div>
`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventRow = any

export function buildRegistrantConfirmation(
  event: EventRow,
  who: { name: string; ticketCode: string; notes?: string; referralCode?: string | null },
): { subject: string; html: string } {

  const eTitle = escapeHtml(event.title || 'Evento')
  const vars = {
    name: escapeHtml(who.name),
    eventTitle: eTitle,
    date: escapeHtml(weekdayDate(event.date, 'Fecha por confirmar')),

    time: escapeHtml(
      eventTimeRangesLine(String(event.date || ''), String(event.time || '').trim(), String(event.end_time || event.endTime || '').trim() || undefined, String(event.timezone || 'Europe/Amsterdam'))
        || String(event.time || '').trim()
        || 'Hora por confirmar'
    ),

    joinUrl: (String(event.location_name || '').match(/https?:\/\/[^\s<"']+/) ?? [''])[0],
    ticketCode: escapeHtml(who.ticketCode),

    eventUrl: `${SITE_URL}/events/${encodeURIComponent(String(event.slug || '').trim())}`,
  }

  const templated = String(event.email_confirmation || '').trim()
  const body =
    (templated ? applyTemplate(templated, vars) : defaultConfirmationBody({ ...vars, notes: who.notes }))
    + inviteEmailBlock({ slug: String(event.slug || '').trim(), code: who.referralCode, price: Number(event.price) || 0 })
    + signature()

  return {
    subject: `Estás registrado: ${event.title}`,
    html: emailShell({
      title: event.title || 'Estás registrado',
      preview: `Entrada ${who.ticketCode} \u00b7 ${String(vars.date)} \u00b7 ${String(vars.time)}`,
      body,
    }),
  }
}
