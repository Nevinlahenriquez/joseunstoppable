import type { Metadata, Viewport } from 'next'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import ViewTracker from '@/components/site/ViewTracker'
import { LANG_BOOT_SCRIPT } from '@/lib/site'
import './site.css'

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'José Unstoppable',
    locale: 'es_ES',
    images: [{ url: '/images/jose.jpg', width: 1200, height: 1286, alt: 'José Sánchez' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
}

// Every public page shares this frame. The header and footer stay mounted
// between pages, so moving around the site only swaps the content.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      <ViewTracker />
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </>
  )
}
