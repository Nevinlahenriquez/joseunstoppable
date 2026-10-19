import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/auth'

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

// True for an owner email (env) or anyone added in /admin/access.
export async function isKnownAdmin(db: SupabaseClient | null, email: string): Promise<boolean> {
  if (isAdminEmail(email)) return true
  return !!db && !!(await adminUser(db, email).catch(() => null))
}
