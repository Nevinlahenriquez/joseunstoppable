import { serviceDb } from '@/lib/os-supabase'

export type BioLink = { id: string; label: string; url: string; position: number; active: boolean; highlight: boolean }

// Internal links get ref=bio so the lead form can say the person came from the
// link in bio. External links are left exactly as typed.
export function withBioRef(url: string, origin: string): string {
  try {
    const u = new URL(url, origin)
    if (u.origin !== new URL(origin).origin) return url
    if (!u.searchParams.has('ref')) u.searchParams.set('ref', 'bio')
    return u.toString()
  } catch { return url }
}

export function safeHref(url: string): string | null {
  if (url.startsWith('/')) return url
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:' ? url : null
  } catch { return null }
}

export async function activeLinks(): Promise<BioLink[]> {
  const db = await serviceDb()
  if (!db) return []
  const { data } = await db.from('bio_links').select('*').eq('active', true).order('position', { ascending: true })
  return (data ?? []) as BioLink[]
}

export async function logBioEvent(step: 'view' | 'click', path: string, referrer: string | null) {
  const db = await serviceDb()
  if (!db) return
  await db.from('funnel_events').insert({
    id: crypto.randomUUID(), funnel_id: 'links', step, path: path.slice(0, 300), referrer: referrer?.slice(0, 300) ?? null,
    created_at: new Date().toISOString(),
  }).then(() => undefined, () => undefined)
}
