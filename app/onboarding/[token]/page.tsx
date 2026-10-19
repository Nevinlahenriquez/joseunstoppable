import type { Metadata, Viewport } from 'next'
import OnboardingPage from '../OnboardingPage'

export const metadata: Metadata = { title: 'Onboarding Unstoppable', robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: '#FFFFFF', viewportFit: 'cover' }

// A client's personal link, activated from the dashboard.
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <OnboardingPage token={token} />
}
