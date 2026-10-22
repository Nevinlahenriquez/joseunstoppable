import type { Metadata, Viewport } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import ViewTracker from '@/components/site/ViewTracker'
import WhatsAppFab from '@/components/site/WhatsAppFab'
import { INSTAGRAM_URL, LANG_BOOT_SCRIPT, OWNER, SITE_URL } from '@/lib/site'
import './site.css'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'José Unstoppable',
    locale: 'es_ES',
    images: [{ url: '/images/jose.jpg', width: 1200, height: 1286, alt: 'Jose Sanchez' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
}

// Tells search engines who José is and where else he is online.
const PROFILE = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: OWNER.name,
  alternateName: OWNER.brand,
  url: SITE_URL,
  image: SITE_URL + '/images/jose.jpg',
  jobTitle: 'Coach de entrenamiento y hábitos',
  email: OWNER.email,
  sameAs: [INSTAGRAM_URL].filter(Boolean),
}

// Every public page shares this frame. The header and footer stay mounted
// between pages, so moving around the site only swaps the content.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PROFILE) }} />
      <ViewTracker />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  )
}
