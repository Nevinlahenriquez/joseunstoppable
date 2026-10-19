import type { NextConfig } from 'next'

// Pages not yet rebuilt in Next.js are still the original static pages in
// public/. These rewrites keep their clean addresses (/, /reserva) while the
// Next.js app serves /masterclass, /events/[slug], /admin and the API routes.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/reserva', destination: '/reserva.html' },
        { source: '/onboarding', destination: '/onboarding.html' },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  async redirects() {
    return [
      { source: '/os/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/masterclass.html', destination: '/masterclass', permanent: true },
    ]
  },
}

export default nextConfig
