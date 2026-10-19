import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail, readToken, signToken } from '@/lib/auth'
import { sendEmail, wrapEmail, SITE_URL } from '@/lib/email'
import { newToken } from '@/lib/onboarding'

// Admin logins kept in the `admin_users` table, so José can add an email and
// password from /admin/access without touching Vercel. The owner passcode in
// OS_ADMIN_PASSWORD keeps working alongside them. Server only.

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>

export const MIN_PASSWORD = 8

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(pw, salt, 32)
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`
}

export async function checkPassword(pw: string, stored: string | null | undefined): Promise<boolean> {
  const [v, saltHex, hashHex] = String(stored ?? '').split(':')
  if (v !== 's1' || !saltHex || !hashHex) return false
  const want = Buffer.from(hashHex, 'hex')
  const got = await scrypt(pw, Buffer.from(saltHex, 'hex'), want.length)
  return got.length === want.length && timingSafeEqual(got, want)
}

export type AdminUser = { id: string; name: string | null; password_hash: string | null; last_login_at: string | null; created_at: string }

export async function adminUser(db: SupabaseClient, email: string): Promise<AdminUser | null> {
  const { data } = await db.from('admin_users').select('*').eq('id', email.trim().toLowerCase()).maybeSingle()
  return (data as AdminUser | null) ?? null
}

export async function verifyAdminUser(db: SupabaseClient, email: string, pw: string): Promise<boolean> {
  const u = await adminUser(db, email)
  if (!u || !(await checkPassword(pw, u.password_hash))) return false
  await db.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', u.id)
  return true
}

// Emails a one-time admin sign-in link to an owner email (OS_ADMIN_EMAIL /
// OS_ALLOWED_EMAILS) or anyone in admin_users. Others get nothing.
export async function sendAdminLink(db: SupabaseClient, rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase()
  const known = isAdminEmail(email) || !!(await adminUser(db, email))
  if (!known) return false
  const nonce = newToken()
  const { error } = await db.from('admin_users').upsert({ id: email, login_nonce: nonce }, { onConflict: 'id' })
  if (error) return false
  const t = await signToken({ kind: 'admin-link', email, n: nonce }, '30m')
  const html = wrapEmail(
    'Entrar al panel',
    '<p>Pulsa el botón para entrar al panel de José Unstoppable. El enlace sirve una vez y caduca en 30 minutos.</p>' +
      '<p>Si no lo has pedido tú, ignora este email.</p>',
    { label: 'Entrar al panel', href: `${SITE_URL}/admin/login?t=${encodeURIComponent(t)}` },
  )
  return sendEmail(email, 'Tu enlace para entrar al panel', html).catch(() => false)
}

export async function consumeAdminLink(db: SupabaseClient, t: string): Promise<string | null> {
  const p = await readToken(t, 'admin-link')
  const email = typeof p?.email === 'string' ? p.email : ''
  const n = typeof p?.n === 'string' ? p.n : ''
  if (!email || !n) return null
  const { data } = await db.from('admin_users').update({ login_nonce: null, last_login_at: new Date().toISOString() })
    .eq('id', email).eq('login_nonce', n).select('id')
  return data?.length ? email : null
}
