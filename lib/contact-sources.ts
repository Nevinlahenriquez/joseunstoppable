// Calls booked on /reserva and client onboardings live only in Supabase (no
// localStorage copy like the CRM), so the contact list pulls them through the
// admin APIs and keeps the last answer here for getPeople() to fold in.

import type { OnboardingRow } from './onboarding'
import type { ContactRow } from './contacts-db'

export type BookingRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  start_at: string | null
  status: string
  source: string | null
  meet_url: string | null
  created_at: string
}

export const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  booked: { label: 'Reservada', color: 'var(--os-accent)' },
  requested: { label: 'Sin hora', color: 'var(--os-warn)' },
  showed: { label: 'Vino', color: 'var(--os-good)' },
  won: { label: 'Cliente', color: 'var(--os-good)' },
  no_show: { label: 'No vino', color: 'var(--os-bad)' },
  cancelled: { label: 'Cancelada', color: 'var(--os-text-muted)' },
}

const CACHE_KEY = 'ju_contact_sources'

type Cache = { bookings: BookingRow[]; onboardings: OnboardingRow[]; contacts: ContactRow[] }

let cache: Cache | null = null

function read(): Cache {
  if (cache) return cache
  try {
    const raw = typeof window === 'undefined' ? null : sessionStorage.getItem(CACHE_KEY)
    if (raw) cache = JSON.parse(raw) as Cache
  } catch { /* private window or blocked storage */ }
  return { bookings: [], onboardings: [], contacts: [], ...cache }
}

export const getBookings = (): BookingRow[] => read().bookings
export const getOnboardings = (): OnboardingRow[] => read().onboardings
export const getContactRows = (): ContactRow[] => read().contacts

const lower = (s?: string | null) => (s ?? '').trim().toLowerCase()
export const bookingsFor = (email: string) => getBookings().filter(b => lower(b.email) === lower(email))
export const onboardingsFor = (email: string) => getOnboardings().filter(o => lower(o.email) === lower(email))
export const contactRowFor = (email: string) => getContactRows().find(c => c.id === lower(email) || lower(c.email) === lower(email)) ?? null

let inflight: Promise<void> | null = null

// Refresh all three lists. A failed call keeps what was there before.
export function hydrateContactSources(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  inflight ??= (async () => {
    const get = (url: string) => fetch(url).then(r => r.json()).catch(() => null)
    const [b, o, c] = await Promise.all([get('/api/admin/bookings'), get('/api/admin/onboarding'), get('/api/admin/contacts')])
    const prev = read()
    cache = {
      bookings: Array.isArray(b?.bookings) ? b.bookings : prev.bookings,
      onboardings: Array.isArray(o?.onboardings) ? o.onboardings : prev.onboardings,
      contacts: Array.isArray(c?.contacts) ? c.contacts : prev.contacts,
    }
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* ignore */ }
  })().finally(() => { inflight = null })
  return inflight
}
