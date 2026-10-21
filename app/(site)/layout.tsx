import type { Metadata, Viewport } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import ViewTracker from '@/components/site/ViewTracker'
import WhatsAppFab from '@/components/site/WhatsAppFab'
import { INSTAGRAM_URL, LANG_BOOT_SCRIPT, LINKS, OWNER, PRICE, SITE_URL } from '@/lib/site'
import './site.css'

const DESCRIPTION = 'Coaching 1:1 online para hombres de 30 a 50. 3 horas de entreno a la semana, nutrición que encaja en tu vida y José a tu lado cada día.'

// The share image comes from opengraph-image.tsx in this folder.
export const metadata: Metadata = {
  description: DESCRIPTION,
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  openGraph: {
    type: 'website',
    siteName: 'José Unstoppable',
    locale: 'es_ES',
    alternateLocale: ['en_GB'],
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', description: DESCRIPTION },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
}

// Tells search engines who José is, what he sells and where else he is online.
const PROFILE = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': SITE_URL + '/#website',
      url: SITE_URL,
      name: OWNER.brand,
      inLanguage: ['es-ES', 'en'],
      publisher: { '@id': SITE_URL + '/#jose' },
    },
    {
      '@type': 'Person',
      '@id': SITE_URL + '/#jose',
      name: OWNER.name,
      alternateName: OWNER.brand,
      url: SITE_URL,
      image: SITE_URL + '/images/jose.jpg',
      jobTitle: 'Coach de entrenamiento y hábitos',
      email: OWNER.email,
      sameAs: [INSTAGRAM_URL].filter(Boolean),
    },
    {
      '@type': 'Service',
      '@id': SITE_URL + '/#programa',
      name: 'Coaching 1:1 online · 90 días',
      serviceType: 'Entrenamiento personal y nutrición online',
      description: DESCRIPTION,
      provider: { '@id': SITE_URL + '/#jose' },
      areaServed: { '@type': 'Country', name: 'España' },
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: SITE_URL + LINKS.book },
      offers: { '@type': 'Offer', price: PRICE, priceCurrency: 'EUR', url: SITE_URL + LINKS.book },
    },
  ],
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
