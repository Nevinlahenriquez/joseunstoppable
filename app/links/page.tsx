import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { activeLinks, logBioEvent } from '@/lib/bio-links'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'José Unstoppable · Enlaces', robots: { index: false, follow: true } }

export default async function LinksPage() {
  const links = await activeLinks()
  const h = await headers()
  await logBioEvent('view', '/links', h.get('referer'))
  return (
    <main style={{ minHeight: '100dvh', background: '#0b0b0d', color: '#f4f1ea', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '48px 16px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src="/icon.png" alt="" width={72} height={72} style={{ borderRadius: 999 }} />
          <h1 style={{ fontSize: 24, margin: '12px 0 4px' }}>José Unstoppable</h1>
          <p style={{ margin: 0, color: '#bdb6a8' }}>Vuelve a gustarte en 90 días</p>
        </div>
        {links.length === 0 && <p style={{ textAlign: 'center', color: '#bdb6a8' }}>Pronto habrá enlaces aquí.</p>}
        {links.map(l => (
          <a key={l.id} href={`/l/${l.id}`} style={{
            display: 'block', textAlign: 'center', padding: '16px 18px', borderRadius: 14, textDecoration: 'none', fontWeight: 600, fontSize: 16,
            background: l.highlight ? '#f2c14e' : 'rgba(255,255,255,.07)', color: l.highlight ? '#1a1300' : '#f4f1ea',
            border: l.highlight ? 'none' : '1px solid rgba(255,255,255,.14)',
          }}>{l.label}</a>
        ))}
      </div>
    </main>
  )
}
