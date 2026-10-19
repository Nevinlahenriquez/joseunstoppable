'use client'

import { useCallback, useSyncExternalStore } from 'react'

// The public pages are Spanish first with an English switch. The choice lives
// on <html data-lang> (CSS hides [data-es] / [data-en]) and in localStorage,
// so it follows the visitor from page to page.
export type Lang = 'es' | 'en'
const KEY = 'unstoppable_lang'

// Runs inline before the page paints, so an English visitor never sees a
// flash of Spanish. ?lang=en in the URL wins over the stored choice.
export const LANG_BOOT = `(function(){var l='es';try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('${KEY}')||'es';}catch(e){}document.documentElement.setAttribute('data-lang',l==='en'?'en':'es');})();`

export function LangBoot() {
  return <script dangerouslySetInnerHTML={{ __html: LANG_BOOT }} />
}

const listeners = new Set<() => void>()
function read(): Lang {
  return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'es'
}
function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, read, () => 'es' as Lang)
  const set = useCallback((l: Lang) => {
    document.documentElement.setAttribute('data-lang', l)
    try { localStorage.setItem(KEY, l) } catch {}
    listeners.forEach(fn => fn())
  }, [])
  return [lang, set]
}
