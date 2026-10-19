import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, wrapEmail, emailShell, steps, detailRows, firstNameOf, money, SITE_URL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { healthSummary, list, newToken, parqYes, str, type Answers, type OnboardingRow } from '@/lib/onboarding'

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
  // Manual only: false keeps the link out of their inbox (José sends it himself).
  sendEmail?: boolean
}

export const onboardingLink = (token: string) => `${SITE_URL}/onboarding/${token}`
export const welcomeLink = (token: string) => `${SITE_URL}/bienvenida/${token}`

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

  const emailed = email && c.sendEmail !== false ? await emailOnboarding(db, row) : false
  if (c.trigger !== 'manual') await notifyClientClosed(c).catch(() => {})
  return { row, created: true, emailed }
}

// Email the client their welcome link (video, steps, button into the form).
// Used when the onboarding starts and by "Enviar por email" in the dashboard.
export async function emailOnboarding(db: SupabaseClient, row: Pick<OnboardingRow, 'id' | 'token' | 'name' | 'email' | 'status'>): Promise<boolean> {
  if (!row.email) return false
  const resend = row.status !== 'sent'
  const first = firstNameOf(row.name, '')
  const Hi = first ? first[0].toUpperCase() + first.slice(1) : ''
  const html = emailShell({
    eyebrow: resend ? 'Tu onboarding te espera' : 'Bienvenido/a al programa',
    title: resend ? `${Hi ? Hi + ', te' : 'Te'} falta muy poco` : `${Hi ? Hi + ', ya' : 'Ya'} estás dentro. Empezamos.`,
    preview: resend ? 'Lo que rellenaste está guardado. Sigue donde lo dejaste.' : 'Rellena tu onboarding y en 48-72 h tienes tu plan.',
    body:
      (resend
        ? '<p>Te dejo otra vez el enlace a tu onboarding. <strong>Todo lo que rellenaste está guardado</strong>, así que sigues justo donde lo dejaste. Son 5 minutos y es lo único que necesito para preparar tu plan.</p>'
        : '<p>Gracias por confiar en mí. A partir de hoy trabajamos juntos con un plan de entrenamiento y nutrición <strong>hecho para ti</strong>, no una plantilla.</p><p>En tu página de bienvenida tienes un vídeo mío y el formulario de onboarding. Esto es lo que viene:</p>') +
      steps([
        ['Rellena tu onboarding', '5 minutos: tus datos, objetivo, salud y rutina. Se guarda mientras escribes.'],
        ['Mándame 3 fotos por WhatsApp', 'Frontal, perfil y espalda, con buena luz.'],
        ['Llamada de bienvenida', 'Te escribo para agendarla y fijamos tu objetivo a 30 días.'],
        ['Tu plan en 48–72 h', 'Entrenamiento y nutrición a tu medida, dentro de Harbiz.'],
      ]),
    cta: { label: resend ? 'Seguir con mi onboarding' : 'Abrir mi bienvenida', href: resend ? onboardingLink(row.token) : welcomeLink(row.token) },
    note: '¿Alguna duda? Responde a este email o escríbeme por WhatsApp.',
    signOff: true,
  })
  const ok = await sendEmail(row.email, resend ? 'Tu onboarding con José te está esperando' : 'Empezamos: tu onboarding con José', html).catch(() => false)
  if (ok) await db.from('onboardings').update({ last_sent_at: new Date().toISOString() }).eq('id', row.id)
  return ok
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

// A client who came in through the main /onboarding link: tie their row to
// their lead by email, or open one for them (tagged Onboarding), so they show
// up in the contact list with their answers. While they are still filling it
// in, the lead we opened sits in "lead"; once they finish it becomes a client.
export async function linkToProfile(db: SupabaseClient, row: { id: string; deal_id?: string | null; name?: string | null; email?: string | null; phone?: string | null }, complete = false): Promise<string | null> {
  const email = (row.email ?? '').trim().toLowerCase()
  let dealId = row.deal_id ?? null
  if (!dealId && email) dealId = (await dealForEmail(db, email).catch(() => null))?.id ?? null
  if (dealId) {
    if (complete) {
      const { data: d } = await db.from('deals').select('stage, tags').eq('id', dealId).maybeSingle()
      if (d?.stage === 'lead' && Array.isArray(d.tags) && d.tags.includes('Onboarding')) {
        await db.from('deals').update({ stage: 'active', next_step: 'Revisar su onboarding y preparar el plan', updated_at: new Date().toISOString() }).eq('id', dealId)
      }
    }
  } else {
    if (!email) return null
    const now = new Date().toISOString()
    dealId = 'lead-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const { error } = await db.from('deals').insert({
      id: dealId, client_name: (row.name ?? '').trim() || email, client_email: email, client_phone: row.phone || null,
      stage: complete ? 'active' : 'lead', value: 0, currency: 'EUR', service: 'Coaching 1:1', tags: ['Onboarding'],
      next_step: complete ? 'Revisar su onboarding y preparar el plan' : 'Terminar su onboarding', next_step_date: now.slice(0, 10),
      activity: [{ id: 'a' + Math.random().toString(36).slice(2, 10), ts: now, type: 'note', text: 'Entró por el enlace de onboarding.' }],
      created_at: now, updated_at: now,
    })
    if (error) return null
  }
  if (dealId !== row.deal_id) await db.from('onboardings').update({ deal_id: dealId }).eq('id', row.id)
  return dealId
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
    .select('id, client_phone, goals, desired_outcome, current_state, blockers, tags').eq('id', dealId).maybeSingle()
  if (!deal) return
  const v = (k: string) => str(a, k)
  const goals = [list(a, 'objetivo').join(', '), v('plazo') && `Plazo: ${v('plazo')}`].filter(Boolean).join(' · ')
  const desired = [v('objetivo_detalle'), v('porque') && `¿Por qué ahora? ${v('porque')}`].filter(Boolean).join('\n')
  const current = [
    [v('edad') && `${v('edad')} años`, v('peso') && `${v('peso')} kg`, v('altura') && `${v('altura')} cm`].filter(Boolean).join(' · '),
    `Entrena: ${v('dias')} · ${v('lugar')}`,
    `Compromiso ${v('compromiso')}/10`,
  ].filter(Boolean).join('\n')
  const health = parqYes(a).length || (!list(a, 'salud_ok').length && v('salud')) ? healthSummary(a) : ''
  const patch: Record<string, unknown> = {}
  // Their goals become tags on the deal (Perder grasa, Ganar músculo, Ganar confianza…).
  const tags = Array.isArray(deal.tags) ? (deal.tags as string[]) : []
  const goalTags = list(a, 'objetivo').filter(t => !tags.includes(t))
  if (goalTags.length) patch.tags = [...tags, ...goalTags]
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
  const html = wrapEmail(value ? `Nuevo cliente: ${money(value, currency)}` : 'Nuevo cliente cerrado', `<p>José ha cerrado un cliente nuevo: <strong>${escapeHtml(name)}</strong>.</p>` + detailRows([
    ['Cliente', name], ['Email', c.email], ['WhatsApp', c.phone], ['Servicio', c.service],
    ['Cómo', c.trigger === 'payment' ? 'Pago confirmado' : 'Marcado como cliente en el pipeline'],
    ['Importe', value ? money(value, currency) : 'Sin importe en la ficha'],
    ['Comisión 10 %', value ? money(value * 0.1, currency) : ''],
    ['Fecha', new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })],
  ]), { label: 'Abrir el panel', href: `${SITE_URL}/admin` }, `${name} acaba de empezar el programa.`, 'Cliente cerrado')
  await Promise.allSettled(to.map(addr => sendEmail(addr, `Nuevo cliente: ${name}${value ? ` · ${money(value, currency)}` : ''}`, html)))
}
