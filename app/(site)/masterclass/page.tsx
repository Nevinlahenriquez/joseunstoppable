import type { Metadata } from 'next'
import MasterclassClient from './MasterclassClient'
import './masterclass.css'

export const metadata: Metadata = {
  title: 'Masterclass gratuita · José Unstoppable',
  description:
    'Masterclass gratuita en directo con José Sánchez: cómo perder la barriga después de los 40 sin vivir en el gimnasio.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/masterclass' },
}

export default function MasterclassPage() {
  return <MasterclassClient />
}
