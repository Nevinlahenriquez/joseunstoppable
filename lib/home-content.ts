// Everything on the home page that Jose fills in himself: videos, photos and
// client results. A slot left empty stays hidden, so the page never shows a
// gap or placeholder text. Photos go in public/images/ and are written here
// as '/images/<file>'; videos are a YouTube, Vimeo or .mp4 link.

// "Quién soy y cómo te ayudo": recorded vertical (9:16). It plays near the
// top of the page and again in the closing section.
export const INTRO_VIDEO = ''

// Last day of the free October calls. The notice hides itself after this date.
export const FREE_CALLS_UNTIL = '2026-10-31'

// Jose's own before and after, shown in "Mi historia".
export const JOSE_BEFORE_AFTER = { before: '', after: '' }

export type VideoTestimonial = { video: string; name: string; result: string }
export type PhotoTestimonial = { before: string; after: string; quote: string; name: string; result: string }

// Up to 3. name: 'Carlos, 42' · result: '−9 kg en 90 días'
export const VIDEO_TESTIMONIALS: VideoTestimonial[] = []

// Up to 6, each with written permission from the client.
export const PHOTO_TESTIMONIALS: PhotoTestimonial[] = []

// "Así es por dentro": a screen recording of the app, phone screenshots and
// videos of Jose correcting a client's technique.
export const INSIDE_VIDEO = ''

export type InsideShot = { src: string; es: string; en: string }
// e.g. { src: '/images/app-rutina.png', es: 'Tu rutina del día', en: 'Your workout for today' }
export const INSIDE_SHOTS: InsideShot[] = []

export const TECHNIQUE_VIDEOS: string[] = []
