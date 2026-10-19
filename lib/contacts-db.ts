// The `contacts` table: one row per person, whatever door they came in by
// (lead form, booked call, pipeline card, event, onboarding). It is rebuilt
// from those tables on demand, so it can never drift from them, and it keeps
// the few fields only José edits by hand (notes, InvoiceShift keys).

import type { SupabaseClient } from '@supabase/supabase-js'
import { goalsFromText, cleanTags } from './goals'
import { str, list, type Answers } from './onboarding'

export type ContactRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status: 'lead' | 'client'
  source: string | null
  goals: string[]
  tags: string[]
  events: string[]
  deal_id: string | null
  booking_count: number
  last_booking_at: string | null
  onboarding_status: string | null
  onboarding_id: string | null
  // From the booking questionnaire (/reserva).
  urgency: string | null
  blocker: string | null
  key_date: string | null
  budget: string | null
  call_answers: Record<string, string> | null
  // From the onboarding form.
  age: number | null
  weight_kg: number | null
  height_cm: number | null
  measurements: Record<string, string> | null
  goal_detail: string | null
  timeframe: string | null
  health: string | null
  work: string | null
  meals: string | null
  sleep: string | null
  training_days: string | null
  training_place: string | null
  food_likes: string | null
  food_dislikes: string | null
  commitment: number | null
  ready_to_change: string | null
  why_now: string | null
  // Hand-kept: never overwritten by a sync.
  notes: string | null
  invoiceshift_customer_id: string | null
  invoiceshift_synced_at: string | null
  first_seen: string | null
  last_seen: string | null
  updated_at: string | null
}

// Fields a sync leaves alone, because José (or a later InvoiceShift sync) owns them.
export const MANUAL_FIELDS = ['notes', 'invoiceshift_customer_id', 'invoiceshift_synced_at'] as const

const lower = (s?: string | null) => (s ?? '').trim().toLowerCase()
const digits = (s?: string | null) => (s ?? '').replace(/[^\d]/g, '')

export function contactId(email?: string | null, phone?: string | null): string {
  const e = lower(email)
  if (e) return e
  const d = digits(phone)
  return d.length >= 6 ? `tel:${d}` : ''
}

// The first number in what they typed: "82,5 kg" -> 82.5, "8/10" -> 8.
const num = (s: string) => {
  const m = s.match(/\d+(?:[.,]\d+)?/)
  return m ? parseFloat(m[0].replace(',', '.')) : null
}

// "Label: value" lines, as the booking flow writes its answers.
export function parseCallAnswers(notes?: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of (notes ?? '').split('\n')) {
    const m = line.replace(/^[•\-*]\s*/, '').match(/^([^:]{2,60}):\s*(.+)$/)
    if (m) out[m[1].trim()] = m[2].trim()
  }
  return out
}

const pick = (a: Record<string, string>, ...starts: string[]) => {
  const k = Object.keys(a).find(k => starts.some(s => lower(k).startsWith(s)))
  return k ? a[k] : ''
}

export function fieldsFromAnswers(a: Answers): Partial<ContactRow> {
  const v = (k: string) => str(a, k)
  const meds: Record<string, string> = {}
  for (const k of ['cintura', 'cadera', 'pecho', 'brazo', 'pierna']) if (v(k)) meds[k] = v(k)
  return {
    age: v('edad') ? num(v('edad')) : null,
    weight_kg: v('peso') ? num(v('peso')) : null,
    height_cm: v('altura') ? num(v('altura')) : null,
    measurements: Object.keys(meds).length ? meds : null,
    goal_detail: v('objetivo_detalle') || null,
    timeframe: v('plazo') || null,
    health: list(a, 'salud_ok').length ? 'Nada que destacar' : v('salud') || null,
    work: v('trabajo') || null,
    meals: v('comidas') || null,
    sleep: v('sueno') || null,
    training_days: v('dias') || null,
    training_place: v('lugar') || null,
    food_likes: v('gusta') || null,
    food_dislikes: v('no_gusta') || null,
    commitment: v('compromiso') ? num(v('compromiso')) : null,
    ready_to_change: v('cambiar') || null,
    why_now: v('porque') || null,
  }
}

