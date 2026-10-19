import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { serviceDb } from '@/lib/os-supabase'
import { readPortalSession } from '@/lib/portal-server'
import { PORTAL_COOKIE } from '@/lib/portal'
import PortalLogin from '../PortalLogin'
import '../portal.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tu portal de cliente', robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: '#0C2A43', viewportFit: 'cover' }

// A client's personal portal link: straight in when already signed in on this
// device, otherwise the sign-in screen with their name and email filled in.
export default async function PersonalPortalLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[a-z0-9]{8,40}$/.test(token)) notFound()
  const db = await serviceDb()
  if (!db) return <PortalLogin />
  const { data } = await db.from('portal_access').select('email, name, active').eq('token', token).maybeSingle()
  if (!data || !data.active) notFound()
  const signedIn = await readPortalSession((await cookies()).get(PORTAL_COOKIE)?.value)
  if (signedIn === data.email) redirect('/portal')
  return <PortalLogin name={data.name} email={data.email} />
}
