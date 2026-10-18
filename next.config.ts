import type { NextConfig } from 'next'

// The public site is still the original static pages in public/. These
// rewrites keep their clean addresses (/, /reserva, /masterclass) while the
// Next.js app adds /admin and the API routes beside them.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/reserva', destination: '/reserva.html' },
        { source: '/masterclass', destination: '/masterclass.html' },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
  async redirects() {
    return [{ source: '/os/:path*', destination: '/admin/:path*', permanent: false }]
  },
}

export default nextConfig