const empty = (id: string): ContactRow => ({
  id, name: null, email: null, phone: null, status: 'lead', source: null, goals: [], tags: [], events: [],
  deal_id: null, booking_count: 0, last_booking_at: null, onboarding_status: null, onboarding_id: null,
  urgency: null, blocker: null, key_date: null, budget: null, call_answers: null,
  age: null, weight_kg: null, height_cm: null, measurements: null, goal_detail: null, timeframe: null,
  health: null, work: null, meals: null, sleep: null, training_days: null, training_place: null,
  food_likes: null, food_dislikes: null, commitment: null, ready_to_change: null, why_now: null,
  notes: null, invoiceshift_customer_id: null, invoiceshift_synced_at: null,
  first_seen: null, last_seen: null, updated_at: null,
})

type Rows = Record<string, unknown>[]
const s = (r: Record<string, unknown>, k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '')
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const CLIENT_STAGES = ['signed', 'active', 'completed']

// Fold every source table into one row per person. Later facts win for
// single fields; lists only grow.
export function buildContacts(src: { deals: Rows; leads: Rows; bookings: Rows; onboardings: Rows; attendees: Rows }): ContactRow[] {
  const map = new Map<string, ContactRow>()
  const touch = (email: string, phone: string, name: string, at: string, source?: string) => {
    const id = contactId(email, phone)
    if (!id) return null
    const c = map.get(id) ?? empty(id)
    if (name) c.name = name
    if (email) c.email = lower(email)
    if (phone) c.phone = phone
    if (source && !c.source) c.source = source
    if (at && (!c.first_seen || at < c.first_seen)) c.first_seen = at
    if (at && (!c.last_seen || at > c.last_seen)) c.last_seen = at
    map.set(id, c)
    return c
  }
  const add = (c: ContactRow, key: 'goals' | 'tags' | 'events', xs: string[]) => {
    for (const x of xs) if (x && !c[key].includes(x)) c[key].push(x)
  }
  const byTime = (rows: Rows, k: string) => [...rows].sort((a, b) => s(a, k).localeCompare(s(b, k)))

  for (const l of byTime(src.leads, 'created_at')) {
    const c = touch(s(l, 'email'), s(l, 'phone'), s(l, 'name'), s(l, 'created_at'), s(l, 'source'))
    if (!c) continue
    add(c, 'tags', cleanTags(arr(l.tags)))
    add(c, 'goals', goalsFromText(s(l, 'notes'), s(l, 'product'), arr(l.tags)))
    if (s(l, 'status') === 'client') c.status = 'client'
  }
  for (const d of byTime(src.deals, 'created_at')) {
    const c = touch(s(d, 'client_email'), s(d, 'client_phone'), s(d, 'client_name'), s(d, 'updated_at') || s(d, 'created_at'))
    if (!c) continue
    c.deal_id = s(d, 'id') || c.deal_id
    add(c, 'tags', cleanTags(arr(d.tags)))
    add(c, 'goals', goalsFromText(s(d, 'service'), s(d, 'desired_outcome'), s(d, 'goals'), s(d, 'notes'), arr(d.tags)))
    if (CLIENT_STAGES.includes(s(d, 'stage'))) c.status = 'client'
  }
  for (const b of byTime(src.bookings, 'created_at')) {
    const c = touch(s(b, 'email'), s(b, 'phone'), s(b, 'name'), s(b, 'created_at'), s(b, 'source'))
    if (!c) continue
    c.booking_count += 1
    const when = s(b, 'start_at') || s(b, 'created_at')
    if (!c.last_booking_at || when > c.last_booking_at) c.last_booking_at = when
    const qa = parseCallAnswers(s(b, 'notes'))
    if (Object.keys(qa).length) {
      c.call_answers = { ...(c.call_answers ?? {}), ...qa }
      c.urgency = pick(qa, 'urgencia') || c.urgency
      c.blocker = pick(qa, 'lo que más le frena', 'lo que mas le frena', 'qué le frena', 'que le frena') || c.blocker
      c.key_date = pick(qa, 'fecha clave') || c.key_date
      c.budget = pick(qa, 'inversión', 'inversion') || c.budget
      c.ready_to_change = pick(qa, 'listo para', 'dispuesto') || c.ready_to_change
      c.goal_detail = pick(qa, 'objetivo') || c.goal_detail
      const commit = pick(qa, 'compromiso')
      if (commit) c.commitment = num(commit)
    }
    add(c, 'goals', goalsFromText(s(b, 'notes')))
    if (s(b, 'status') === 'won') c.status = 'client'
  }
  for (const a of byTime(src.attendees, 'registered_at')) {
    const c = touch(s(a, 'email'), s(a, 'phone'), s(a, 'name'), s(a, 'registered_at'), s(a, 'source'))
    if (c) add(c, 'events', [s(a, 'event_title')])
  }
  for (const o of byTime(src.onboardings, 'created_at')) {
    const answers = (o.answers && typeof o.answers === 'object' ? o.answers : {}) as Answers
    const c = touch(s(o, 'email') || str(answers, 'email'), s(o, 'phone') || str(answers, 'whatsapp'), s(o, 'name') || str(answers, 'nombre'), s(o, 'completed_at') || s(o, 'created_at'))
    if (!c) continue
    // José only sends onboarding to people who signed up.
    c.status = 'client'
    c.onboarding_status = s(o, 'status') || c.onboarding_status
    c.onboarding_id = s(o, 'id') || c.onboarding_id
    for (const [k, v] of Object.entries(fieldsFromAnswers(answers))) {
      if (v !== null && v !== undefined) (c as Record<string, unknown>)[k] = v
    }
    add(c, 'goals', [...goalsFromText(list(answers, 'objetivo'), str(answers, 'objetivo_detalle'))])
  }
  return [...map.values()]
}

