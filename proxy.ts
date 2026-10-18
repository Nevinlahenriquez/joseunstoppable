import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, isAuthConfigured, adminOpen, SESSION_COOKIE } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()

  const toLogin = () => {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (adminOpen()) {
    const open = NextResponse.next()
    open.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return open
  }

  if (!isAuthConfigured()) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return toLogin()
  }

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session || session.role !== 'admin') return toLogin()

  const res = NextResponse.next()
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
