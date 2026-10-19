
import { getDeals, getLeads, getInvoices, getProposals } from './crm-store'
import { getAttendees } from './event-store'
import { isLikelySpam } from './apply-guard'

export type PersonStage = 'client' | 'lead' | 'contact'
export type PersonSource = 'deal' | 'lead' | 'attendee' | 'invoice' | 'proposal' | 'portal' | 'account'

export type PersonState =
  | 'client'
  | 'circle'
  | 'retainer'
  | 'pipeline'
  | 'enquiry'
  | 'attendee'
  | 'attended'
  | 'subscriber'
  | 'proposal'
  | 'invoiced'
  | 'portal'
  | 'past'
  | 'lost'
  | 'spam'

export const PERSON_STATES: { value: PersonState; label: string; tone: 'good' | 'accent' | 'warn' | 'bad' | 'muted' }[] = [
  { value: 'client',     label: 'Cliente activo',   tone: 'good' },
  { value: 'circle',     label: 'Miembro',    tone: 'accent' },
  { value: 'retainer',   label: 'Con cuota',        tone: 'good' },
  { value: 'pipeline',   label: 'En el pipeline', tone: 'accent' },
  { value: 'enquiry',    label: 'Consulta',         tone: 'accent' },
  { value: 'attendee',   label: 'Inscrito a evento', tone: 'warn' },
  { value: 'attended',   label: 'Asistió a un evento',tone: 'warn' },
  { value: 'subscriber', label: 'Suscriptor',       tone: 'muted' },
  { value: 'proposal',   label: 'Propuesta enviada', tone: 'accent' },
  { value: 'invoiced',   label: 'Facturado',        tone: 'good' },
  { value: 'portal',     label: 'Acceso al portal', tone: 'good' },
  { value: 'past',       label: 'Antiguo cliente',  tone: 'muted' },
  { value: 'lost',       label: 'Perdido',          tone: 'muted' },
  { value: 'spam',       label: 'Posible spam',     tone: 'bad' },
]

export const stateMeta = (v: PersonState) =>
  PERSON_STATES.find(s => s.value === v) ?? { value: v, label: v, tone: 'muted' as const }

export type Person = {

  key: string
  name: string
  email: string
  company: string
  phone: string
  address: string
  website: string

  stage: PersonStage

  states: PersonState[]
  sources: PersonSource[]

  tags: string[]

  events: string[]

  counts: { deals: number; invoices: number; proposals: number; events: number }

  dealId?: string
  leadId?: string
  accountId?: string
  attendeeId?: string

  spam: boolean

  lastSeen: string

  firstSeen: string
}

export const isCircleText = (...parts: (string | null | undefined)[]) =>
  parts.some(p => /\bcircle\b/i.test(p ?? ''))

export function planSplit(c: { program?: string | null; planName?: string | null; monthlyAmount?: number | null }) {
  const circle = isCircleText(c.program, c.planName)
  return { circle, retainer: !circle && (c.monthlyAmount ?? 0) > 0 }
}

const OPEN_DEAL: string[] = ['lead', 'discovery', 'proposal_sent', 'negotiation']
const CLIENT_DEAL: string[] = ['signed', 'active', 'completed']

const SUBSCRIBER_SOURCES = ['newsletter', 'events-notify']

const keyOf = (email?: string | null, name?: string | null) =>
  (email ?? '').trim().toLowerCase() || (name ?? '').trim().toLowerCase()

type Flags = {
  client: boolean; pipeline: boolean; enquiry: boolean; attendee: boolean
  attended: boolean; subscriber: boolean; proposal: boolean; invoiced: boolean
  portal: boolean; lost: boolean; circle: boolean; retainer: boolean

  completed: boolean

  live: boolean
}

type Draft = Omit<Person, 'stage' | 'spam' | 'states'> & Flags & { spamVotes: number; spamChecks: number }

export interface PeopleSources {
  deals: ReturnType<typeof getDeals>
  proposals: ReturnType<typeof getProposals>
  invoices: ReturnType<typeof getInvoices>
  leads: ReturnType<typeof getLeads>
  attendees: ReturnType<typeof getAttendees>
}

export function getPeople(opts: { includeSpam?: boolean } = {}): Person[] {
  return buildPeople({
    deals: getDeals(), proposals: getProposals(), invoices: getInvoices(),
    leads: getLeads(),
    attendees: getAttendees(),
  }, opts)
}