const SOURCES = {
  deals: ['deals', 'created_at'],
  leads: ['leads', 'created_at'],
  bookings: ['bookings', 'created_at'],
  onboardings: ['onboardings', 'created_at'],
  attendees: ['event_attendees', 'registered_at'],
} as const

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// Rebuild `contacts` from the source tables and write only what changed.
export async function syncContacts(db: SupabaseClient): Promise<{ ok: boolean; error?: string; contacts: ContactRow[]; written: number }> {
  const entries = Object.entries(SOURCES) as [keyof typeof SOURCES, readonly [string, string]][]
  const res = await Promise.all(entries.map(([, [table, order]]) => db.from(table).select('*').order(order, { ascending: true }).limit(5000)))
  const src = Object.fromEntries(entries.map(([k], i) => [k, (res[i].data ?? []) as Rows])) as Parameters<typeof buildContacts>[0]
  const built = buildContacts(src)

  const { data: existing, error } = await db.from('contacts').select('*').limit(10000)
  if (error) return { ok: false, error: error.message, contacts: built, written: 0 }
  const prev = new Map((existing ?? []).map(r => [r.id as string, r as ContactRow]))

  const now = new Date().toISOString()
  const changed: ContactRow[] = []
  const merged = built.map(c => {
    const old = prev.get(c.id)
    const next: ContactRow = { ...c }
    if (old) for (const k of MANUAL_FIELDS) (next as Record<string, unknown>)[k] = old[k]
    // A tag José added by hand on the contact stays.
    if (old) next.tags = Array.from(new Set([...next.tags, ...arr(old.tags)]))
    const dirty = !old || (Object.keys(next) as (keyof ContactRow)[]).some(k => k !== 'updated_at' && !same(next[k], old[k]))
    next.updated_at = dirty ? now : old!.updated_at
    if (dirty) changed.push(next)
    return next
  })
  // People who only exist in `contacts` (added there directly) are kept.
  for (const [id, old] of prev) if (!built.some(c => c.id === id)) merged.push(old)

  for (let i = 0; i < changed.length; i += 500) {
    const { error: e } = await db.from('contacts').upsert(changed.slice(i, i + 500))
    if (e) return { ok: false, error: e.message, contacts: merged, written: i }
  }
  return { ok: true, contacts: merged, written: changed.length }
}
