export function uid(prefix = ''): string {
  const a = new Uint8Array(9)
  crypto.getRandomValues(a)
  return prefix + Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 14)
}

/** Local yyyy-mm-dd (never toISOString, which hands evenings the next day). */
export function ymd(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

/** Monday of the week that holds `s`. */
export function weekStart(s: string): string {
  const d = parseYmd(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return ymd(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000)
}

export function ageFrom(birth: string): number | null {
  if (!birth) return null
  const b = parseYmd(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return age > 0 && age < 120 ? age : null
}

/** "12-10-8-8" with 4 sets -> [12,10,8,8]; "10" with 3 sets -> [10,10,10]. */
export function repsPerSet(reps: string, sets: number): number[] {
  const parts = reps.split(/[-,/ ]+/).map(p => parseInt(p, 10)).filter(n => !Number.isNaN(n))
  const out: number[] = []
  for (let i = 0; i < sets; i++) out.push(parts[i] ?? parts[parts.length - 1] ?? 0)
  return out
}

/** Epley estimate of a one-rep max. */
export function e1rm(kg: number, reps: number): number {
  if (!kg || !reps) return 0
  if (reps === 1) return kg
  return Math.round(kg * (1 + reps / 30) * 10) / 10
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?'
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Shrinks a photo in the browser before it is stored (phones shoot 4000px). */
export async function shrinkImage(file: Blob, max = 1200, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res) => c.toBlob(b => res(b ?? file), 'image/jpeg', quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}
