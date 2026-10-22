'use client'

import { usePathname } from 'next/navigation'
import { LINKS, WA_HELLO, waLink } from '@/lib/site'

const Icon = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <path fill="currentColor" d="M16.04 3C8.86 3 3.03 8.82 3.03 15.99c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75a12.97 12.97 0 0 0 6.36 1.63h.01c7.17 0 13-5.83 13-13S23.21 3 16.04 3Zm0 23.68h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-3.96 1.04 1.06-3.86-.26-.4a10.74 10.74 0 0 1-1.65-5.73c0-5.95 4.85-10.8 10.82-10.8 2.89 0 5.6 1.13 7.64 3.17a10.73 10.73 0 0 1 3.16 7.64c0 5.96-4.85 10.8-10.9 10.8Zm5.93-8.09c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.17-.22.32-.84 1.05-1.03 1.27-.19.22-.38.24-.7.08-.33-.16-1.38-.51-2.62-1.62-.97-.86-1.62-1.93-1.81-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.32.33-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.32-1.14 1.11-1.14 2.71s1.17 3.15 1.33 3.36c.16.22 2.3 3.5 5.56 4.91.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.62-.38Z" />
  </svg>
)

// Floating WhatsApp button so a visitor can reach Jose from any page.
export default function WhatsAppFab() {
  const path = usePathname()
  return (
    <div className={path === LINKS.book ? 'wa-fab on-booking' : 'wa-fab'}>
      <a data-es href={waLink(WA_HELLO.es)} target="_blank" rel="noopener" aria-label="Escribir a Jose por WhatsApp"><Icon /></a>
      <a data-en href={waLink(WA_HELLO.en)} target="_blank" rel="noopener" aria-label="Message Jose on WhatsApp"><Icon /></a>
    </div>
  )
}
