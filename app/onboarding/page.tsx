import type { Metadata, Viewport } from 'next'
import OnboardingPage from './OnboardingPage'

export const metadata: Metadata = { title: 'Onboarding Unstoppable', robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: '#FFFFFF', viewportFit: 'cover' }

// The generic link (still works with ?nombre=Ana). Answers reach José on
// the dashboard as a new onboarding.
export default async function Page({ searchParams }: { searchParams: Promise<{ nombre?: string; n?: string }> }) {
  const sp = await searchParams
  const name = (sp.nombre || sp.n || '').trim().slice(0, 60)
  return <OnboardingPage presetName={name} />
}
