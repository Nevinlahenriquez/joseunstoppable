import type { SupabaseClient } from '@supabase/supabase-js'
import { readToken, signToken } from '@/lib/auth'
import { sendEmail, wrapEmail, firstNameOf, SITE_URL, OWNER_EMAIL } from '@/lib/email'
import { escapeHtml } from '@/lib/escape-html'
import { newToken } from '@/lib/onboarding'
import { PORTAL_SESSION_DAYS, portalPath, type PortalAccess, type PortalMessage } from '@/lib/portal'

// Server side of the client portal: who counts as a client, their personal
// link, the emailed sign-in link and everything the portal shows them.

// Pipeline stages that make someone a client (contract signed or paying).
const CLIENT_STAGES = ['signed', 'active', 'completed']

export const normEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase().slice(0, 160) : '')

function newAccess(email: string, name: string | null, dealId: string | null) {
  return {
    id: email, token: newToken(), email, name: name?.trim().slice(0, 120) || null, deal_id: dealId,
    active: true, app_url: null, app_ready: false, login_nonce: null, invited_at: null, last_login_at: null,
    created_at: new Date().toISOString(),
  }
}

// Everyone who should have a portal: clients in the pipeline, signed
// contracts and onboardings. Adds the missing ones, never touches the rest.
export async function syncAccess(db: SupabaseClient): Promise<number> {
  const [deals, proposals, onboardings, existing] = await Promise.all([
    db.from('deals').select('id, client_name, client_email, stage').in('stage', CLIENT_STAGES).limit(2000),
    db.from('proposals').select('client_name, client_email, deal_id').eq('status', 'signed').is('deleted_at', null).limit(2000),
    db.from('onboardings').select('name, email, deal_id').limit(2000),
    db.from('portal_access').select('id').limit(5000),
  ])
  if (existing.error) return 0
  const have = new Set((existing.data ?? []).map(r => r.id as string))
  const add = new Map<string, ReturnType<typeof newAccess>>()
  const consider = (email: unknown, name: unknown, dealId: unknown) => {
    const e = normEmail(email)
    if (!e || !e.includes('@') || have.has(e) || add.has(e)) return
    add.set(e, newAccess(e, typeof name === 'string' ? name : null, typeof dealId === 'string' ? dealId : null))
  }
  for (const d of deals.data ?? []) consider(d.client_email, d.client_name, d.id)
  for (const p of proposals.data ?? []) consider(p.client_email, p.client_name, p.deal_id)
  for (const o of onboardings.data ?? []) consider(o.email, o.name, o.deal_id)
  if (!add.size) return 0
  const { error } = await db.from('portal_access').upsert([...add.values()], { onConflict: 'id', ignoreDuplicates: true })
  return error ? 0 : add.size
}

// The client's portal row, created on the spot when the email belongs to a
// client who has none yet. Null for anyone who is not a client.
export async function accessFor(db: SupabaseClient, email: string): Promise<PortalAccess | null> {
  const e = normEmail(email)
  if (!e) return null
  const found = await db.from('portal_access').select('*').eq('id', e).maybeSingle()
  if (found.data) return found.data as PortalAccess
  if (found.error) return null
  await syncAccess(db)
  const again = await db.from('portal_access').select('*').eq('id', e).maybeSingle()
  return (again.data as PortalAccess | null) ?? null
}

export const portalUrl = (token: string) => `${SITE_URL}${portalPath(token)}`

// Emails a one-time sign-in link, valid for 2 hours. Opening it a second time
// does nothing, so a forwarded email can't be reused.
export async function sendSignInLink(db: SupabaseClient, access: PortalAccess): Promise<boolean> {
  const nonce = newToken()
  const { error } = await db.from('portal_access').update({ login_nonce: nonce }).eq('id', access.id)
  if (error) return false
  const t = await signToken({ kind: 'portal-link', email: access.email, n: nonce }, '2h')
  const url = `${SITE_URL}/portal/entrar?t=${encodeURIComponent(t)}`
  const html = wrapEmail(
    'Entra en tu portal',
    `<p>Hola ${escapeHtml(firstNameOf(access.name, ''))},</p>` +
      '<p>Pulsa el botón para entrar en tu portal de cliente. El enlace sirve una vez y caduca en 2 horas.</p>' +
      `<p>Después seguirás dentro en este dispositivo durante ${PORTAL_SESSION_DAYS} días.</p>`,
    { label: 'Entrar en mi portal', href: url },
    'Tu enlace para entrar',
  )
  return sendEmail(access.email, 'Tu enlace para entrar en el portal', html).catch(() => false)
}

// Opens a sign-in link: the email it belongs to, once, or null.
export async function consumeSignInLink(db: SupabaseClient, t: string): Promise<string | null> {
  const p = await readToken(t, 'portal-link')
  const email = normEmail(p?.email)
  const n = typeof p?.n === 'string' ? p.n : ''
  if (!email || !n) return null
  const { data } = await db.from('portal_access').update({ login_nonce: null, last_login_at: new Date().toISOString() })
    .eq('id', email).eq('login_nonce', n).eq('active', true).select('id')
  return data?.length ? email : null
}

