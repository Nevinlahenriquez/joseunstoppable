import { channelTag } from '@/lib/lead-attribution'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { detectSpam, SPAM_REJECTION } from '@/lib/anti-spam'
import { escapeHtml } from '@/lib/escape-html'
import {
  APPLY_LABEL, APPLY_URL, EMAIL_FROM, INTERNAL_FROM, OWNER_EMAIL, SITE_URL,
  detailRows, emailShell, quoteBlock, signature, type EmailCta,
} from '@/lib/email'
import { SPAM_TAG, leadVerdict } from '@/lib/apply-guard'
import { funnelIdFromPath, recordFunnelLead } from '@/lib/funnel-log'
import { TOO_MANY, clientIp, overLimit } from '@/lib/rate-limit'

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''
const FROM = EMAIL_FROM
const NOTIFY = OWNER_EMAIL

function sha256(v: string): string {
  return createHash('sha256').update(v.trim().toLowerCase()).digest('hex')
}

function capiContent(source?: string, stage?: string): string {
  if (stage === 'started') return 'Lead'
  const s = (source || '').toLowerCase()
  if (s.includes('reserva') || s.includes('booking') || s.includes('call')) return 'Llamada reservada'
  if (s.includes('masterclass') || s.includes('event')) return 'Registro evento'
  return 'Lead'
}

async function sendCapiLead(input: { email?: string; name?: string; whatsapp?: string; eventId?: string; fbp?: string; fbc?: string; pageUrl?: string; source?: string; stage?: string; ip: string; userAgent: string }): Promise<void> {
  const token = process.env.META_CAPI_TOKEN
  if (!token) return
  const [firstName, ...rest] = (input.name || '').split(' ')
  await fetch(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.pageUrl,
        action_source: 'website',
        user_data: {
          em: input.email ? [sha256(input.email)] : undefined,
          fn: firstName ? [sha256(firstName)] : undefined,
          ln: rest.length ? [sha256(rest.join(' '))] : undefined,
          ph: input.whatsapp ? [sha256(input.whatsapp.replace(/[^0-9]/g, ''))] : undefined,
          client_ip_address: input.ip || undefined,
          client_user_agent: input.userAgent || undefined,
          fbp: input.fbp || undefined,
          fbc: input.fbc || undefined,
        },
        custom_data: { content_name: capiContent(input.source, input.stage), currency: 'EUR', value: 0 },
      }],
    }),
  })
}

type LeadCopy = {
  subject: string
  preview: string
  title: string
  body: string
  cta?: EmailCta
  note?: string
  notifySubject: string
  notifyNote: string
}

const APPLY_CTA: EmailCta = { label: APPLY_LABEL, href: APPLY_URL }

const P = (html: string) => `<p style="margin:0 0 16px;">${html}</p>`

type LeadInput = { name?: string; email?: string; whatsapp?: string; business?: string; message?: string; notes?: string; lang?: string; source?: string
  quarantined?: boolean
  stage?: string
  revenue?: string
  spamReasons?: string[] }

function copyFor(lead: LeadInput, firstName: string): LeadCopy {
  const s = (lead.source || '').toLowerCase()
  const hola = firstName ? `Hola ${firstName}` : 'Hola'

  if (s.includes('masterclass') || s.includes('event')) {
    return {
      subject: 'Tu plaza está reservada',
      preview: 'Te mando los detalles antes del evento.',
      title: `${hola}, estás dentro`,
      body: P('Tu plaza está reservada. Antes del evento te mando el link y los detalles para entrar.')
        + P('Si tienes cualquier pregunta, responde a este email.')
        + signature(),
      notifySubject: 'Nuevo registro al evento',
      notifyNote: 'Se registró desde la página del evento.',
    }
  }

  // Name and email from the booking form's first screen: the call is not
  // booked yet, so the email doubles as a way back to finish it.
  if (lead.stage === 'started') {
    return {
      subject: 'Tu llamada con José, a un paso',
      preview: 'Termina de elegir día y hora en un minuto.',
      title: `${hola}, gracias por empezar`,
      body: P('Has empezado a reservar tu llamada gratuita de 30 minutos. Si no llegaste a elegir día y hora, puedes terminarlo aquí en un minuto.')
        + P('Si ya la reservaste, ignora este email: te llega la confirmación aparte.')
        + signature(),
      cta: { label: 'Terminar mi reserva', href: `${SITE_URL}/reserva` },
      notifySubject: 'Nuevo lead (empezó la reserva)',
      notifyNote: 'Dejó nombre y email en el formulario de llamada. Sus respuestas se van guardando en su ficha.',
    }
  }

  if (s.includes('reserva') || s.includes('booking') || s.includes('call')) {
    return {
      subject: 'Hemos recibido tu solicitud',
      preview: 'Te contacto en breve para confirmar tu llamada.',
      title: `${hola}, gracias`,
      body: P('He recibido tu solicitud para la llamada gratuita de 30 minutos. Te contacto en breve para confirmarla.')
        + P('Si quieres añadir algo antes, responde a este email.')
        + signature(),
      notifySubject: 'Nueva solicitud de llamada',
      notifyNote: 'Pidió una llamada gratuita desde la web.',
    }
  }

  return {
    subject: 'Hemos recibido tu mensaje',
    preview: 'Te respondo personalmente en breve.',
    title: `${hola}, gracias`,
    body: P('He recibido tu mensaje y te respondo personalmente en breve.')
      + signature(),
    cta: APPLY_CTA,
    notifySubject: 'Nuevo lead',
    notifyNote: 'Nuevo contacto desde la web.',
  }
}