export function buildPeople(src: PeopleSources, opts: { includeSpam?: boolean } = {}): Person[] {
  const map = new Map<string, Draft>()

  const fold = (
    src: PersonSource,
    row: { name?: string | null; email?: string | null; company?: string | null; phone?: string | null; address?: string | null; website?: string | null; at?: string | null },
    flags: Partial<Flags> & { dealId?: string; leadId?: string; accountId?: string; attendeeId?: string; spam?: boolean | null; tags?: string[] | null; event?: string | null } = {},
  ) => {
    const key = keyOf(row.email, row.name)
    if (!key) return
    const cur = map.get(key) ?? {
      key, name: '', email: '', company: '', phone: '', address: '', website: '',
      sources: [], tags: [], events: [],
      counts: { deals: 0, invoices: 0, proposals: 0, events: 0 },
      client: false, pipeline: false, enquiry: false, attendee: false,
      attended: false, subscriber: false, proposal: false, invoiced: false,
      portal: false, lost: false, completed: false, live: false,
      circle: false, retainer: false,
      spamVotes: 0, spamChecks: 0, lastSeen: '', firstSeen: '',
    }
    cur.name ||= (row.name ?? '').trim()
    cur.email ||= (row.email ?? '').trim()
    cur.company ||= (row.company ?? '').trim()
    cur.phone ||= (row.phone ?? '').trim()
    cur.address ||= (row.address ?? '').trim()
    cur.website ||= (row.website ?? '').trim()
    if (!cur.sources.includes(src)) cur.sources.push(src)
    for (const k of ['client', 'pipeline', 'enquiry', 'attendee', 'attended', 'subscriber', 'proposal', 'invoiced', 'portal', 'lost', 'completed', 'live', 'circle', 'retainer'] as const) {
      if (flags[k]) cur[k] = true
    }
    if (flags.dealId) cur.dealId ||= flags.dealId
    if (flags.leadId) cur.leadId ||= flags.leadId
    if (flags.accountId) cur.accountId ||= flags.accountId
    if (flags.attendeeId) cur.attendeeId ||= flags.attendeeId
    for (const t of flags.tags ?? []) if (t && !cur.tags.includes(t)) cur.tags.push(t)
    if (flags.event && !cur.events.includes(flags.event)) cur.events.push(flags.event)
    if (flags.spam != null) { cur.spamChecks += 1; if (flags.spam) cur.spamVotes += 1 }
    const at = row.at ?? ''
    if (at > cur.lastSeen) cur.lastSeen = at
    if (at && (!cur.firstSeen || at < cur.firstSeen)) cur.firstSeen = at
    map.set(key, cur)
  }

  for (const d of src.deals) {
    const open = OPEN_DEAL.includes(d.stage)
    const won = CLIENT_DEAL.includes(d.stage)
    fold('deal', { name: d.clientName, email: d.clientEmail, company: d.clientCompany, phone: d.clientPhone, address: d.clientAddress ?? d.location, website: d.clientWebsite, at: d.updatedAt ?? d.createdAt }, {
      dealId: d.id,
      client: won,
      pipeline: open,
      completed: d.stage === 'completed',
      circle: won && isCircleText(d.service),
      live: d.stage === 'active',
      lost: d.stage === 'lost',
      tags: d.tags,
      spam: isLikelySpam({ name: d.clientName, email: d.clientEmail, clientCompany: d.clientCompany, tags: d.tags }),
    })
    const p = map.get(keyOf(d.clientEmail, d.clientName)); if (p) p.counts.deals += 1
  }
  for (const p of src.proposals) {
    fold('proposal', { name: p.clientName, email: p.clientEmail, company: p.clientCompany, phone: p.clientPhone, address: p.clientAddress, at: p.createdAt }, {
      client: p.status === 'signed',

      proposal: p.status !== 'draft' && p.status !== 'void',

      circle: p.status === 'signed' && isCircleText(p.title, ...(p.services ?? [])),
    })
    const r = map.get(keyOf(p.clientEmail, p.clientName)); if (r) r.counts.proposals += 1
  }
  for (const inv of src.invoices) {
    const real = inv.status !== 'draft' && inv.status !== 'void'
    fold('invoice', { name: inv.clientName, email: inv.clientEmail, company: inv.clientCompany, phone: inv.clientPhone, address: inv.clientAddress, at: inv.createdAt }, {
      client: real, invoiced: real,
    })
    const r = map.get(keyOf(inv.clientEmail, inv.clientName)); if (r) r.counts.invoices += 1
  }
  for (const l of src.leads) {
    const subscriber = SUBSCRIBER_SOURCES.includes((l.source ?? '').toLowerCase())
    fold('lead', { name: l.name, email: l.email, company: l.company, phone: l.phone, at: l.createdAt }, {
      leadId: l.id,
      subscriber,
      enquiry: !subscriber && l.status !== 'lost' && l.status !== 'unqualified',
      lost: l.status === 'lost',
      client: l.status === 'client',
      tags: (l as typeof l & { tags?: string[] }).tags,
      spam: isLikelySpam({ name: l.name, email: l.email, company: l.company }),
    })
  }
  for (const a of src.attendees) {
    fold('attendee', { name: a.name, email: a.email, company: a.company, phone: a.phone, at: a.registeredAt }, {
      attendeeId: a.id, attendee: true, attended: !!a.checkedIn, event: a.eventTitle,
    })
    const r = map.get(keyOf(a.email, a.name)); if (r) r.counts.events += 1
  }

  const order = PERSON_STATES.map(s => s.value)
  const people: Person[] = [...map.values()].map(d => {
    const { client, pipeline, enquiry, attendee, attended, subscriber, proposal, invoiced, portal, lost, completed, live, circle, retainer, spamVotes, spamChecks, ...rest } = d
    const spam = !client && spamChecks > 0 && spamVotes === spamChecks

    const held: Record<PersonState, boolean> = {
      client, pipeline, enquiry, attendee, attended, subscriber,
      proposal, invoiced, portal,

      circle, retainer: retainer && !circle,
      past: completed && !live && !pipeline,
      lost: lost && !client, spam,
    }
    const states = order.filter(s => held[s])
    return {
      ...rest,
      stage: client ? 'client' : (pipeline || enquiry) ? 'lead' : 'contact',
      states,
      spam,
    }
  })

  return (opts.includeSpam ? people : people.filter(p => !p.spam))
    .sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : b.lastSeen < a.lastSeen ? -1 : a.name.localeCompare(b.name)))
}

export const getClients = () => getPeople().filter(p => p.stage === 'client')

export function personLabel(p: Person): string {
  const bits = [p.name || p.email, p.company, p.name && p.email ? p.email : ''].filter(Boolean)
  return bits.join(' · ')
}
