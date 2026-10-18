import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { exchangeCode } from '@/lib/google-booking'

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.redirect(new URL('/admin/login', req.url))
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const back = (q: string) => {
    const res = NextResponse.redirect(new URL(`/admin/bookings?google=${q}`, req.url))
    res.cookies.delete('ju_g_state')
    return res
  }
  if (!code || !state || state !== req.cookies.get('ju_g_state')?.value) return back('error')
  const r = await exchangeCode(code, req.nextUrl.origin)
  return back(r.ok ? 'connected' : 'error')
}
