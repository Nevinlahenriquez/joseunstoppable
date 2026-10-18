import { NextRequest, NextResponse } from 'next/server'
import { serviceDb } from '@/lib/os-supabase'
import { logBioEvent, safeHref, withBioRef } from '@/lib/bio-links'

export const dynamic = 'force-dynamic'

// A tap on a link-in-bio button: count it, then send the visitor on.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const origin = req.nextUrl.origin
  const db = await serviceDb()
  const { data } = db ? await db.from('bio_links').select('url,active').eq('id', id).maybeSingle() : { data: null }
  const href = data?.active !== false && data?.url ? safeHref(data.url) : null
  if (!href) return NextResponse.redirect(new URL('/links', origin))
  await logBioEvent('click', `/l/${id}`, req.headers.get('referer'))
  return NextResponse.redirect(new URL(withBioRef(href, origin), origin), 302)
}
