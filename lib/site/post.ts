// Fire-and-forget POST from a public page to our own API, carrying the
// attribution the lead/booking routes expect (Meta cookies, first landing,
// visitor id). keepalive lets it finish even if the visitor navigates away.
export function sitePost(path: string, body: Record<string, unknown>): void {
  try {
    const ck = (n: string) => (document.cookie.match('(?:^|; )' + n + '=([^;]*)') || [])[1]
    const dec = (n: string) => (ck(n) ? decodeURIComponent(ck(n) as string) : '')
    fetch(path, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...body,
        pageUrl: location.href,
        referrer: document.referrer || '',
        fbc: dec('_fbc'),
        fbp: dec('_fbp'),
        landing: dec('ju_src'),
        visitorId: ck('ju_vid') || '',
      }),
    }).catch(() => {})
  } catch {}
}
