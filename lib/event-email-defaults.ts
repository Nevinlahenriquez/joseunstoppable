
import { detailRows, signature, button, SITE_URL } from './email'
import { EVENT_WHATSAPP_URL, isCommunityLinkSet, COMMUNITY_CTA } from './event-community'

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template)
}

const REASON_PHRASES: Record<string, string> = {}

export function personalReasonLine(notes?: string, when: 'before' | 'after' = 'before'): string {
  try {
    const m = (notes || '').match(/Why they are coming: ([^\n]+)/)
    if (!m) return ''
    const phrases = m[1].split(',').map(x => x.trim()).map(r => REASON_PHRASES[r] || r).filter(Boolean)
    if (!phrases.length) return ''
    const list = phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(', ')} y ${phrases[phrases.length - 1]}`
    return when === 'before'
      ? `<p style="margin:0 0 20px;">Me dijiste que vienes por <strong>${list}</strong>. Para eso está hecha esta sesión, así que tráelo.</p>`
      : `<p style="margin:0 0 20px;">Viniste por <strong>${list}</strong>. Si la sesión te acercó a ello, me encantaría saberlo.</p>`
  } catch {
    return ''
  }
}

const BOOKING_URL = `${SITE_URL}/reserva`

function bookingBlock(): string {
  return `<div style="background:#F3F7FB;border:1px solid #DCE6F0;border-radius:10px;padding:20px 22px;margin:0 0 20px;">
  <p style="margin:0 0 10px;font-size:15.5px;font-weight:700;color:#2f2a3d;">¿Quieres un plan para ti?</p>
  <p style="margin:0 0 14px;font-size:14.5px;line-height:1.65;color:#4a4459;">Reserva una llamada gratuita de 30 minutos y vemos juntos dónde estás, a dónde quieres llegar y cómo te puedo ayudar.</p>
  <a href="${BOOKING_URL}" style="display:inline-block;background:#0EA5E9;color:#ffffff;font-weight:700;font-size:14.5px;padding:13px 24px;border-radius:12px;text-decoration:none;">Reservar mi llamada</a>
</div>`
}

function communityBlock(tone: 'now' | 'day'): string {
  if (!isCommunityLinkSet()) return ''
  const line = tone === 'now'
    ? 'Todos los asistentes están en el grupo de WhatsApp. Ahí comparto el link el día del evento y respondo dudas antes de empezar.'
    : '¿Aún no estás en el grupo? Ahí publico todo el día del evento, incluido el link.'
  return `<div style="background:#f1fbf5;border:1px solid #b7e4c7;border-radius:12px;padding:18px 20px;margin:0 0 22px;text-align:center;">
  <p style="margin:0 0 12px;font-size:14.5px;line-height:1.65;color:#4a4459;">${line}</p>
  <a href="${EVENT_WHATSAPP_URL}" class="e-btn" style="display:inline-block;background:#25D366;color:#042a14;font-weight:800;font-size:15px;padding:13px 26px;border-radius:999px;text-decoration:none;">${COMMUNITY_CTA}</a>
</div>`
}

export function defaultConfirmationBody(vars: { name: string; eventTitle: string; date: string; time: string; location: string; ticketCode: string; eventUrl: string }): string {
  return `<p style="margin:0 0 16px;">Hola ${vars.name},</p>
<p style="margin:0 0 20px;">Tu plaza para <strong>${vars.eventTitle}</strong> está confirmada.</p>

${detailRows([['Fecha', vars.date], ['Hora', vars.time], ['Dónde', vars.location], ['Entrada', vars.ticketCode]])}
${communityBlock('now')}
<p style="margin:0 0 20px;">Tienes todos los detalles en <a href="${vars.eventUrl}" style="color:#0EA5E9;font-weight:600;">la página del evento</a>. Si tienes cualquier pregunta, responde a este email.</p>
`
}

export function defaultReminderBody(vars: { name: string; eventTitle: string; date: string; time: string; joinUrl: string; notes?: string }, hoursBefore: number): string {
  const lead = hoursBefore >= 24
    ? `<strong>${vars.eventTitle}</strong> es mañana.`
    : hoursBefore >= 8
    ? `<strong>${vars.eventTitle}</strong> es hoy.`
    : hoursBefore >= 4
    ? `<strong>${vars.eventTitle}</strong> empieza en unas horas.`
    : hoursBefore >= 2
    ? `<strong>${vars.eventTitle}</strong> empieza pronto, en un par de horas.`
    : `<strong>${vars.eventTitle}</strong> empieza en una hora.`

  const join = vars.joinUrl ? button({ label: 'Entrar a la llamada', href: vars.joinUrl }) : ''

  return `<p style="margin:0 0 16px;">Hola ${vars.name},</p>
<p style="margin:0 0 20px;">${lead}</p>
${personalReasonLine(vars.notes)}
${detailRows([['Fecha', vars.date], ['Hora', vars.time]])}
${join}
${communityBlock('day')}
${signature()}`
}

export function defaultFollowUpBody(vars: { name: string; eventTitle: string; notes?: string }): string {
  return `<p style="margin:0 0 16px;">Hola ${vars.name},</p>
${personalReasonLine(vars.notes, 'after')}
<p style="margin:0 0 20px;">Gracias por estar en <strong>${vars.eventTitle}</strong>. Si algo de lo que viste ya lo estás poniendo en práctica, respóndeme y cuéntamelo.</p>
${bookingBlock()}
${communityBlock('day')}
${signature()}`
}
