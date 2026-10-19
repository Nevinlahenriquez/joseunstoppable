import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, emailShell, OWNER_EMAIL, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { buildRegistrantConfirmation } from '@/lib/event-confirmation'
import { afterSeatPaid } from '@/lib/event-referral'

export type PaidVia = 'card' | 'bank-auto' | 'bank-manual' | 'referral' | 'circle'

export type MarkPaidResult =
  | { ok: true; turned: true; emailSent: boolean }
  | { ok: true; turned: false }
  | { ok: false; error: string }

const VIA_LABEL: Record<PaidVia, string> = {
  'card': 'pagó con tarjeta',
  'bank-auto': 'pagó por transferencia (el justificante coincide)',
  'bank-manual': 'marcado como pagado a mano (transferencia)',
  'referral': 'consiguió una plaza gratis invitando a amigos',
  'circle': 'tiene la plaza incluida sin coste',
}

export async function markSeatPaid(
  db: SupabaseClient,
  opts: { ticketCode: string; amount: number; via: PaidVia; ref?: Record<string, unknown> },
): Promise<MarkPaidResult> {
  const ticketCode = opts.ticketCode.trim()
  if (!ticketCode) return { ok: false, error: 'Sin código de entrada.' }

  const patch: Record<string, unknown> = {
    paid: true,
    paid_at: new Date().toISOString(),
    paid_amount: opts.amount,
    payment_method: opts.via === 'card' ? 'card' : opts.via === 'referral' ? 'referral' : opts.via === 'circle' ? 'circle' : 'bank',

    payment_ref: { via: opts.via, ...(opts.ref || {}) },
  }
  let res = await db.from('event_attendees').update(patch)
    .eq('ticket_code', ticketCode).eq('paid', false)
    .select('id, name, email, notes, event_id, referred_by, referred_by_partner, referral_code')

  if (res.error && /payment_method|payment_ref/.test(res.error.message || '')) {
    delete patch.payment_method
    delete patch.payment_ref
    res = await db.from('event_attendees').update(patch)
      .eq('ticket_code', ticketCode).eq('paid', false)
      .select('id, name, email, notes, event_id, referred_by, referred_by_partner, referral_code')
  }
  if (res.error) return { ok: false, error: res.error.message }
  const seat = res.data?.[0]
  if (!seat) return { ok: true, turned: false }

  let emailSent = false
  let title = ''
  try {
    const { data: ev } = await db.from('events').select('*').eq('id', seat.event_id).maybeSingle()
    if (ev) {
      title = String(ev.title || '')
      if (seat.email) {
        const mail = buildRegistrantConfirmation(ev, { name: String(seat.name || ''), ticketCode, notes: String(seat.notes || ''), referralCode: (seat.referral_code as string | null) ?? null })
        emailSent = await sendEmail(String(seat.email), mail.subject, mail.html)
        if (!emailSent) console.error(`[event-paid] ticket ${ticketCode} paid, confirmation email NOT sent`)
      }
    }
  } catch (e) {
    console.error('[event-paid] confirmation failed', e)
  }

  if (!emailSent && opts.via !== 'bank-manual') {
    try {
      await sendEmail(OWNER_EMAIL, `Plaza pagada: ${String(seat.name || seat.email)}`, emailShell({
        title: 'Se ha pagado una plaza',
        preview: 'Ha entrado una plaza pagada',
        showFooterLinks: false,
        body: `<p style="margin:0 0 12px;">${escapeHtml(String(seat.name || ''))} (${escapeHtml(String(seat.email || ''))}) ${VIA_LABEL[opts.via]} para <strong>${escapeHtml(title)}</strong>. Entrada ${escapeHtml(ticketCode)}.${emailSent ? ' Ya se le ha enviado la confirmación con el enlace.' : ' <strong>Su email de confirmación NO se envió</strong>: mándale el enlace a mano.'}</p>`
          + (opts.via === 'bank-auto' ? `<p style="margin:0;">Comprueba que la transferencia ha llegado a tu banco antes del evento. El justificante está en su fila en <a href="${SITE_URL}/admin/events/${encodeURIComponent(String(seat.event_id))}">/admin/events</a>.</p>` : ''),
      }))
    } catch (e) {
      console.error('[event-paid] owner notification failed', e)
    }
  }

  if (opts.via !== 'circle') await afterSeatPaid(db, { id: String(seat.id), name: seat.name, referred_by: seat.referred_by, referred_by_partner: (seat as { referred_by_partner?: unknown }).referred_by_partner })

  return { ok: true, turned: true, emailSent }
}
