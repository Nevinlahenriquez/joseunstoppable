import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import AppShell from './AppShell'
import './app.css'

export const metadata: Metadata = {
  title: 'Tu app de entrenamiento',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Entrena', statusBarStyle: 'default' },
}

export const viewport: Viewport = { themeColor: '#F3F6FB', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Schibsted+Grotesk:wght@600;700;800&display=swap" rel="stylesheet" />
      <Suspense fallback={<div className="ca"><div className="ca-spin" /></div>}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </>
  )
}
