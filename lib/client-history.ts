
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

const ACTIVITY_TITLE: Record<string, string> = { call: 'Llamada', email: 'Email', whatsapp: 'WhatsApp', meeting: 'Reunión', note: 'Nota', stage: 'Cambio de etapa' }

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
      title: 'Añadido al pipeline', detail: d.service || d.stage, href: `/admin/deals/${d.id}` })

    if (!isOpenDeal(d)) {
      const won = d.stage !== 'lost'
      push({ id: `close-${d.id}`, at: d.updatedAt ?? d.createdAt, kind: won ? 'won' : 'lost',
        title: won ? 'Oportunidad ganada' : 'Oportunidad cerrada sin venta',
        detail: d.service, amount: won ? d.value : undefined, href: `/admin/deals/${d.id}` })
    }

    for (const a of (d.activity ?? []) as ActivityEntry[]) {
      push({ id: `act-${d.id}-${a.id}`, at: a.ts ?? d.createdAt, kind: 'activity',
        title: a.type ? (ACTIVITY_TITLE[String(a.type)] ?? String(a.type)) : 'Interacción',
        detail: a.text, href: `/admin/deals/${d.id}` })
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
        title: inv.recurring ? 'Factura recurrente emitida' : 'Factura enviada',
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
      title: `Inscrito en ${a.eventTitle || 'un evento'}`,
      detail: a.paid ? 'Entrada pagada' : undefined, href: `/admin/events/${a.eventId}` })
    if (a.checkedIn) {
      push({ id: `evt-in-${a.id}`, at: a.checkedInAt || a.registeredAt, kind: 'checkin',
        title: `Asistió a ${a.eventTitle || 'el evento'}`, href: `/admin/events/${a.eventId}` })
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
    S('hot',  'Caliente',  'Listo para comprar, actúa ya', '#dc2626'),
    S('warm', 'Templado', 'Interesado, necesita otro contacto', '#e0683f'),
    S('cold', 'Frío', 'Sin movimiento, déjalo aparcado', '#6b78e8'),
  ],
  client: [
    S('active', 'Activo', 'En el programa ahora', '#1f8a5b'),
    S('paused', 'En pausa', 'Sigue siendo cliente, programa en pausa', '#e8a516'),
    S('upsell', 'Upsell', 'Listo para el siguiente nivel', '#0E71AC'),
  ],
  'past-client': [
    S('reengage', 'Recuperar', 'Merece la pena volver a escribirle', '#0891b2'),
    S('lost',     'Perdido',   'No va a volver, conserva el registro', '#9a8cba'),
  ],
  contact: [
    S('new',  'Nuevo',  'En la base, nada decidido aún', '#6b78e8'),
    S('warm', 'Templado', 'Merece una conversación', '#e0683f'),
    S('cold', 'Frío', 'Guardar en archivo', '#9a8cba'),
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
  client: 'Cliente activo',
  'past-client': 'Antiguo cliente',
  contact: 'Contacto',
}

export const STATUS_HINT: Record<PersonStatus, string> = {
  lead: 'En el pipeline ahora',
  client: 'Pagando ahora',
  'past-client': 'Pagó antes, nada abierto',
  contact: 'Fuera del pipeline',
}
