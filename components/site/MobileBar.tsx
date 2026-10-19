'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LINKS } from '@/lib/site'

// Booking button pinned to the bottom on phones, shown once the visitor has
// scrolled past the hero and hidden again near the footer.
export default function MobileBar() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 720 && window.innerHeight + window.scrollY < document.body.scrollHeight - 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="m-bar" data-show={show ? '' : undefined} aria-hidden={!show}>
      <Link className="btn btn-y" href={LINKS.book} tabIndex={show ? 0 : -1}>
        <span data-es>Reservar llamada gratuita</span><span data-en>Book a free call</span><span className="arr">→</span>
      </Link>
    </div>
  )
}
