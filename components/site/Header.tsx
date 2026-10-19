'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LangToggle from './LangToggle'
import { LINKS } from '@/lib/site'

const NAV = [
  { href: '/#story', es: 'Mi historia', en: 'My story' },
  { href: '/#method', es: 'El método', en: 'The method' },
  { href: '/#offer', es: 'Precio', en: 'Pricing' },
  { href: '/#faq', es: 'Preguntas', en: 'FAQ' },
]

export default function Header() {
  const path = usePathname()
  const onBooking = path === LINKS.book
  return (
    <header className="hdr">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="José Unstoppable">José <b>Unstoppable</b></Link>
        <nav className="nav">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}><span data-es>{n.es}</span><span data-en>{n.en}</span></Link>
          ))}
        </nav>
        <div className="hdr-r">
          <LangToggle />
          {!onBooking && (
            <Link className="hdr-cta" href={LINKS.book}><span data-es>Reservar llamada</span><span data-en>Book a call</span></Link>
          )}
        </div>
      </div>
    </header>
  )
}
