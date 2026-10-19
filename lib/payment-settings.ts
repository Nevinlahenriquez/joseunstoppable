// How José gets paid: his Revolut link, Bizum number and bank account.
// Saved from Get paid in the dashboard (app_settings 'payment_settings');
// the Vercel bank variables are only the starting values.

export type PaymentSettings = {
  revolutUrl: string
  bizum: string
  holder: string
  iban: string
  swift: string
  note: string
}

export const PAYMENT_SETTINGS_ID = 'payment_settings'

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  revolutUrl: '',
  bizum: '',
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER || 'José Unstoppable',
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || '',
  swift: process.env.NEXT_PUBLIC_BANK_SWIFT || '',
  note: 'Plazo de pago: 7 días.',
}

const LIMITS: Record<keyof PaymentSettings, number> = { revolutUrl: 300, bizum: 30, holder: 120, iban: 50, swift: 20, note: 400 }

export function cleanPaymentSettings(v: unknown): PaymentSettings {
  const b = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const out = { ...DEFAULT_PAYMENT_SETTINGS }
  for (const k of Object.keys(LIMITS) as (keyof PaymentSettings)[]) {
    if (typeof b[k] === 'string') out[k] = (b[k] as string).trim().slice(0, LIMITS[k])
  }
  return out
}

// "@jose", "jose", "revolut.me/jose" or the full link all become
// https://revolut.me/jose. Anything else that is not a revolut link is dropped.
export function revolutLink(raw: string): string {
  let s = (raw ?? '').trim()
  if (!s) return ''
  if (/^@?[a-z0-9._-]{2,40}$/i.test(s)) s = 'https://revolut.me/' + s.replace(/^@/, '')
  else if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    if (!/^https?:$/.test(u.protocol) || !/(^|\.)revolut\.(me|com)$/i.test(u.hostname)) return ''
    u.protocol = 'https:'
    return u.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export const fmtIban = (iban: string) => iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

// The block José pastes into a WhatsApp or an email.
export function paymentText(s: PaymentSettings): string {
  const parts: string[] = []
  const rev = revolutLink(s.revolutUrl)
  if (rev) parts.push(`Revolut (lo más rápido): ${rev}`)
  if (s.bizum) parts.push(`Bizum: ${s.bizum}`)
  if (s.iban) parts.push(['Transferencia', s.holder, `IBAN: ${fmtIban(s.iban)}`, s.swift && `SWIFT/BIC: ${s.swift}`].filter(Boolean).join('\n'))
  if (s.note) parts.push(s.note)
  return parts.join('\n\n')
}
