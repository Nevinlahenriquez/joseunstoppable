import type { MetadataRoute } from 'next'
import { LINKS, SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [LINKS.home, LINKS.book, LINKS.webinar, LINKS.legal, LINKS.privacy, LINKS.terms].map(path => ({
    url: SITE_URL + (path === '/' ? '' : path),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : path === LINKS.book ? 0.9 : 0.5,
  }))
}
