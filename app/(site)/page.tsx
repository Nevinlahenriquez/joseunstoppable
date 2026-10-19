import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import './home.css'

export const metadata: Metadata = {
  title: 'José Unstoppable · Vuelve a gustarte en 90 días',
  description: 'Coaching 1:1 online para hombres de 30 a 50: 3 horas de entreno a la semana, nutrición que encaja en tu vida y José a tu lado cada día. Reserva tu llamada gratuita.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return <HomeClient />
}
