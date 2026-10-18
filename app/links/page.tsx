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
    <main style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #F1F8FD, #fff)', color: '#0C2A43', fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif", padding: '48px 16px' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 440, margin: '0 auto', display: 'grid', gap: 14 }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src="/icon.png" alt="" width={72} height={72} style={{ borderRadius: 999 }} />
          <h1 style={{ fontSize: 24, margin: '12px 0 4px' }}>José Unstoppable</h1>
          <p style={{ margin: 0, color: '#5D6E7E' }}>Vuelve a gustarte en 90 días</p>
        </div>
        {links.length === 0 && <p style={{ textAlign: 'center', color: '#5D6E7E' }}>Pronto habrá enlaces aquí.</p>}
        {links.map(l => (
          <a key={l.id} href={`/l/${l.id}`} style={{
            display: 'block', textAlign: 'center', padding: '16px 18px', borderRadius: 14, textDecoration: 'none', fontWeight: 600, fontSize: 16,
            background: l.highlight ? '#0E71AC' : '#fff', color: l.highlight ? '#fff' : '#0C2A43',
            border: l.highlight ? 'none' : '1px solid #DDE9F2', boxShadow: '0 10px 30px -18px rgba(12,42,67,.35)',
          }}>{l.label}</a>
        ))}
      </div>
    </main>
  )
}
