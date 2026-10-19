'use client'

import { useEffect } from 'react'

// Page-view tracker for the public pages (was an inline script in each static
// page). Keeps the first ad landing (ju_src), the visitor id (ju_vid) that
// sitePost sends with every lead, and logs a funnel view on /api/track.
// An effect, not an inline script, so it also fires on client-side navigation.
export function SiteTrack() {
  useEffect(() => {
    try {
      const q = location.search
      if (/[?&](utm_|fbclid|gclid|ref=|ad_id)/.test(q)) {
        document.cookie = 'ju_src=' + encodeURIComponent(location.pathname + q) + ';path=/;max-age=7776000;samesite=lax'
      }
      const m = document.cookie.match(/(?:^|; )ju_vid=([^;]*)/)
      const v = m ? m[1] : Math.random().toString(36).slice(2) + Date.now().toString(36)
      if (!m) document.cookie = 'ju_vid=' + v + ';path=/;max-age=31536000;samesite=lax'
      const p = location.pathname.replace(/\/$/, '') || '/'
      const funnelId = p === '/' ? 'home' : p.slice(1)
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([JSON.stringify({
          step: 'view', funnelId, visitorId: v, path: location.pathname + q, referrer: document.referrer,
        })], { type: 'application/json' }))
      }
    } catch {}
  }, [])
  return null
}
