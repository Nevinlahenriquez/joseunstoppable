'use client'

import type { Lang } from '@/lib/site'

// The active button is styled from html[data-lang] in site.css, so the
// toggle is right on first paint and needs no state of its own.
export function currentLang(): Lang {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'es'
}

export function setLang(l: Lang) {
  document.documentElement.setAttribute('data-lang', l)
  document.documentElement.lang = l
  try { localStorage.setItem('unstoppable_lang', l) } catch {}
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }))
}

export default function LangToggle() {
  return (
    <div className="lang" role="group" aria-label="Idioma / Language">
      <button type="button" data-l="es" onClick={() => setLang('es')}>ES</button>
      <button type="button" data-l="en" onClick={() => setLang('en')}>EN</button>
    </div>
  )
}
