import type { Metadata, Viewport } from 'next'
import OnboardingClient from './OnboardingClient'
import './onboarding.css'

export const metadata: Metadata = {
  title: 'Onboarding Unstoppable',
  description: 'Tu onboarding con José Unstoppable: el formulario inicial y la hoja de ruta de tus primeros pasos.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/onboarding' },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  viewportFit: 'cover',
}

export default function OnboardingPage() {
  return <OnboardingClient />
}
