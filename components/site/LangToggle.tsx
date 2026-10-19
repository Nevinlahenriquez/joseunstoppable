'use client'

// Active state comes from CSS on html[data-lang], so the server render and
// the first client render match whatever language the visitor picked.
export function currentLang(): 'es' | 'en' {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'es'
}

function setLang(l: 'es' | 'en') {
  document.documentElement.setAttribute('data-lang', l)
  try { localStorage.setItem('unstoppable_lang', l) } catch {}
}

export default function LangToggle() {
  return (
    <div className="lang" role="group" aria-label="Idioma / Language">
      <button type="button" data-l="es" onClick={() => setLang('es')}>ES</button>
      <button type="button" data-l="en" onClick={() => setLang('en')}>EN</button>
    </div>
  )
}
