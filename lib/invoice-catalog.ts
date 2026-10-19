
import { TEMPLATES } from '@/lib/proposal-templates'
import type { Currency, Offer } from '@/lib/crm-types'

export type CatalogItem = {
  key: string
  group: 'Sessions' | 'Proposals' | 'Offers'
  name: string
  description: string
  price: number
  currency: Currency

  suffix?: string
}

export const STRATEGY_SESSION = {
  title: 'Programa Imparable, 90 días',
  price: 497,
  introDiscount: 0,
  line: {
    name: 'Programa Imparable, 3 meses de coaching 1:1',
    description: 'Plan de fuerza personalizado en la app, nutrición adaptada, WhatsApp diario y check-in semanal.',
  },
  note: 'Garantía Imparable: si durante los 90 días sigues el plan y no ves resultados, te devuelvo el 100% de tu dinero.',
}

export const CATALOG_GROUPS = ['Sessions', 'Proposals', 'Offers'] as const

export const CATALOG_GROUP_LABEL: Record<CatalogItem['group'], string> = { Sessions: 'Programa', Proposals: 'Plantillas', Offers: 'Ofertas' }

export function buildCatalog(offers: Offer[]): CatalogItem[] {
  const items: CatalogItem[] = [
    { key: 'strategy', group: 'Sessions', ...STRATEGY_SESSION.line, price: STRATEGY_SESSION.price, currency: 'EUR' },
  ]
  for (const t of TEMPLATES) {
    const first = t.schedule[0]
    if (!first || !(first.amount > 0)) continue
    const instalments = t.schedule.length > 1
    items.push({
      key: `tpl:${t.id}`,
      group: 'Proposals',
      name: instalments && first.label ? `${t.offerName || t.name}, ${first.label}` : (t.offerName || t.name),
      description: t.tagline,
      price: first.amount,
      currency: t.currency,
    })
  }
  for (const o of offers) {
    if (!o.active || !(o.price > 0)) continue
    items.push({
      key: `offer:${o.id}`,
      group: 'Offers',
      name: o.name,
      description: o.tagline?.trim() || o.services.filter(Boolean).slice(0, 3).join(', '),
      price: o.price,
      currency: o.currency,
      suffix: o.billingType === 'monthly' ? '/mes' : undefined,
    })
  }

  const seen = new Set<string>()
  return items.filter(i => {
    const k = i.name.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
