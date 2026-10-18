import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose'
import type { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'jose_session'

export const SHARED_COOKIE_DOMAIN = '.joseunstoppable.com'

export function sessionCookieDomain(host: string | null | undefined): string | undefined {
  const h = String(host || '').split(':')[0].toLowerCase()
  return h === 'joseunstoppable.com' || h.endsWith('.joseunstoppable.com') ? SHARED_COOKIE_DOMAIN : undefined
}

export type Role = 'admin' | 'editor' | 'partner' | 'client'

const OWNER_EMAILS = [(process.env.OS_ADMIN_EMAIL || 'hola@joseunstoppable.com').trim().toLowerCase()]

export function adminEmails(): string[] {
  const fromEnv = (process.env.OS_ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set([...OWNER_EMAILS, ...fromEnv]))
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase())
}

export function editorEmails(): string[] {
  return (process.env.OS_EDITOR_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function isEditorEmail(email: string): boolean {
  return editorEmails().includes(email.trim().toLowerCase())
}

export function roleForEmail(email: string): Role {
  if (isAdminEmail(email)) return 'admin'
  if (isEditorEmail(email)) return 'editor'
  return 'client'
}

export async function isClientEmail(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !email) return false
  const e = email.trim()
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key)

    const { data: deals } = await sb
      .from('deals')
      .select('id')
      .ilike('client_email', e)
      .eq('stage', 'signed')
      .limit(1)
    return !!(deals && deals.length)
  } catch {
    return false
  }
}

const MIN_SECRET_LEN = 16

function rawSecret(): string | null {
  const s = process.env.AUTH_SECRET
  if (s && s.length >= MIN_SECRET_LEN) return s
  const p = process.env.OS_ADMIN_PASSWORD
  if (p && p.length >= MIN_SECRET_LEN) return p
  if (process.env.NODE_ENV !== 'production') return 'dev-only-insecure-secret-change-me'
  return null
}

export function isAuthConfigured(): boolean {
  return rawSecret() !== null && (!!process.env.GOOGLE_CLIENT_ID || !!process.env.OS_ADMIN_PASSWORD)
}

// ADMIN_OPEN=1 in Vercel turns the /admin password off while the dashboard is
// being reviewed. Remove the variable to lock it again, no deploy needed.
export function adminOpen(): boolean {
  return process.env.ADMIN_OPEN === '1'
}

function devBypass(): boolean {
  if (adminOpen()) return true
  return process.env.NODE_ENV !== 'production' && !isAuthConfigured()
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  if (devBypass()) return true
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  return session?.role === 'admin'
}

export async function isContentStaffRequest(req: NextRequest): Promise<boolean> {
  if (devBypass()) return true
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  return session?.role === 'admin' || session?.role === 'editor'
}

function secretKey(): Uint8Array | null {
  const s = rawSecret()
  return s ? new TextEncoder().encode(s) : null
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export function verifyAdminPassword(password: string): { email: string; role: Role } | null {
  const expected = process.env.OS_ADMIN_PASSWORD
  if (!expected || expected.length < MIN_SECRET_LEN || !password) return null
  if (!constantTimeEqual(password, expected)) return null
  return { email: OWNER_EMAILS[0], role: 'admin' }
}

export const STAFF_EMAIL = 'team@joseunstoppable.com'

export function verifyStaffPassword(password: string): { email: string; role: Role; staff: true } | null {
  const expected = process.env.OS_STAFF_PASSWORD
  if (!expected || expected.length < MIN_SECRET_LEN || !password) return null

  if (process.env.OS_ADMIN_PASSWORD && expected === process.env.OS_ADMIN_PASSWORD) return null
  if (!constantTimeEqual(password, expected)) return null
  return { email: STAFF_EMAIL, role: 'admin', staff: true }
}

export const PARTNER_EMAIL = ''

export function verifyPartnerPassword(password: string): { email: string; role: Role; staff: false } | null {

  const expected = process.env.OS_PARTNER_PASSWORD
  if (!expected || expected.length < MIN_SECRET_LEN || !password) return null
  if (process.env.OS_ADMIN_PASSWORD && expected === process.env.OS_ADMIN_PASSWORD) return null
  if (process.env.OS_STAFF_PASSWORD && expected === process.env.OS_STAFF_PASSWORD) return null
  if (!constantTimeEqual(password, expected)) return null
  return { email: PARTNER_EMAIL, role: 'partner', staff: false }
}

export async function isBoardRequest(req: NextRequest): Promise<boolean> {
  if (devBypass()) return true
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  return session?.role === 'admin' || session?.role === 'partner'
}

export async function isOwnerRequest(req: NextRequest): Promise<boolean> {
  if (devBypass()) return true
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  return session?.role === 'admin' && !session.staff
}

export async function createSessionToken(email: string, role: Role, staff = false): Promise<string> {
  const key = secretKey()
  if (!key) throw new Error('AUTH_SECRET is not configured')
  return new SignJWT({ email, role, staff })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key)
}

export async function createMagicToken(email: string): Promise<string> {
  const key = secretKey()
  if (!key) throw new Error('AUTH_SECRET is not configured')
  return new SignJWT({ email, kind: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(key)
}

export async function verifyMagicToken(token: string | undefined): Promise<string | null> {
  if (!token) return null
  const key = secretKey()
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key)
    if (payload.kind !== 'magic') return null
    return typeof payload.email === 'string' && payload.email ? payload.email : null
  } catch {
    return null
  }
}

export async function verifySessionToken(token: string | undefined): Promise<{ email: string; role: Role; staff?: boolean } | null> {
  if (!token) return null
  const key = secretKey()
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key)
    const email = typeof payload.email === 'string' ? payload.email : ''
    if (!email) return null

    const claimed = payload.role
    const isKnownRole = claimed === 'admin' || claimed === 'editor' || claimed === 'partner' || claimed === 'client'

    let role: Role = isKnownRole ? claimed : roleForEmail(email)
    if (role === 'admin' && !isAdminEmail(email)) role = roleForEmail(email)
    return { email, role, staff: payload.staff === true }
  } catch {
    return null
  }
}

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export async function verifyGoogleCredential(credential: string): Promise<{ email: string; role: Role } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return null
  try {
    const { payload } = await jwtVerify(credential, googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: clientId,
    })
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
    const verified = payload.email_verified === true || payload.email_verified === 'true'
    if (!email || !verified) return null
    if (isAdminEmail(email)) return { email, role: 'admin' }
    if (await isClientEmail(email)) return { email, role: 'client' }
    return null
  } catch {
    return null
  }
}
