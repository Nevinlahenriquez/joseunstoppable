
import type { Deal, Lead, Proposal, Invoice, ActivityEntry } from './crm-types'
import type { EventAttendee } from './event-types'

export type HistoryKind =
  | 'lead'
  | 'stage'
  | 'activity'
  | 'proposal'
  | 'signed'
  | 'invoice'
  | 'paid'
  | 'won'
  | 'lost'
  | 'event'
  | 'checkin'

export interface HistoryEvent {
  id: string
  at: string
  kind: HistoryKind
  title: string
  detail?: string
  amount?: number
  currency?: string
  href?: string
}

export type PersonStatus = 'lead' | 'client' | 'past-client' | 'contact'

export interface PersonRecord {
  email: string
  name: string
  company?: string
  status: PersonStatus
  openDeal?: Deal
  events: HistoryEvent[]
  totalBilled: number
  totalPaid: number
  firstSeen?: string
  lastTouch?: string
}

const key = (e?: string) => (e ?? '').trim().toLowerCase()

export function invoiceTotal(inv: Invoice): number {
  const sub = (inv.lineItems ?? []).reduce((n, li) => n + (li.quantity ?? 1) * (li.price ?? 0), 0)
  return sub + (inv.taxes ?? 0)
}

const CLOSED_STAGES = ['signed', 'active', 'completed', 'lost']
export function isOpenDeal(d: Deal): boolean {
  return !CLOSED_STAGES.includes(d.stage ?? '')
}

export function buildPersonHistory(
  email: string,
  src: { deals?: Deal[]; leads?: Lead[]; proposals?: Proposal[]; invoices?: Invoice[]; attendees?: EventAttendee[] },
): PersonRecord {
  const k = key(email)
  const deals = (src.deals ?? []).filter(d => key(d.clientEmail) === k)
  const leads = (src.leads ?? []).filter(l => key(l.email) === k)
  const proposals = (src.proposals ?? []).filter(p => key(p.clientEmail) === k)
  const invoices = (src.invoices ?? []).filter(i => key(i.clientEmail) === k)
  const attendees = (src.attendees ?? []).filter(a => key(a.email) === k)

  const events: HistoryEvent[] = []
  const push = (e: HistoryEvent | null) => { if (e && e.at) events.push(e) }

  for (const l of leads) {
    push({ id: `lead-${l.id}`, at: l.createdAt, kind: 'lead',
      title: 'Entró en el sistema', detail: l.source ? `vía ${l.source}` : undefined })
  }

  for (const d of deals) {
    push({ id: `deal-${d.id}`, at: d.createdAt, kind: 'lead',
      title: 'Añadido al pipeline', detail: d.service || d.stage, href: `/admin/deals?deal=${encodeURIComponent(d.id)}` })

    if (!isOpenDeal(d)) {
      const won = d.stage !== 'lost'
      push({ id: `close-${d.id}`, at: d.updatedAt ?? d.createdAt, kind: won ? 'won' : 'lost',
        title: won ? 'Venta cerrada' : 'Cerrado sin venta',
        detail: d.service, amount: won ? d.value : undefined, href: `/admin/deals?deal=${encodeURIComponent(d.id)}` })
    }

    for (const a of (d.activity ?? []) as ActivityEntry[]) {
      push({ id: `act-${d.id}-${a.id}`, at: a.ts ?? d.createdAt, kind: 'activity',
        title: a.type ? String(a.type).charAt(0).toUpperCase() + String(a.type).slice(1) : 'Interacción',
        detail: a.text, href: `/admin/deals?deal=${encodeURIComponent(d.id)}` })
    }
  }

  for (const p of proposals) {
    push({ id: `prop-${p.id}`, at: p.sentAt ?? p.createdAt, kind: 'proposal',
      title: p.sentAt ? 'Propuesta enviada' : 'Propuesta en borrador', detail: p.title,
      amount: p.total, currency: p.currency, href: `/admin/proposals` })
    if (p.signedAt) {
      push({ id: `sign-${p.id}`, at: p.signedAt, kind: 'signed',
        title: 'Propuesta firmada', detail: p.title, amount: p.total, currency: p.currency, href: `/admin/proposals` })
    }
  }

  for (const inv of invoices) {
    if (inv.status !== 'draft') {
      push({ id: `inv-${inv.id}`, at: inv.sentAt ?? inv.issueDate ?? inv.createdAt, kind: 'invoice',
        title: inv.recurring ? 'Factura mensual emitida' : 'Factura enviada',
        detail: inv.projectTitle || inv.number, amount: invoiceTotal(inv), currency: inv.currency,
        href: `/admin/invoices` })
    }
    if (inv.paidAt) {
      push({ id: `paid-${inv.id}`, at: inv.paidAt, kind: 'paid', title: 'Pago recibido',
        detail: inv.projectTitle || inv.number, amount: invoiceTotal(inv), currency: inv.currency,
        href: `/admin/invoices` })
    }
  }

  for (const a of attendees) {
    push({ id: `evt-${a.id}`, at: a.registeredAt, kind: 'event',
      title: `Apuntado a ${a.eventTitle || 'un evento'}`,
      detail: a.paid ? 'Entrada pagada' : undefined, href: `/admin/events/${a.eventId}` })
    if (a.checkedIn) {
      push({ id: `evt-in-${a.id}`, at: a.checkedInAt || a.registeredAt, kind: 'checkin',
        title: `Fue a ${a.eventTitle || 'el evento'}`, href: `/admin/events/${a.eventId}` })
    }
  }

  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  const openDeal = deals.find(isOpenDeal)
  const paidInvoices = invoices.filter(i => i.status === 'paid' || i.paidAt)
  const hasPaid = paidInvoices.length > 0 || proposals.some(p => p.status === 'signed')

  const status: PersonStatus =
    hasPaid && openDeal ? 'client'
    : hasPaid ? (invoices.some(i => i.recurring && i.status !== 'draft') ? 'client' : 'past-client')
    : openDeal ? 'lead'
    : 'contact'

  const first = [...events].reverse()[0]
  const baseCreatedAt = deals[0]?.createdAt ?? leads[0]?.createdAt ?? attendees[0]?.registeredAt

  return {
    email,
    name: deals[0]?.clientName ?? leads[0]?.name ?? proposals[0]?.clientName ?? invoices[0]?.clientName ?? attendees[0]?.name ?? email,
    company: deals[0]?.clientCompany ?? leads[0]?.company ?? proposals[0]?.clientCompany ?? attendees[0]?.company,
    status,
    openDeal,
    events,
    totalBilled: invoices.filter(i => i.status !== 'draft').reduce((n, i) => n + invoiceTotal(i), 0),
    totalPaid: paidInvoices.reduce((n, i) => n + invoiceTotal(i), 0),
    firstSeen: first?.at ?? baseCreatedAt,
    lastTouch: events[0]?.at,
  }
}

