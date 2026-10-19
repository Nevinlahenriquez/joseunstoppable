// Shared facts for the public site pages.

export const SITE_URL = 'https://joseunstoppable.com'
export const WHATSAPP = '34649764886'
export const PRICE = 497

export const LINKS = {
  home: '/',
  book: '/reserva',
  webinar: '/masterclass',
  privacy: '/privacidad',
  legal: '/aviso-legal',
  terms: '/terminos',
} as const

// Set to his profile URL to show Instagram in the footer.
export const INSTAGRAM_URL = ''

// Owner details for the legal pages. Spanish law (LSSI) asks for the tax ID
// and a contact address; lines stay hidden until they are filled in.
export const OWNER = {
  name: 'José Sánchez',
  brand: 'José Unstoppable',
  email: 'hola@joseunstoppable.com',
  nif: '',
  address: '',
}

export type Lang = 'es' | 'en'

export function waLink(text?: string, phone: string = WHATSAPP) {
  const msg = text ?? 'Hola José, quiero saber más sobre el programa'
  return 'https://wa.me/' + phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(msg)
}

export const WA_HELLO = {
  es: 'Hola José, quiero saber más sobre el programa',
  en: 'Hi José, I want to know more about the program',
}

// Runs before first paint so the page shows in the visitor's language
// without a flash: ?lang= wins, then the saved choice, then Spanish.
export const LANG_BOOT_SCRIPT =
  "(function(){var l='es';try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('unstoppable_lang')||'es';}catch(e){}if(l!=='en')l='es';document.documentElement.setAttribute('data-lang',l);document.documentElement.lang=l;})();"

// What a lead wants, from the booking form's goal question. Saved as CRM tags
// in this order, matching the form's options.
export const GOAL_TAGS = ['Perder grasa', 'Ganar músculo', 'Ganar confianza', 'Más energía'] as const
