'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/site'

// Current site language for components that build text in code
// (WhatsApp messages, dates). Static copy uses data-es / data-en instead.
export default function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('es')
  useEffect(() => {
    const read = () => setLang(document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'es')
    read()
    window.addEventListener('langchange', read)
    return () => window.removeEventListener('langchange', read)
  }, [])
  return lang
}
