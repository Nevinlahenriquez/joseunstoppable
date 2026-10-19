import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { activeLinks, logBioEvent } from '@/lib/bio-links'
import './links.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'José Unstoppable · Enlaces', robots: { index: false, follow: true } }

// Shown until links are saved in the panel (/admin/links), so the page is never empty.
const DEFAULT_LINKS = [
  { id: 'reserva', label: 'Reserva tu llamada gratuita', href: '/reserva?ref=bio', highlight: true },
  { id: 'story', label: 'Conoce mi historia', href: '/?ref=bio#story', highlight: false },
  { id: 'method', label: 'El método', href: '/?ref=bio#method', highlight: false },
  { id: 'masterclass', label: 'Masterclass gratuita', href: '/masterclass?ref=bio', highlight: false },
  { id: 'home', label: 'Mi web', href: '/?ref=bio', highlight: false },
]

export default async function LinksPage() {
  const saved = await activeLinks()
  const links = saved.length
    ? saved.map(l => ({ id: l.id, label: l.label, href: `/l/${l.id}`, highlight: l.highlight }))
    : DEFAULT_LINKS
  const h = await headers()
  await logBioEvent('view', '/links', h.get('referer'))
  return (
    <main className="lt">
      <div className="lt-col">
        <header className="lt-head">
          <img className="lt-avatar" src="/icon.png" alt="" width={96} height={96} />
          <p className="lt-logo">José <b>Unstoppable</b></p>
          <span className="lt-eyebrow">Coaching 1:1 online</span>
          <h1 className="lt-title">Vuelve a gustarte <span>en 90&nbsp;días.</span></h1>
        </header>
        {links.map(l => (
          <a key={l.id} href={l.href} className={l.highlight ? 'lt-btn is-main' : 'lt-btn'}>
            {l.label}<span className="arr" aria-hidden="true">→</span>
          </a>
        ))}
        <p className="lt-foot">© José Unstoppable</p>
      </div>
    </main>
  )
}
