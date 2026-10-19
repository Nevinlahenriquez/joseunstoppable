import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, wrapEmail, detailRows, firstNameOf, money, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { list, newToken, str, type Answers, type OnboardingRow } from '@/lib/onboarding'

// Server side of the onboarding flow: started automatically the moment a deal
// becomes a client, and written back onto that deal once the client answers.

// Pipeline stages that mean the client has paid and starts (Won / kept as client).
// "Signed" is only the contract: the onboarding waits for the payment.
export const CLIENT_STAGES = ['active', 'completed']

export type NewClient = {
  dealId?: string | null
  name?: string | null
  email?: string | null
  phone?: string | null
  service?: string | null
  amount?: number | null
  currency?: string | null
  trigger: 'payment' | 'stage' | 'manual'
}

export const onboardingLink = (token: string) => `${SITE_URL}/onboarding/${token}`

// The client's onboarding: the one already there (by deal or email), or a new
// one whose link is emailed to the client. A new one also tells the coach a
// client closed. Never sends twice, whichever trigger comes first.
export async function ensureOnboarding(db: SupabaseClient, c: NewClient): Promise<{ row: OnboardingRow; created: boolean; emailed: boolean } | null> {
  const email = (c.email ?? '').trim().toLowerCase()
  let existing: OnboardingRow | undefined
  if (c.dealId) {
    const byDeal = await db.from('onboardings').select('*').eq('deal_id', c.dealId).limit(1)
    if (byDeal.error) return null
    existing = byDeal.data?.[0] as OnboardingRow | undefined
  }
  if (!existing && email) {
    const byEmail = await db.from('onboardings').select('*').eq('email', email).order('created_at', { ascending: false }).limit(1)
    if (byEmail.error) return null
    existing = byEmail.data?.[0] as OnboardingRow | undefined
  }
  if (!existing && !c.dealId && !email) return null
  if (existing) {
    if (c.dealId && !existing.deal_id) await db.from('onboardings').update({ deal_id: c.dealId }).eq('id', existing.id)
    return { row: existing, created: false, emailed: false }
  }

  const row = {
    id: 'ob-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    token: newToken(), name: (c.name ?? '').trim().slice(0, 120) || null, email: email || null,
    phone: (c.phone ?? '').trim().slice(0, 40) || null, deal_id: c.dealId || null,
    status: 'sent' as const, answers: null, source: c.trigger === 'manual' ? 'dashboard' : c.trigger, created_at: new Date().toISOString(),
    opened_at: null, completed_at: null,
  }
  const { error } = await db.from('onboardings').insert(row)
  if (error) return null

  let emailed = false
  if (email) {
    const url = onboardingLink(row.token)
    const html = wrapEmail(
      'Tu onboarding',
      `<p>Hola ${escapeHtml(firstNameOf(row.name, ''))},</p>` +
        '<p>Pago confirmado: bienvenido/a al equipo. Antes de preparar tu plan de entrenamiento y nutrición necesito conocerte bien, así que rellena tu onboarding (10-15 minutos): medidas, objetivos, salud, rutina y alimentación.</p>' +
        '<p>Cuando lo envíes, mándame por WhatsApp 3 fotos (frontal, perfil y espalda) y te escribo para agendar la llamada de bienvenida. Tu plan estará listo 48-72 h después de la llamada.</p>',
      { label: 'Rellenar mi onboarding', href: url },
      'Empezamos: rellena tu onboarding',
    )
    emailed = await sendEmail(email, 'Empezamos: tu onboarding con José', html).catch(() => false)
  }
  if (c.trigger !== 'manual') await notifyClientClosed(c).catch(() => {})
  return { row, created: true, emailed }
}

// The deal that belongs to a payment: the newest one with the same email.
export async function dealForEmail(db: SupabaseClient, email: string) {
  const e = email.trim().toLowerCase()
  if (!e) return null
  const { data } = await db.from('deals').select('id, client_name, client_email, client_phone, service, stage, created_at')
    .ilike('client_email', e).order('created_at', { ascending: false }).limit(5)
  const rows = (data ?? []) as Array<{ id: string; client_name: string | null; client_phone: string | null; service: string | null; stage: string | null }>
  return rows.find(d => d.stage !== 'lost') ?? rows[0] ?? null
}

