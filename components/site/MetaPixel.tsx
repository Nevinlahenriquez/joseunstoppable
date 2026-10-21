'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { LINKS } from '@/lib/site'

// Meta browser pixel behind a cookie banner (EU rules: no ad cookies before
// a yes). Renders nothing until NEXT_PUBLIC_META_PIXEL_ID is set in Vercel.
// Conversions fired here share their event id with the server-side CAPI
// event, so Meta counts each one once.

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '').split(',')[0].trim()
const CONSENT = 'ju_consent'

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown }
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

function readConsent(): string {
  const m = document.cookie.match(new RegExp('(?:^|; )' + CONSENT + '=([^;]*)'))
  return m ? m[1] : ''
}

// The banner's choice lives in a cookie; this lets React re-read it after a click.
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

function loadPixel() {
  if (window.fbq) return
  const f = function (...args: unknown[]) { if (f.callMethod) f.callMethod(...args); else f.queue.push(args) } as Fbq
  f.push = f; f.loaded = true; f.version = '2.0'; f.queue = []
  window.fbq = f; window._fbq = f
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(s)
  f('init', PIXEL_ID)
}

// A conversion in the browser, with the same id the server sends to CAPI.
export function trackMeta(event: string, eventId?: string, params: Record<string, unknown> = {}) {
  try { window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined) } catch {}
}

export function newEventId(prefix: string) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export default function MetaPixel() {
  const path = usePathname()
  const consent = useSyncExternalStore(subscribe, readConsent, () => null)

  useEffect(() => {
    if (!PIXEL_ID || consent !== 'yes') return
    loadPixel()
    window.fbq?.('track', 'PageView')
  }, [consent, path])

  if (!PIXEL_ID || consent === null || consent) return null

  const choose = (v: 'yes' | 'no') => {
    document.cookie = `${CONSENT}=${v};path=/;max-age=${v === 'yes' ? 31536000 : 15552000};samesite=lax`
    listeners.forEach(fn => fn())
  }

  return (
    <div className="cookie-bar" role="dialog" aria-label="Cookies">
      <p>
        <span data-es>Uso cookies de Meta para medir qué anuncios funcionan. Solo se activan si aceptas. </span>
        <span data-en>I use Meta cookies to see which ads work. They only turn on if you accept. </span>
        <Link href={LINKS.privacy}><span data-es>Más info</span><span data-en>More info</span></Link>
      </p>
      <div className="cookie-btns">
        <button type="button" className="cookie-no" onClick={() => choose('no')}><span data-es>Rechazar</span><span data-en>Decline</span></button>
        <button type="button" className="cookie-yes" onClick={() => choose('yes')}><span data-es>Aceptar</span><span data-en>Accept</span></button>
      </div>
    </div>
  )
}
