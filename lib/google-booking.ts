// José's own Google Calendar, connected once from /admin/bookings.
// Scopes: read free/busy across his calendars, and write events (the call
// itself, with a Meet link). The refresh token lives in app_settings 'google'.
import { readSetting, writeSetting } from '@/lib/app-settings'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'openid', 'email',
].join(' ')

type GoogleSetting = { refreshToken?: string; email?: string; connectedAt?: string }

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function redirectUri(origin: string): string {
  return `${origin}/api/google/callback`
}

export function consentUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`
}

export async function exchangeCode(code: string, origin: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', redirect_uri: redirectUri(origin), grant_type: 'authorization_code' }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.refresh_token) return { ok: false, error: j.error_description || j.error || 'Google no devolvió acceso.' }
  let email: string | undefined
  try { email = JSON.parse(Buffer.from(String(j.id_token).split('.')[1], 'base64url').toString()).email } catch {}
  return writeSetting('google', { refreshToken: j.refresh_token, email, connectedAt: new Date().toISOString() })
}

export async function googleStatus(): Promise<{ connected: boolean; email?: string }> {
  const g = await readSetting<GoogleSetting>('google', {})
  return { connected: !!g.refreshToken, email: g.email }
}

async function accessToken(): Promise<string | null> {
  const g = await readSetting<GoogleSetting>('google', {})
  if (!g.refreshToken || !googleConfigured()) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: g.refreshToken, client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', grant_type: 'refresh_token' }),
  })
  const j = await res.json().catch(() => ({}))
  return res.ok && j.access_token ? j.access_token : null
}

// Busy blocks from his primary calendar. Null = could not ask Google (not
// connected or failed); the caller then relies on bookings alone.
export async function busyBlocks(fromIso: string, toIso: string): Promise<{ start: number; end: number }[] | null> {
  const token = await accessToken()
  if (!token) return null
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin: fromIso, timeMax: toIso, items: [{ id: 'primary' }] }),
  })
  if (!res.ok) return null
  const j = await res.json().catch(() => ({}))
  const busy = (j.calendars?.primary?.busy ?? []) as { start: string; end: string }[]
  return busy.map(b => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
}

export async function createCallEvent(o: { summary: string; description: string; startIso: string; endIso: string; attendeeEmail?: string; requestId: string }): Promise<{ id: string; meetUrl?: string } | null> {
  const token = await accessToken()
  if (!token) return null
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      summary: o.summary,
      description: o.description,
      start: { dateTime: o.startIso },
      end: { dateTime: o.endIso },
      attendees: o.attendeeEmail ? [{ email: o.attendeeEmail }] : undefined,
      conferenceData: { createRequest: { requestId: o.requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    }),
  })
  if (!res.ok) return null
  const j = await res.json().catch(() => ({}))
  const meetUrl = j.hangoutLink || j.conferenceData?.entryPoints?.find((e: { entryPointType: string }) => e.entryPointType === 'video')?.uri
  return { id: j.id, meetUrl }
}

export async function cancelCallEvent(eventId: string): Promise<boolean> {
  const token = await accessToken()
  if (!token) return false
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } })
  return res.ok || res.status === 410
}
