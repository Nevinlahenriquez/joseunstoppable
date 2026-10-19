import { NextRequest, NextResponse } from 'next/server'
import { adminEmails, isOwnerRequest } from '@/lib/auth'
import { hashPassword, MIN_PASSWORD } from '@/lib/admin-users'
import { serviceDb, NO_DB, isMissingTable } from '@/lib/os-supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MISSING = 'Falta la tabla de accesos. Pulsa "Preparar base de datos" en Inicio.'

// GET: who can sign in to /admin. Owner only.
export async function GET(req: NextRequest) {
  if (!(await isOwnerRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json({ ...NO_DB, users: [], envEmails: adminEmails() })
  const { data, error } = await db.from('admin_users').select('id, name, password_hash, last_login_at, created_at').order('created_at', { ascending: true })
  if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING, users: [], envEmails: adminEmails() })
  const users = (data ?? []).map(u => ({ email: u.id, name: u.name, hasPassword: !!u.password_hash, lastLoginAt: u.last_login_at, createdAt: u.created_at }))
  return NextResponse.json({ ok: !error, error: error?.message, users, envEmails: adminEmails(), passcodeSet: !!process.env.OS_ADMIN_PASSWORD })
}

// POST { email, name?, password? }: add an admin, or change their password.
// Without a password they sign in with an emailed link only.
export async function POST(req: NextRequest) {
  if (!(await isOwnerRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : ''
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) : ''
  const password = typeof b.password === 'string' ? b.password : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: 'Escribe un email válido.' }, { status: 400 })
  if (password && password.length < MIN_PASSWORD) return NextResponse.json({ ok: false, error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 })
  const row: Record<string, unknown> = { id: email }
  if (name) row.name = name
  if (password) row.password_hash = await hashPassword(password)
  const { error } = await db.from('admin_users').upsert(row, { onConflict: 'id' })
  if (isMissingTable(error)) return NextResponse.json({ ok: false, error: MISSING }, { status: 503 })
  return NextResponse.json(error ? { ok: false, error: error.message } : { ok: true })
}

// DELETE ?email=: remove an admin login.
export async function DELETE(req: NextRequest) {
  if (!(await isOwnerRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const email = (req.nextUrl.searchParams.get('email') ?? '').trim().toLowerCase()
  const { error } = await db.from('admin_users').delete().eq('id', email)
  return NextResponse.json(error ? { ok: false, error: error.message } : { ok: true })
}