// Payment confirmed on an invoice: start the client's onboarding.
export async function startFromPayment(db: SupabaseClient, inv: Record<string, unknown>) {
  const email = String(inv.client_email ?? '')
  const deal = await dealForEmail(db, email).catch(() => null)
  const lines = Array.isArray(inv.line_items) ? inv.line_items as Array<{ quantity?: number; price?: number }> : []
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0) + (Number(inv.taxes) || 0)
  return ensureOnboarding(db, {
    dealId: deal?.id, name: String(inv.client_name ?? '') || deal?.client_name, email,
    phone: String(inv.client_phone ?? '') || deal?.client_phone, service: String(inv.project_title ?? '') || deal?.service,
    amount: Number(inv.amount_paid) || total || null, currency: String(inv.currency ?? 'EUR'), trigger: 'payment',
  })
}

// Fill the empty fields of the client's deal from their answers, so the
// pipeline card shows them. Fields José already wrote are left alone.
export async function writeAnswersToDeal(db: SupabaseClient, dealId: string, a: Answers) {
  const { data: deal } = await db.from('deals')
    .select('id, client_phone, goals, desired_outcome, current_state, blockers').eq('id', dealId).maybeSingle()
  if (!deal) return
  const v = (k: string) => str(a, k)
  const goals = [list(a, 'objetivo').join(', '), v('plazo') && `Plazo: ${v('plazo')}`].filter(Boolean).join(' · ')
  const desired = [v('objetivo_detalle'), v('porque') && `¿Por qué ahora? ${v('porque')}`].filter(Boolean).join('\n')
  const current = [
    [v('edad') && `${v('edad')} años`, v('peso') && `${v('peso')} kg`, v('altura') && `${v('altura')} cm`].filter(Boolean).join(' · '),
    `Entrena: ${v('dias')} · ${v('lugar')}`,
    `Compromiso ${v('compromiso')}/10`,
  ].filter(Boolean).join('\n')
  const health = list(a, 'salud_ok').length ? '' : v('salud')
  const patch: Record<string, string> = {}
  if (!deal.goals && goals) patch.goals = goals
  if (!deal.desired_outcome && desired) patch.desired_outcome = desired
  if (!deal.current_state && current) patch.current_state = current
  if (!deal.blockers && health) patch.blockers = `Salud: ${health}`
  if (Object.keys(patch).length) await db.from('deals').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', dealId)
}

// Nevin (José's coach, paid a share of revenue) hears about every new client.
// COACH_NOTIFY_EMAIL in Vercel turns it on; commas separate several addresses.
export async function notifyClientClosed(c: NewClient) {
  const to = (process.env.COACH_NOTIFY_EMAIL ?? '').split(',').map(x => x.trim()).filter(Boolean)
  if (!to.length) return
  const name = (c.name ?? '').trim() || 'Cliente sin nombre'
  const value = Number(c.amount) || 0
  const currency = c.currency || 'EUR'
  const html = wrapEmail('Nuevo cliente cerrado', `<p>José ha cerrado un cliente nuevo: <strong>${escapeHtml(name)}</strong>.</p>` + detailRows([
    ['Cliente', name], ['Email', c.email], ['WhatsApp', c.phone], ['Servicio', c.service],
    ['Cómo', c.trigger === 'payment' ? 'Pago confirmado' : 'Marcado como cliente en el pipeline'],
    ['Importe', value ? money(value, currency) : 'Sin importe en la ficha'],
    ['Comisión 10 %', value ? money(value * 0.1, currency) : ''],
    ['Fecha', new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })],
  ]), { label: 'Abrir el panel', href: `${SITE_URL}/admin` })
  await Promise.allSettled(to.map(addr => sendEmail(addr, `Nuevo cliente: ${name}${value ? ` · ${money(value, currency)}` : ''}`, html)))
}