export const createPortalSession = (email: string) =>
  signToken({ kind: 'portal', email }, `${PORTAL_SESSION_DAYS}d`)

export async function readPortalSession(cookie: string | undefined): Promise<string | null> {
  const p = await readToken(cookie, 'portal')
  return normEmail(p?.email) || null
}

// The personal portal link, emailed by José from /admin/portal.
export async function sendInvite(db: SupabaseClient, access: PortalAccess): Promise<boolean> {
  const html = wrapEmail(
    'Tu portal de cliente',
    `<p>Hola ${escapeHtml(firstNameOf(access.name, ''))},</p>` +
      '<p>Ya tienes tu portal de cliente: tu contrato, tus facturas, el acceso a tu app de entrenamiento y un sitio para mandarme tus preguntas.</p>' +
      '<p>Guarda este enlace. Para entrar solo tienes que confirmar tu email y te llega un enlace de acceso.</p>',
    { label: 'Abrir mi portal', href: portalUrl(access.token) },
    'Tu portal de cliente ya está listo',
  )
  const ok = await sendEmail(access.email, 'Tu portal de cliente con José', html).catch(() => false)
  if (ok) await db.from('portal_access').update({ invited_at: new Date().toISOString() }).eq('id', access.id)
  return ok
}

export async function notifyNewQuestion(access: PortalAccess, body: string) {
  const html = wrapEmail(
    'Nueva pregunta en el portal',
    `<p><strong>${escapeHtml(access.name || access.email)}</strong> te ha escrito desde su portal:</p>` +
      `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #5BBCEE;background:#F1F8FD;white-space:pre-wrap">${escapeHtml(body)}</blockquote>`,
    { label: 'Responder', href: `${SITE_URL}/admin/portal?c=${encodeURIComponent(access.email)}` },
  )
  await sendEmail(OWNER_EMAIL, `Pregunta de ${access.name || access.email}`, html)
}

export async function notifyAnswer(access: PortalAccess, body: string) {
  const html = wrapEmail(
    'José te ha respondido',
    `<p>Hola ${escapeHtml(firstNameOf(access.name, ''))},</p>` +
      `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #5BBCEE;background:#F1F8FD;white-space:pre-wrap">${escapeHtml(body)}</blockquote>`,
    { label: 'Abrir mi portal', href: portalUrl(access.token) },
  )
  return sendEmail(access.email, 'José ha respondido a tu pregunta', html).catch(() => false)
}

export type PortalData = {
  access: PortalAccess
  deal: { client_name: string | null; service: string | null; stage: string | null; value: number | null; currency: string | null; close_date: string | null; goals: string | null } | null
  contracts: Array<{ id: string; token: string; title: string | null; ref: string | null; status: string; total: number | null; currency: string | null; signed_at: string | null; sent_at: string | null }>
  invoices: Array<{ id: string; number: string | null; status: string | null; issue_date: string | null; due_date: string | null; currency: string | null; total: number }>
  onboarding: { token: string; status: string } | null
  messages: PortalMessage[]
}

// Everything the portal shows one client, matched by their email.
export async function loadPortal(db: SupabaseClient, access: PortalAccess): Promise<PortalData> {
  const e = access.email
  const [deals, proposals, invoices, onboardings, messages] = await Promise.all([
    db.from('deals').select('id, client_name, service, stage, value, currency, close_date, goals')
      .ilike('client_email', e).neq('stage', 'lost').order('created_at', { ascending: false }).limit(5),
    db.from('proposals').select('id, token, title, ref, status, total, currency, signed_at, sent_at')
      .ilike('client_email', e).is('deleted_at', null).in('status', ['sent', 'signed']).order('created_at', { ascending: false }).limit(20),
    db.from('invoices').select('id, number, status, issue_date, due_date, currency, line_items, taxes')
      .ilike('client_email', e).is('deleted_at', null).neq('status', 'draft').neq('status', 'void').order('created_at', { ascending: false }).limit(30),
    db.from('onboardings').select('token, status').eq('email', e).order('created_at', { ascending: false }).limit(1),
    db.from('portal_messages').select('*').eq('email', e).order('created_at', { ascending: true }).limit(200),
  ])
  const deal = (access.deal_id && deals.data?.find(d => d.id === access.deal_id)) || deals.data?.[0] || null
  return {
    access,
    deal: deal ? { client_name: deal.client_name, service: deal.service, stage: deal.stage, value: deal.value, currency: deal.currency, close_date: deal.close_date, goals: deal.goals } : null,
    contracts: (proposals.data ?? []) as PortalData['contracts'],
    invoices: (invoices.data ?? []).map(i => {
      const lines = Array.isArray(i.line_items) ? i.line_items as Array<{ quantity?: number; price?: number }> : []
      const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0) + (Number(i.taxes) || 0)
      return { id: i.id, number: i.number, status: i.status, issue_date: i.issue_date, due_date: i.due_date, currency: i.currency, total }
    }),
    onboarding: (onboardings.data?.[0] as PortalData['onboarding']) ?? null,
    messages: (messages.data ?? []) as PortalMessage[],
  }
}
