import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { serviceDb, NO_DB } from '@/lib/os-supabase'
import { readSetting, writeSetting } from '@/lib/app-settings'
import { DEFAULT_AVAILABILITY, type Availability } from '@/lib/booking'
import { cancelCallEvent, googleConfigured, googleStatus } from '@/lib/google-booking'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  const [availability, google] = await Promise.all([readSetting<Availability>('availability', DEFAULT_AVAILABILITY), googleStatus()])
  if (!db) return NextResponse.json({ ...NO_DB, availability, google: { ...google, configured: googleConfigured() } })
  const { data, error } = await db.from('bookings').select('*').order('start_at', { ascending: false, nullsFirst: true }).limit(500)
  return NextResponse.json({ ok: !error, error: error?.message, bookings: data ?? [], availability, google: { ...google, configured: googleConfigured() } })
}

// PATCH { id, status }: mark showed / no-show / cancelled.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const db = await serviceDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !['booked', 'requested', 'showed', 'no_show', 'cancelled', 'won'].includes(status)) return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  if (status === 'cancelled') {
    const { data } = await db.from('bookings').select('google_event_id').eq('id', id).maybeSingle()
    if (data?.google_event_id) await cancelCallEvent(data.google_event_id)
  }
  const { error } = await db.from('bookings').update({ status }).eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}

// PUT { availability }: José's hours.
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const { availability } = await req.json().catch(() => ({}))
  if (!availability || typeof availability !== 'object') return NextResponse.json({ ok: false, error: 'bad input' }, { status: 400 })
  const a = availability as Availability
  const clean: Availability = {
    timeZone: typeof a.timeZone === 'string' && a.timeZone ? a.timeZone : DEFAULT_AVAILABILITY.timeZone,
    duration: Math.min(120, Math.max(10, Number(a.duration) || 30)),
    minNoticeHours: Math.min(168, Math.max(0, Number(a.minNoticeHours) || 0)),
    daysShown: Math.min(14, Math.max(1, Number(a.daysShown) || 5)),
    week: Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map(d => [d, (a.week?.[d] ?? []).filter(w => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(w.replace(/\s/g, ''))).map(w => w.replace(/\s/g, ''))])),
    meetingNote: typeof a.meetingNote === 'string' ? a.meetingNote.slice(0, 400) : '',
  }
  return NextResponse.json(await writeSetting('availability', clean))
}
