import type { NextConfig } from 'next'

// Every public page is a Next.js page now (app/(site), app/onboarding,
// app/links); public/ only holds images and the demo dashboard.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/os/:path*', destination: '/admin/:path*', permanent: false },
      // Old static addresses still shared in ads, emails and bios.
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/index', destination: '/', permanent: true },
      { source: '/reserva.html', destination: '/reserva', permanent: true },
      { source: '/masterclass.html', destination: '/masterclass', permanent: true },
      { source: '/onboarding.html', destination: '/onboarding', permanent: true },
    ]
  },
}

export default nextConfig
