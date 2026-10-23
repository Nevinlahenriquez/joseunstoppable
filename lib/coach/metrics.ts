import type { MetricType } from './types'

export const METRICS: { k: MetricType; t: string; u: string }[] = [
  { k: 'weight', t: 'Peso', u: 'kg' }, { k: 'bodyfat', t: 'Grasa', u: '%' }, { k: 'waist', t: 'Cintura', u: 'cm' },
  { k: 'chest', t: 'Pecho', u: 'cm' }, { k: 'hips', t: 'Cadera', u: 'cm' }, { k: 'arm', t: 'Brazo', u: 'cm' }, { k: 'thigh', t: 'Muslo', u: 'cm' },
]
