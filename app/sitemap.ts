import type { MetadataRoute } from 'next'
import { LINKS, SITE_URL } from '@/lib/site'
import { serviceDb } from '@/lib/os-supabase'

// Rebuilt at most once an hour, so new event pages reach Google on their own.
export const revalidate = 3600

async function eventPaths(): Promise<{ path: string; updated?: string }[]> {
  try {
    const db = await serviceDb()
    if (!db) return []
    const { data } = await db.from('events').select('slug, status, created_at').eq('status', 'published')
    return (data ?? []).filter(r => r.slug).map(r => ({ path: `/events/${r.slug}`, updated: r.created_at ?? undefined }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages = [LINKS.home, LINKS.book, LINKS.webinar, LINKS.legal, LINKS.privacy, LINKS.terms].map(path => ({
    url: SITE_URL + (path === '/' ? '' : path),
    lastModified: now,
    changeFrequency: path === '/' || path === LINKS.book ? 'weekly' as const : 'monthly' as const,
    priority: path === '/' ? 1 : path === LINKS.book ? 0.9 : path === LINKS.webinar ? 0.7 : 0.3,
  }))
  const events = (await eventPaths()).map(e => ({
    url: SITE_URL + e.path,
    lastModified: e.updated ? new Date(e.updated) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
  return [...pages, ...events]
}
