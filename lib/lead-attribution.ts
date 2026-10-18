// Where a lead came from. One tag per lead, written on the CRM card.
//
// AD_TAG is the only tag that counts toward the ads fee. It needs proof that
// the visit came from a PAID Meta ad: the UTM parameters set in Ads Manager
// (utm_medium=paid, or an ad_id). A bare fbclid or _fbc cookie is NOT proof:
// Meta adds fbclid to organic posts and bio links too, so those are tagged
// META_UNSURE and checked by hand.
export const AD_TAG = 'Anuncio Meta'
export const META_UNSURE = 'Meta (sin confirmar)'
export const CHANNEL_TAGS = [AD_TAG, META_UNSURE, 'Anuncio Google', 'Link en bio', 'Redes (orgánico)', 'Buscador', 'Directo'] as const
export type Channel = (typeof CHANNEL_TAGS)[number]

export const AD_URL_PARAMS = 'utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&ad_id={{ad.id}}'

function params(url: string): URLSearchParams {
  try {
    const q = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    return new URLSearchParams(q)
  } catch { return new URLSearchParams() }
}

function fromUrl(url: string): Channel | null {
  const p = params(url.toLowerCase())
  const src = p.get('utm_source') ?? ''
  const med = p.get('utm_medium') ?? ''
  const meta = /^(meta|facebook|fb|instagram|ig)/.test(src)
  if (p.get('ad_id') || (meta && /(paid|cpc|ppc|^ad|ads|paid_social)/.test(med))) return AD_TAG
  if (p.get('gclid') || p.get('gbraid') || p.get('wbraid') || (src === 'google' && /(cpc|ppc|paid)/.test(med))) return 'Anuncio Google'
  if (p.get('ref') === 'bio') return 'Link en bio'
  if (meta) return 'Redes (orgánico)'
  if (p.get('fbclid')) return META_UNSURE
  return null
}

export function channelTag(input: { fbc?: string | null; pageUrl?: string | null; landing?: string | null; referrer?: string | null }): Channel {
  // The landing URL (first page they arrived on, kept in a cookie) wins over
  // the page the form was on, because the UTM is usually only on the first.
  const byLanding = fromUrl(String(input.landing ?? ''))
  if (byLanding) return byLanding
  const byPage = fromUrl(String(input.pageUrl ?? ''))
  if (byPage) return byPage
  if (input.fbc) return META_UNSURE
  const ref = String(input.referrer ?? '').toLowerCase()
  if (/(facebook|instagram|linkedin|tiktok|youtube|t\.co|twitter|x\.com|whatsapp)/.test(ref)) return 'Redes (orgánico)'
  if (/(google|bing|duckduckgo|yahoo)\./.test(ref)) return 'Buscador'
  return 'Directo'
}

export function channelOf(tags: string[] | null | undefined): Channel {
  const t = tags ?? []
  return (CHANNEL_TAGS.find(c => t.includes(c)) ?? 'Directo') as Channel
}
