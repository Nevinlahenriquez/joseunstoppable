import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB, isMissingTable } from '@/lib/os-supabase'
import { readSetting, writeSetting } from '@/lib/app-settings'
import { newToken } from '@/lib/onboarding'
import { accessFor, normEmail, notifyAnswer, sendInvite, syncAccess } from '@/lib/portal-server'
import { DEFAULT_PORTAL, PORTAL_SETTING, type PortalAccess, type PortalSettings } from '@/lib/portal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MISSING = 'Faltan las tablas del portal. Pulsa "Preparar base de datos" en Inicio.'
const cap = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const url = (v: unknown) => { const s = cap(v, 500); return !s || /^https?:\/\//i.test(s) ? s : `https://${s}` }

// GET: every client with a portal (new clients are added first), their
// questions and the portal settings.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, clients: [], messages: [] })
  await syncAccess(db).catch(() => 0)
  const [clients, messages, settings] = await Promise.all([
    db.from('portal_access').select('*').order('created_at', { ascending: false }).limit(1000),
    db.from('portal_messages').select('*').order('created_at', { ascending: true }).limit(2000),
    readSetting<PortalSettings>(PORTAL_SETTING, DEFAULT_PORTAL),
  ])
  if (isMissingTable(clients.error) || isMissingTable(messages.error)) return NextResponse.json({ ok: false, error: MISSING, clients: [], messages: [], settings })
  return NextResponse.json({ ok: !clients.error, error: clients.error?.message, clients: clients.data ?? [], messages: messages.data ?? [], settings })
}

// POST { action: 'add', email, name } | { action: 'invite', email } |
//      { action: 'reply', email, body } | { action: 'read', email }
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const email = normEmail(b.email)
  if (!email.includes('@')) return NextResponse.json({ ok: false, error: 'Falta el email del cliente.' }, { status: 400 })

  if (b.action === 'add') {
    const row = { id: email, token: newToken(), email, name: cap(b.name, 120) || null, active: true, created_at: new Date().toISOString() }
    const { error } = await db.from('portal_access').upsert(row, { onConflict: 'id', ignoreDuplicates: true })
    if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING }, { status: 503 })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    const { data } = await db.from('portal_access').select('*').eq('id', email).maybeSingle()
    return NextResponse.json({ ok: true, client: data })
  }

  const access = await accessFor(db, email)
  if (!access) return NextResponse.json({ ok: false, error: 'Este cliente no tiene portal.' }, { status: 404 })

  if (b.action === 'invite') {
    const ok = await sendInvite(db, access)
    return NextResponse.json(ok ? { ok } : { ok, error: 'No se pudo enviar el email. Revisa RESEND_API_KEY en Vercel.' })
  }
  if (b.action === 'read') {
    await db.from('portal_messages').update({ read_at: new Date().toISOString() }).eq('email', email).eq('sender', 'client').is('read_at', null)
    return NextResponse.json({ ok: true })
  }
  if (b.action === 'reply') {
    const body = cap(b.body, 4000)
    if (!body) return NextResponse.json({ ok: false, error: 'Escribe la respuesta.' }, { status: 400 })
    const now = new Date().toISOString()
    const row = { id: 'pm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), email, sender: 'coach', body, read_at: null, created_at: now }
    const { error } = await db.from('portal_messages').insert(row)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    await db.from('portal_messages').update({ read_at: now }).eq('email', email).eq('sender', 'client').is('read_at', null)
    const emailed = await notifyAnswer(access as PortalAccess, body)
    return NextResponse.json({ ok: true, message: row, emailed })
  }
  return NextResponse.json({ ok: false, error: 'Acción desconocida.' }, { status: 400 })
}

// PATCH { email, active?, app_ready?, name?, app_url?, newLink? }
export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const email = normEmail(b.email)
  const patch: Record<string, unknown> = {}
  if (typeof b.active === 'boolean') patch.active = b.active
  if (typeof b.app_ready === 'boolean') patch.app_ready = b.app_ready
  if ('name' in b) patch.name = cap(b.name, 120) || null
  if ('app_url' in b) patch.app_url = url(b.app_url) || null
  // A new personal link: the old one stops working (signed-in devices stay in).
  if (b.newLink === true) Object.assign(patch, { token: newToken(), login_nonce: null })
  if (!email || !Object.keys(patch).length) return NextResponse.json({ ok: false, error: 'Nada que guardar.' }, { status: 400 })
  const { data, error } = await db.from('portal_access').update(patch).eq('id', email).select('*').maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, client: data })
}

// PUT settings: the app clients use (name + links) and a note on their home.
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const value: PortalSettings = {
    appName: cap(b.appName, 60) || DEFAULT_PORTAL.appName,
    signupUrl: url(b.signupUrl), appUrl: url(b.appUrl), iosUrl: url(b.iosUrl), androidUrl: url(b.androidUrl),
    note: cap(b.note, 1000),
  }
  const r = await writeSetting(PORTAL_SETTING, value)
  return NextResponse.json({ ...r, settings: value })
}
