import type { Metadata } from 'next'
import localFont from 'next/font/local'

// Plus Jakarta Sans, self-hosted so pages never wait on Google Fonts.
const jakarta = localFont({
  src: [
    { path: './fonts/jakarta-latin.woff2', weight: '400 800', style: 'normal' },
    { path: './fonts/jakarta-latin-ext.woff2', weight: '400 800', style: 'normal' },
  ],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://joseunstoppable.com'),
  title: 'José Unstoppable',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
