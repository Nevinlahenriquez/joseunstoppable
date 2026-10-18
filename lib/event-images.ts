
export type EventImage = { src: string; label: string }

export const EVENT_IMAGE_LIBRARY: EventImage[] = [
  { src: '/images/events/default.svg', label: 'Por defecto' },
]

export const SHARED_DEFAULT_IMAGE = '/images/events/default.svg'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function eventImage(e: { id: string; thumbnailImage?: string; coverImage?: string }): string {
  for (const src of [e.thumbnailImage, e.coverImage]) {
    if (src && src !== SHARED_DEFAULT_IMAGE) return src
  }
  return EVENT_IMAGE_LIBRARY[hash(e.id) % EVENT_IMAGE_LIBRARY.length].src
}
