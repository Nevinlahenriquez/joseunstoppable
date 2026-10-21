// Per-visitor request limits for the public forms. Counts live in the
// function's memory, so they reset on a cold start and are not shared between
// instances: enough to stop one script hammering a form, not a full firewall.

type Hits = { first: number; count: number }

const buckets = new Map<string, Hits>()

function sweep(now: number) {
  if (buckets.size < 1000) return
  for (const [k, h] of buckets) if (now - h.first > 3600_000) buckets.delete(k)
}

// Records one request and says whether it is over `max` in `windowMs`.
export function overLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  sweep(now)
  const h = buckets.get(key)
  if (!h || now - h.first > windowMs) {
    buckets.set(key, { first: now, count: 1 })
    return false
  }
  h.count += 1
  return h.count > max
}

// The visitor's IP as Vercel reports it.
export function clientIp(headers: Headers): string {
  return headers.get('x-real-ip') || headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export const TOO_MANY = { error: 'Demasiados intentos. Espera unos minutos y vuelve a probar.' }
