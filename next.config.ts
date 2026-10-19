import type { NextConfig } from 'next'

// The public pages are Next.js pages in app/(site). The pages still served from static files in public/ keep
// their clean addresses through these rewrites.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/onboarding', destination: '/onboarding.html' },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  async redirects() {
    return [
      { source: '/os/:path*', destination: '/admin/:path*', permanent: false },
      // Old static addresses still shared in ads, emails and bios.
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/index', destination: '/', permanent: true },
      { source: '/reserva.html', destination: '/reserva', permanent: true },
      { source: '/masterclass.html', destination: '/masterclass', permanent: true },
    ]
  },
}

export default nextConfig
