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
    id: 'imparable-6m',
    icon: 'ti-run',
    name: 'Programa Imparable · 6 meses',
    offerName: 'Programa Imparable 6 meses',
    tagline: '6 meses de coaching 1:1 · 499 € en un solo pago.',
    color: 'var(--os-accent)',
    // Lines under 60 characters with no closing punctuation render as headings
    // on the proposal page, so every bullet and paragraph ends with a full stop.
    titleFn: n => n ? `Programa Imparable · 6 meses · ${n}` : 'Programa Imparable · 6 meses',
    introFn: n => [
      `${n ? `${n}, esta` : 'Esta'} es tu propuesta para el Programa Imparable: 6 meses trabajando juntos, 1:1, para que vuelvas a gustarte y para que esta vez el cambio se quede.`,
      '',
      'Por qué 6 meses',
      'En 90 días se ve el cambio. En 6 meses se queda. La primera mitad construimos músculo, bajamos grasa y creamos los hábitos. La segunda mitad los consolidamos para que entrenar y comer bien sea parte de tu vida, sin depender de mí.',
      '',
      'Cómo vamos a trabajar',
      '• Meses 1 y 2, la base: técnica, rutina de fuerza de 3 horas a la semana, estructura de comidas y primeros resultados visibles.',
      '• Meses 3 y 4, el cambio: progresión de cargas, ajustes de nutrición según tus datos y el físico empieza a notarse en el espejo y en la ropa.',
      '• Meses 5 y 6, la autonomía: afinamos detalles, preparamos comidas fuera, viajes y vacaciones, y aprendes a gestionarte por tu cuenta.',
      '',
      'Garantía Imparable',
      'Si durante el proceso sigues el plan, completas tus entrenos y haces tus check-ins semanales, y no ves resultados, te devuelvo el 100% de tu dinero. Así de seguro estoy del método.',
      '',
      'Qué no incluye',
      '• Cuota de gimnasio, material deportivo o suplementos.',
      '• Tratamiento médico o de lesiones; si hace falta, te derivo a un profesional sanitario.',
    ].join('\n'),
    services: [
      'Plan de entrenamiento de fuerza personalizado en mi app, unas 3 horas a la semana, adaptado a tu nivel, tu horario y tu material.',
      'Cada ejercicio explicado paso a paso dentro de la app.',
      'Plan de nutrición flexible con recetas sencillas, adaptado a tu trabajo, tu familia y tu vida social.',
      'WhatsApp directo conmigo todos los días para dudas, ajustes y motivación.',
      'Check-in semanal: revisión de peso, medidas, fotos y entrenos, con ajustes del plan.',
      'Llamada 1:1 cada mes para revisar tu progreso y fijar los objetivos del mes siguiente.',
      'Coaching de mentalidad y hábitos: sueño, estrés, constancia y relación con la comida.',
      'Revisión de tu técnica por vídeo siempre que la necesites.',
    ],
    deliverables: [
      'Un físico más fuerte y con menos grasa, medido con fotos y medidas desde el primer día.',
      'Tu rutina de fuerza de 3 horas a la semana convertida en hábito.',
      'Saber comer sin dietas: qué, cuánto y cómo, también fuera de casa.',
      'El registro completo de tu progreso durante los 6 meses.',
      'Un plan para seguir por tu cuenta cuando terminemos.',
      'Garantía de devolución del 100% si cumples el plan y no ves resultados.',
    ],
    schedule: [{ label: 'Al firmar · 6 meses completos', amount: 499 }],
    oneTime: true,
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
