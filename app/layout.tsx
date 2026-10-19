import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'José Unstoppable',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the public pages set data-lang on <html> before React loads.
    <html lang="es" suppressHydrationWarning>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