export type ContactState =
  | 'hot' | 'warm' | 'cold'
  | 'active' | 'paused' | 'upsell'
  | 'reengage' | 'lost'
  | 'new'

export interface StateOption {
  id: ContactState
  label: string
  hint: string
  color: string
}

const S = (id: ContactState, label: string, hint: string, color: string): StateOption =>
  ({ id, label, hint, color })

export const STATES_BY_STAGE: Record<PersonStatus, StateOption[]> = {
  lead: [
    S('hot',  'Hot',  'Ready to buy, move now', '#dc2626'),
    S('warm', 'Warm', 'Interested, needs another touch', '#e0683f'),
    S('cold', 'Cold', 'No movement, park it', '#6b78e8'),
  ],
  client: [
    S('active', 'Active', 'Delivering now', '#1f8a5b'),
    S('paused', 'Paused', 'Still a client, work on hold', '#e8a516'),
    S('upsell', 'Upsell', 'Ready for the next level', '#0E71AC'),
  ],
  'past-client': [
    S('reengage', 'Re-engage', 'Worth reaching out to again', '#0891b2'),
    S('lost',     'Lost',      'Not coming back, keep the record', '#9a8cba'),
  ],
  contact: [
    S('new',  'New',  'In the base, nothing decided yet', '#6b78e8'),
    S('warm', 'Warm', 'Worth a conversation', '#e0683f'),
    S('cold', 'Cold', 'Keep on file', '#9a8cba'),
  ],
}

export function defaultState(stage: PersonStatus): ContactState {
  return STATES_BY_STAGE[stage][0].id
}

export function resolveState(stage: PersonStatus, stored?: string): StateOption {
  const options = STATES_BY_STAGE[stage]
  return options.find(o => o.id === stored) ?? options[0]
}

export const STATUS_LABEL: Record<PersonStatus, string> = {
  lead: 'Lead',
  client: 'Active client',
  'past-client': 'Past client',
  contact: 'Contact',
}

export const STATUS_HINT: Record<PersonStatus, string> = {
  lead: 'Actively in the pipeline',
  client: 'Paying now',
  'past-client': 'Has paid before, nothing open',
  contact: 'Not in the pipeline',
}
