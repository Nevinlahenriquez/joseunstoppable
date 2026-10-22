import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Hanken_Grotesk, Instrument_Serif, Schibsted_Grotesk } from 'next/font/google'

// Plus Jakarta Sans, self-hosted so pages never wait on Google Fonts.
const jakarta = localFont({
  src: [
    { path: './fonts/jakarta-latin.woff2', weight: '400 800', style: 'normal' },
    { path: './fonts/jakarta-latin-ext.woff2', weight: '400 800', style: 'normal' },
  ],
  variable: '--font-jakarta',
  display: 'swap',
})

// Public site type: Schibsted Grotesk headlines, Hanken Grotesk text,
// Instrument Serif italic for the highlighted words. next/font self-hosts them.
const display = Schibsted_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700', '800', '900'], variable: '--font-display', display: 'swap' })
const body = Hanken_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' })
const serif = Instrument_Serif({ subsets: ['latin', 'latin-ext'], weight: '400', style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://joseunstoppable.com'),
  title: 'José Unstoppable',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${display.variable} ${body.variable} ${serif.variable}`} suppressHydrationWarning>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
