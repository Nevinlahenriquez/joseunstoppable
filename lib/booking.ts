// The 30-minute call calendar. Hours are José's own, in his time zone, and
// edited from /admin/bookings. Slots are computed, never stored: a slot is
// free when no booking holds it and Google Calendar shows him free.

export type Availability = {
  timeZone: string
  duration: number           // minutes per call
  minNoticeHours: number     // no booking closer than this
  daysShown: number          // how many bookable days the page offers
  // ISO weekday 1 (Mon) .. 7 (Sun) -> windows like "10:00-13:00"
  week: Record<string, string[]>
  meetingNote: string
}

export const DEFAULT_AVAILABILITY: Availability = {
  timeZone: 'Europe/Madrid',
  duration: 30,
  minNoticeHours: 12,
  daysShown: 5,
  week: { '1': ['10:00-13:00', '17:00-20:00'], '2': ['10:00-13:00', '17:00-20:00'], '3': ['10:00-13:00', '17:00-20:00'], '4': ['10:00-13:00', '17:00-20:00'], '5': ['10:00-13:00'] },
  meetingNote: '',
}

// Offset (ms) of a time zone at a given instant.
function tzOffset(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('es-ES', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at)
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value)
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
  return asUtc - at.getTime()
}

// Wall time in a zone -> the real instant.
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const first = new Date(guess.getTime() - tzOffset(guess, timeZone))
  return new Date(guess.getTime() - tzOffset(first, timeZone))
}

function ymdIn(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

function isoWeekday(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return wd === 0 ? 7 : wd
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0) }
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export type Busy = { start: number; end: number }
export type DaySlots = { date: string; slots: { label: string; start: string }[] }

export function computeSlots(av: Availability, busy: Busy[], now = new Date()): DaySlots[] {
  const out: DaySlots[] = []
  const earliest = now.getTime() + av.minNoticeHours * 3600_000
  const dur = Math.max(10, av.duration) * 60_000
  let ymd = ymdIn(now, av.timeZone)
  for (let i = 0; i < 45 && out.length < av.daysShown; i++, ymd = addDays(ymd, 1)) {
    const windows = av.week[String(isoWeekday(ymd))] ?? []
    const slots: DaySlots['slots'] = []
    for (const w of windows) {
      const [a, b] = w.split('-').map(s => s.trim())
      if (!a || !b) continue
      for (let t = toMin(a); t + av.duration <= toMin(b); t += av.duration) {
        const start = zonedToUtc(ymd, toHHMM(t), av.timeZone).getTime()
        if (start < earliest) continue
        if (busy.some(x => start < x.end && start + dur > x.start)) continue
        slots.push({ label: toHHMM(t), start: new Date(start).toISOString() })
      }
    }
    if (slots.length) out.push({ date: ymd, slots })
  }
  return out
}

export function slotLabelEs(startIso: string, timeZone: string): string {
  const d = new Date(startIso)
  const day = d.toLocaleDateString('es-ES', { timeZone, weekday: 'long', day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('es-ES', { timeZone, hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}
