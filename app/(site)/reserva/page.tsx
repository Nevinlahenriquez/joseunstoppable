import type { Metadata } from 'next'
import ReservaClient from './ReservaClient'
import './reserva.css'

export const metadata: Metadata = {
  title: 'Llamada gratuita · José Unstoppable',
  description: 'Responde 10 preguntas rápidas y agenda tu llamada privada gratuita de 30 minutos con José.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/reserva' },
}

export default function ReservaPage() {
  return <ReservaClient />
}
