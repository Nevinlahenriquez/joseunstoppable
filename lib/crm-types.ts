export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'pending' | 'opportunity' | 'pipeline' | 'client' | 'upsell' | 'dormant' | 'lost'

export const CONTACT_STATUSES: { value: LeadStatus; label: string; color: string; bg: string }[] = [
  { value: 'new',         label: 'New',         color: '#6b7280', bg: '#f3f4f6' },
  { value: 'pending',     label: 'Pending',     color: '#b45309', bg: '#fffbeb' },
  { value: 'opportunity', label: 'Opportunity', color: '#2563eb', bg: '#eff6ff' },
  { value: 'pipeline',    label: 'Pipeline',    color: '#0E71AC', bg: '#f5f3ff' },
  { value: 'client',      label: 'Client',      color: '#059669', bg: '#ecfdf5' },
  { value: 'upsell',      label: 'Upsell',      color: '#0891b2', bg: '#ecfeff' },
  { value: 'dormant',     label: 'Dormant',     color: '#9ca3af', bg: '#f9fafb' },
  { value: 'lost',        label: 'Lost',        color: '#dc2626', bg: '#fef2f2' },
]

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type Currency = 'USD' | 'EUR' | 'AWG'

export interface InvoiceLineItem {
  id: string
  name: string
  description?: string
  quantity: number
  price: number
}

export interface InvoiceReminder {

  at: string

  to: string

  stage?: string

  daysPastDue?: number
}

export interface RecurringOverride {

  amount: number

  note?: string
}

export interface Invoice {
  id: string
  number: string
  clientName: string
  clientEmail: string
  clientCompany?: string
  clientAddress?: string
  clientPhone?: string

  clientVat?: string
  projectTitle?: string
  lineItems: InvoiceLineItem[]
  taxes: number
  taxLabel?: string
  taxRate?: number
  amountPaid: number
  currency: Currency
  status: InvoiceStatus
  notes?: string
  issueDate: string
  dueDate: string
  createdAt: string
  sentAt?: string
  viewedAt?: string
  paidAt?: string

  deletedAt?: string
  reminders?: InvoiceReminder[]
  proposalId?: string
  phaseIndex?: number
  recurring?: boolean
  recurringDay?: number
  recurringParentId?: string

  recurringOverrides?: Record<string, RecurringOverride>

  cardPayment?: boolean

  paymentUrl?: string

  paymentUrlLabel?: string

  paymentMethods?: string[]
}

export type DealStage = 'lead' | 'discovery' | 'proposal_sent' | 'negotiation' | 'signed' | 'active' | 'completed' | 'lost' | (string & {})

export type ProposalStatus = 'draft' | 'sent' | 'signed' | 'declined' | 'void'

export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  source: string
  status: LeadStatus
  notes?: string
  createdAt: string
  role?: string
  companySize?: string
  product?: string
  website?: string
  tags?: string[]

  activity?: ActivityEntry[]
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'stage' | 'whatsapp'

export interface ActivityEntry {
  id: string
  ts: string
  type: ActivityType
  text: string
}

export interface Deal {
  id: string
  leadId?: string
  clientName: string
  clientEmail: string
  clientCompany?: string
  stage: DealStage
  value: number
  currency: Currency
  service: string
  notes?: string
  createdAt: string
  updatedAt: string

  clientPhone?: string

  clientVat?: string
  clientAddress?: string
  clientWebsite?: string
  clientRole?: string
  location?: string
  instagram?: string
  priority?: 'low' | 'medium' | 'high'
  nextStep?: string
  nextStepDate?: string

  currentState?: string
  desiredOutcome?: string
  goals?: string
  blockers?: string
  budget?: string
  activity?: ActivityEntry[]

  tags?: string[]
  revenueType?: 'one_time' | 'mrr'
  retainerMonths?: number
  closeDate?: string
  organization?: string
}

export type OfferCategory = 'programs' | 'coaching' | 'communication' | 'premium'

export type PyramidTier = 'free' | 'low' | 'mid' | 'main' | 'coaching' | 'core' | 'premium'
export const PYRAMID_TIERS: { key: PyramidTier; label: string; color: string; level: number }[] = [
  { key: 'free',         label: 'Free content',                     color: '#94a3b8', level: 0 },
  { key: 'low',          label: 'Low ticket',                       color: '#38bdf8', level: 1 },
  { key: 'mid',          label: 'Mid ticket',                       color: '#a855f7', level: 2 },
  { key: 'main',         label: 'Main program',                     color: '#bd7f06', level: 3 },
  { key: 'coaching',     label: 'High ticket · Coaching',           color: '#0891b2', level: 4 },
  { key: 'core',          label: 'High ticket · José Unstoppable', color: '#0E71AC', level: 5 },
  { key: 'premium', label: 'Alto ticket',      color: '#0C2A43', level: 6 },
]
export type BillingType = 'one-time' | 'monthly' | 'retainer'

export interface Offer {
  id: string
  category: OfferCategory
  pyramidTier?: PyramidTier
  name: string
  tagline: string
  price: number
  currency: Currency
  billingType: BillingType
  services: string[]
  deliverables: string[]
  paymentSchedule: PaymentMilestone[]
  notes?: string
  active: boolean
  createdAt: string
}

export type ExpenseCategory = 'software' | 'equipment' | 'workspace' | 'operations' | 'marketing' | 'personnel' | 'freelancer' | 'fees' | 'other'
export type ExpenseFrequency = 'monthly' | 'yearly' | 'one-time'

export interface BusinessExpense {
  id: string
  name: string

  date?: string
  category: ExpenseCategory
  amount: number
  frequency: ExpenseFrequency
  currency: Currency
  notes?: string

  receiptPath?: string
  createdAt: string
}

export interface PaymentMilestone {
  label: string
  amount: number
  note?: string
}

export interface Proposal {

  deletedAt?: string
  id: string
  token: string
  dealId?: string
  ref: string
  clientName: string
  clientEmail: string
  clientCompany?: string

  clientPhone?: string
  clientAddress?: string

  clientVat?: string
  title: string
  intro: string
  services: string[]
  deliverables: string[]
  paymentSchedule: PaymentMilestone[]
  total: number
  currency: Currency
  validDays: number
  status: ProposalStatus
  paymentLink?: string
  bankInfo?: string

  oneTime?: boolean

  paymentMethods?: string[]

  notes?: string
  createdAt: string
  sentAt?: string
  viewedAt?: string
  signedAt?: string
  signerName?: string
  signerSignature?: string
  offerId?: string
  linkedInvoiceId?: string
  billingDay?: 1 | 15
  version?: number
  parentProposalId?: string
}
