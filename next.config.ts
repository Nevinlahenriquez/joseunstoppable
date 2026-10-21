import type { NextConfig } from 'next'

// Sent with every response. No script allow-list (the Meta Pixel and inline
// boot scripts need to run); these lock down framing, sniffing and referrers.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests" },
]

// Every public page is a Next.js page now (app/(site), app/onboarding,
// app/links); public/ only holds images and the demo dashboard.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
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
