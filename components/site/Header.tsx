'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LangToggle from './LangToggle'
import { LINKS } from '@/lib/site'

const NAV = [
  { href: '/#empieza', es: 'Empieza aquí', en: 'Start here' },
  { href: '/#method', es: 'El método', en: 'The method' },
  { href: '/#testimonios', es: 'Testimonios', en: 'Testimonials' },
  { href: '/#offer', es: 'Precio', en: 'Pricing' },
  { href: '/#faq', es: 'Preguntas', en: 'FAQ' },
]

export default function Header() {
  const path = usePathname()
  const onBooking = path === LINKS.book
  return (
    <header className="hdr">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="José Unstoppable"><span className="mk">J</span><span>José<b>Unstoppable</b></span></Link>
        <nav className="nav">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}><span data-es>{n.es}</span><span data-en>{n.en}</span></Link>
          ))}
        </nav>
        <div className="hdr-r">
          <LangToggle />
          <Link className="hdr-login" href="/portal" aria-label="Acceso clientes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
            <span className="hdr-login-t"><span data-es>Acceso clientes</span><span data-en>Client login</span></span>
          </Link>
          {!onBooking && (
            <Link className="hdr-cta" href={LINKS.book}><span data-es>Reservar llamada</span><span data-en>Book a call</span></Link>
          )}
        </div>
      </div>
    </header>
  )
}