async function sendEmails(lead: LeadInput): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const send = (payload: Record<string, unknown>) =>
    fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

  const firstName = (lead.name || '').trim().split(/\s+/)[0] || ''
  const copy = copyFor(lead, firstName)

  const clientHtml = emailShell({
    title: copy.title,
    preview: copy.preview,
    body: copy.body,
    cta: copy.cta,
    note: copy.note,
  })

  const notifyHtml = emailShell({
    title: copy.notifySubject,
    preview: `${lead.name || 'Sin nombre'}${lead.business ? `, ${lead.business}` : ''}`,
    showFooterLinks: false,
    body: detailRows([
      ['Nombre', lead.name],
      ['WhatsApp', lead.whatsapp],
      ['Email', lead.email],
      ['Origen', lead.source],
    ])
      + quoteBlock('Mensaje', lead.message || lead.notes || '')

      + (lead.quarantined
        ? `<p style="margin:0 0 10px;padding:10px 12px;border-radius:8px;background:#fdf2f2;color:#B42318;font-size:12.5px;font-weight:700;">Marcado como posible spam${lead.spamReasons?.length ? ` (${escapeHtml(lead.spamReasons.join(', '))})` : ''}. No se envió respuesta automática.</p>`
        : '')
      + `<p style="margin:0;font-size:12.5px;color:#8b839a;">${escapeHtml(copy.notifyNote)}</p>`,
  })

  await Promise.allSettled([
    lead.email && !lead.quarantined
      ? send({ from: FROM, to: [lead.email], reply_to: NOTIFY, subject: copy.subject, html: clientHtml })
      : Promise.resolve(),

    !lead.quarantined && send({
      from: INTERNAL_FROM,
      to: [process.env.LEAD_NOTIFY_EMAIL || NOTIFY],
      subject: `${copy.notifySubject}: ${lead.name || 'Sin nombre'}${lead.business ? ` (${lead.business})` : ''}`,
      html: notifyHtml,
    }),
  ])
}

export async function POST(req: NextRequest) {
  if (overLimit('lead:' + clientIp(req.headers), 10, 10 * 60_000)) {
    return NextResponse.json(TOO_MANY, { status: 429 })
  }
  const body = await req.json().catch(() => ({}))

  if (detectSpam(body).spam) {
    return NextResponse.json(SPAM_REJECTION.body, { status: SPAM_REJECTION.status })
  }

  const { name, email, whatsapp, business, message, notes, lang, eventId, fbp, fbc, pageUrl, source, visitorId, referrer, landing } = body
  const stage = body.stage === 'started' ? 'started' : undefined
  const revenue = typeof body.revenue === 'string' ? body.revenue.slice(0, 80) : ''
  if (!name && !email && !whatsapp) return NextResponse.json({ error: 'missing contact' }, { status: 400 })

  let verdict: ReturnType<typeof leadVerdict>
  try {
    verdict = leadVerdict({ name, business, email }, body)
  } catch (err) {
    console.error('[lead] leadVerdict threw; capturing the lead untagged', err)
    verdict = { level: 'clean', reasons: [] }
  }
  const isSpam = verdict.level === 'spam'

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const userAgent = req.headers.get('user-agent') ?? ''

  const webhookUrl = process.env.BOOKING_WEBHOOK_URL
  const webhook = webhookUrl
    ? fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, whatsapp, source }) }).catch(() => {})
    : Promise.resolve()

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('host') ?? 'joseunstoppable.com'
  const crm = fetch(`${proto}://${host}/api/crm-lead`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({
      name, email, whatsapp, company: business, source: source || 'web',
      notes: notes || message || undefined,

      tags: (() => {
        const t: string[] = []
        if (isSpam) t.push(SPAM_TAG)
        t.push(channelTag({ fbc, pageUrl, landing, referrer }))
        if (source === 'masterclass') t.push('Masterclass')
        if (source === 'reserva') t.push('Formulario llamada')
        return t
      })(),
      spamReasons: isSpam ? verdict.reasons : undefined,

      visitorId, pageUrl, referrer,

      countedByCaller: true,
    }),
  }).catch(() => {})

  await Promise.allSettled([
    webhook,
    crm,

    isSpam ? Promise.resolve() : sendCapiLead({
      email, name, whatsapp, eventId, ip, userAgent,
      fbp: fbp || req.cookies.get('_fbp')?.value,
      fbc: fbc || req.cookies.get('_fbc')?.value,
      pageUrl: pageUrl || req.headers.get('referer') || undefined,
      source, stage,
    }).catch(() => {}),

    sendEmails({ name, email, whatsapp, business, message, notes, lang, source, stage, quarantined: isSpam, spamReasons: verdict.reasons, revenue }).catch(() => {}),

    isSpam ? Promise.resolve() : recordFunnelLead({

      funnelId: funnelIdFromPath(pageUrl || req.headers.get('referer'), source),
      visitorId, path: pageUrl, referrer,
    }),
  ])
  return NextResponse.json({ ok: true })
}
