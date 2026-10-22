import Link from 'next/link'
import { INSTAGRAM_URL, LINKS, OWNER, WA_HELLO, waLink } from '@/lib/site'

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <Link href="/" className="logo"><span className="mk">J</span><span>Jose<b>Unstoppable</b></span></Link>
        <span>© {new Date().getFullYear()} {OWNER.name}</span>
        <nav>
          <a data-es href={waLink(WA_HELLO.es)} target="_blank" rel="noopener">WhatsApp</a>
          <a data-en href={waLink(WA_HELLO.en)} target="_blank" rel="noopener">WhatsApp</a>
          <a href={`mailto:${OWNER.email}`}>Email</a>
          <Link href={LINKS.book}><span data-es>Reservar llamada</span><span data-en>Book a call</span></Link>
          {INSTAGRAM_URL && <a href={INSTAGRAM_URL} target="_blank" rel="noopener">Instagram</a>}
          <Link href={LINKS.webinar}>Masterclass</Link>
          <Link href="/portal"><span data-es>Acceso clientes</span><span data-en>Client login</span></Link>
          <Link href={LINKS.legal}><span data-es>Aviso legal</span><span data-en>Legal</span></Link>
          <Link href={LINKS.privacy}><span data-es>Privacidad</span><span data-en>Privacy</span></Link>
          <Link href={LINKS.terms}><span data-es>Términos</span><span data-en>Terms</span></Link>
        </nav>
      </div>
    </footer>
  )
}
