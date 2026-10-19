
export interface PaymentMethod {
  id: string
  label: string

  enabled: boolean

  lines: string[]

  bestFor?: string
}

const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER || 'José Unstoppable'
const BANK_IBAN = process.env.NEXT_PUBLIC_BANK_IBAN || ''
const BANK_SWIFT = process.env.NEXT_PUBLIC_BANK_SWIFT || ''

// 'wise' is kept as the id so stored invoices keep working; the label is generic.
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'wise',
    label: 'Transferencia bancaria (EUR)',
    enabled: Boolean(BANK_IBAN),
    bestFor: 'Desde un banco en la zona SEPA, como transferencia normal.',
    lines: [
      BANK_HOLDER,
      `IBAN: ${BANK_IBAN}`,
      ...(BANK_SWIFT ? [`SWIFT/BIC: ${BANK_SWIFT}`] : []),
    ],
  },
  {
    id: 'card',
    label: 'Tarjeta',
    enabled: true,
    bestFor: 'Pagar ahora desde el móvil.',
    lines: ['El link de pago va con la factura.'],
  },
]

export const PAYMENT_TERMS = [
  'Plazo de pago: 7 días.',
]

export function paymentDetailsText(): string {
  const blocks = PAYMENT_METHODS.filter(m => m.enabled).map(m => `${m.label}\n${m.lines.join('\n')}`)
  return [...blocks, PAYMENT_TERMS.join('\n')].join('\n\n')
}

export interface ReceiptMethod {
  id: string
  label: string
}

export const RECEIPT_METHODS: ReceiptMethod[] = [
  { id: 'wise', label: 'Transferencia bancaria' },
  { id: 'card', label: 'Tarjeta (Stripe)' },
  { id: 'cash', label: 'Efectivo' },
  { id: 'bizum', label: 'Bizum' },
  { id: 'other', label: 'Otro (escríbelo)' },
]

export const RECEIPT_METHOD_MAX = 40

<<<<<<< HEAD
// José's Revolut link (revolut.me/…), set on Get paid and shown on every invoice.
export const PAYMENT_SETTING = 'payment_settings'
export type PaymentSettings = { revolutUrl: string }
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { revolutUrl: '' }

// Accepts "revolut.me/jose", "https://revolut.me/jose", "@jose" or a Revolut checkout link.
export function normalizeRevolut(input: string): string | null {
  const raw = input.trim()
  if (!raw) return ''
  if (/^@?[a-z0-9._-]{2,40}$/i.test(raw)) return `https://revolut.me/${raw.replace(/^@/, '')}`
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!/(^|\.)revolut\.(me|com)$/i.test(u.hostname)) return null
    u.protocol = 'https:'
    return u.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}
=======
>>>>>>> origin/main
