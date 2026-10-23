import type { ReactNode } from 'react'
import CoachArea from '@/components/coach/admin/CoachArea'
import '@/app/app/app.css'

export default function CoachingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Schibsted+Grotesk:wght@600;700;800&display=swap" rel="stylesheet" />
      <CoachArea>{children}</CoachArea>
    </>
  )
}
