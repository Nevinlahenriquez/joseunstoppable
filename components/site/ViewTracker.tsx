'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { eventFunnelId } from '@/lib/event-analytics'

// Page-view beacon for the funnel stats in /admin. Runs on every client-side
// navigation too, which the old per-page inline script could not see.
export default function ViewTracker() {
  const path = usePathname()
  useEffect(() => {
    try {
      const q = location.search
      if (/[?&](utm_|fbclid|gclid|ref=|ad_id)/.test(q)) {
        document.cookie = 'ju_src=' + encodeURIComponent(location.pathname + q) + ';path=/;max-age=7776000;samesite=lax'
      }
      const m = document.cookie.match(/(?:^|; )ju_vid=([^;]*)/)
      const v = m ? m[1] : Math.random().toString(36).slice(2) + Date.now().toString(36)
      if (!m) document.cookie = 'ju_vid=' + v + ';path=/;max-age=31536000;samesite=lax'
      const funnelId = path === '/' ? 'home' : path.startsWith('/events/') ? eventFunnelId(decodeURIComponent(path.slice(8))) : path.slice(1)
      const body = JSON.stringify({ step: 'view', funnelId, visitorId: v, path: path + q, referrer: document.referrer })
      navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))
    } catch {}
  }, [path])
  return null
}
