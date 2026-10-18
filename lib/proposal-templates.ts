import type { PaymentMilestone, Currency } from '@/lib/crm-types'

export const BANK_INFO = `JOSÉ UNSTOPPABLE
IBAN: (tu IBAN)
Banco: (tu banco)

Pago a 7 días.`

export type Template = {
  id: string
  icon: string
  name: string

  offerName?: string

  notIncluded?: string[]
  tagline: string
  color: string
  titleFn: (name: string, company: string) => string
  introFn: (name: string, company: string) => string
  services: string[]
  deliverables: string[]
  schedule: PaymentMilestone[]

  oneTime?: boolean
  currency: Currency
  validDays: number
}

export function withScope(tpl: Template, intro: string): string {
  if (!tpl.notIncluded?.length) return intro
  return `${intro}\n\nWhat this does not include\n${tpl.notIncluded.map(l => `\u2022 ${l}`).join('\n')}`
}

export type TemplateFields = {
  title: string
  intro: string
  services: string[]
  deliverables: string[]
  milestones: PaymentMilestone[]
  currency: Currency
  oneTime: boolean
  validDays: number
}

export function templateFields(t: Template, clientName: string, clientCompany?: string): TemplateFields {

  const co = clientCompany ?? ''
  return {
    title: t.titleFn(clientName, co),
    intro: withScope(t, t.introFn(clientName, co)),
    services: [...t.services],
    deliverables: t.deliverables.length ? [...t.deliverables] : [''],

    milestones: t.schedule.length ? t.schedule.map(m => ({ ...m })) : [{ label: '', amount: 0 }],
    currency: t.currency,
    oneTime: t.oneTime === true,
    validDays: t.validDays,
  }
}

export function matchTemplate(p: { title: string; offerName?: string }): Template | undefined {
  const hay = `${p.offerName ?? ''} ${p.title}`.toLowerCase()
  return TEMPLATES.find(t => hay.includes((t.offerName ?? t.name).toLowerCase()))
      ?? TEMPLATES.find(t => hay.includes(t.name.toLowerCase()))
}

export const TEMPLATES: Template[] = [
  {
    id: 'coaching',
    icon: 'ti-run',
    name: 'Programa de coaching',
    tagline: 'Tu programa principal. Edita el precio y la duración.',
    color: 'var(--os-accent)',
    titleFn: (_, co) => co ? `${co}: Programa de coaching` : 'Programa de coaching',
    introFn: n => `${n}, aquí tienes la propuesta de lo que hablamos en la llamada.`,
    services: ['Programa de coaching'],
    deliverables: [''],
    schedule: [{ label: 'Al firmar', amount: 0 }],
    currency: 'EUR',
    validDays: 7,
  },
  {
    id: 'custom',
    icon: 'ti-pencil',
    name: 'Propuesta en blanco',
    tagline: 'Empieza desde cero.',
    color: 'var(--os-text-muted)',
    titleFn: () => '',
    introFn: () => '',
    services: [''],
    deliverables: [''],
    schedule: [],
    currency: 'EUR',
    validDays: 7,
  },
]
