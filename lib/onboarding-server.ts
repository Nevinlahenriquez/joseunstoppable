import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, wrapEmail, detailRows, firstNameOf, money, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { list, newToken, str, type Answers, type OnboardingRow } from '@/lib/onboarding'

// Server side of the onboarding flow: started automatically the moment a deal
// becomes a client, and written back onto that deal once the client answers.

// The pipeline stages that mean "this person is a client" (same as lib/people.ts).
export const CLIENT_STAGES = ['signed', 'active', 'completed']

type DealRow = {
  id: string
  client_name?: string | null
  client_email?: string | null
  client_phone?: string | null
}

export const onboardingLink = (token: string) => `${SITE_URL}/onboarding/${token}`

// The onboarding for this deal: the one already there (by deal or email), or a
// new one whose link is emailed to the client. Never sends twice.
export async function ensureOnboardingForDeal(db: SupabaseClient, deal: DealRow): Promise<{ row: OnboardingRow; created: boolean; emailed: boolean } | null> {
  const email = (deal.client_email ?? '').trim().toLowerCase()
  const byDeal = await db.from('onboardings').select('*').eq('deal_id', deal.id).limit(1)
  if (byDeal.error) return null
  let existing = byDeal.data?.[0] as OnboardingRow | undefined
  if (!existing && email) {
    const byEmail = await db.from('onboardings').select('*').eq('email', email).order('created_at', { ascending: false }).limit(1)
    existing = byEmail.data?.[0] as OnboardingRow | undefined
  }
  if (existing) return { row: existing, created: false, emailed: false }

  const row = {
    id: 'ob-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    token: newToken(), name: (deal.client_name ?? '').trim().slice(0, 120) || null, email: email || null,
    phone: (deal.client_phone ?? '').trim().slice(0, 40) || null, deal_id: deal.id,
    status: 'sent' as const, answers: null, source: 'auto', created_at: new Date().toISOString(),
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
        '<p>Bienvenido/a al equipo. Antes de preparar tu plan necesito conocerte bien: rellena tu onboarding (10-15 minutos).</p>' +
        '<p>Cuando lo envíes, mándame por WhatsApp 3 fotos (frontal, perfil y espalda) y te escribo para la llamada de bienvenida.</p>',
      { label: 'Rellenar mi onboarding', href: url },
      'Empezamos: rellena tu onboarding',
    )
    emailed = await sendEmail(email, 'Empezamos: tu onboarding con José', html).catch(() => false)
  }
  return { row, created: true, emailed }
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
export async function notifyClientClosed(deal: Record<string, unknown>) {
  const to = (process.env.COACH_NOTIFY_EMAIL ?? '').split(',').map(x => x.trim()).filter(Boolean)
  if (!to.length) return
  const name = String(deal.client_name ?? '') || 'Cliente sin nombre'
  const value = Number(deal.value) || 0
  const currency = String(deal.currency ?? 'EUR')
  const html = wrapEmail('Nuevo cliente cerrado', `<p>José ha cerrado un cliente nuevo: <strong>${escapeHtml(name)}</strong>.</p>` + detailRows([
    ['Cliente', name], ['Email', deal.client_email], ['WhatsApp', deal.client_phone], ['Servicio', deal.service],
    ['Valor', value ? money(value, currency) : 'Sin importe en la ficha'],
    ['Comisión 10 %', value ? money(value * 0.1, currency) : ''],
    ['Fecha', new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })],
  ]), { label: 'Abrir el pipeline', href: `${SITE_URL}/admin/deals` })
  await Promise.allSettled(to.map(addr => sendEmail(addr, `Nuevo cliente: ${name}${value ? ` · ${money(value, currency)}` : ''}`, html)))
}
