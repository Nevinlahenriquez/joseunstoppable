import { headers } from 'next/headers'
import type { Metadata } from 'next'
import Image from 'next/image'
import avatar from '@/public/images/jose-avatar.jpg'
import { activeLinks, logBioEvent } from '@/lib/bio-links'
import { INTRO_VIDEO } from '@/lib/home-content'
import { INSTAGRAM_URL, WA_HELLO, waLink } from '@/lib/site'
import './links.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Jose Unstoppable · Enlaces', robots: { index: false, follow: true } }

// Shown until links are saved in the panel (/admin/links), so the page is never empty.
const DEFAULT_LINKS = [
  { id: 'reserva', label: 'Reserva tu llamada gratuita', href: '/reserva?ref=bio', highlight: true },
  ...(INTRO_VIDEO ? [{ id: 'empieza', label: 'Empieza aquí: quién soy', href: '/?ref=bio#empieza', highlight: false }] : []),
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
          <Image className="lt-avatar" src={avatar} alt="Jose Sanchez" width={96} height={96} priority />
          <p className="lt-logo"><span className="mk">J</span>Jose<b>Unstoppable</b></p>
          <span className="lt-eyebrow">Coaching 1:1 online</span>
          <h1 className="lt-title">Vuelve a gustarte <span>en 90&nbsp;días.</span></h1>
        </header>
        {links.map(l => (
          <a key={l.id} href={l.href} className={l.highlight ? 'lt-btn is-main' : 'lt-btn'}>
            {l.label}<span className="arr" aria-hidden="true">→</span>
          </a>
        ))}
        <nav className="lt-social">
          <a href={waLink(WA_HELLO.es)} target="_blank" rel="noopener">WhatsApp</a>
          {INSTAGRAM_URL && <a href={INSTAGRAM_URL} target="_blank" rel="noopener">Instagram</a>}
        </nav>
        <p className="lt-foot">© Jose Unstoppable</p>
      </div>
    </main>
  )
}
