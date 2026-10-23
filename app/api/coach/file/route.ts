import { NextRequest, NextResponse } from 'next/server'
import { coachDb, viewerFor, PHOTO_BUCKET } from '@/lib/coach/server'

export const runtime = 'nodejs'

// <img src="/api/coach/file?path=..."> : checks who is asking, then redirects
// to a one-hour signed link. The bucket itself is never public.
export async function GET(req: NextRequest) {
  const db = await coachDb()
  if (!db) return new NextResponse('No database', { status: 503 })
  const v = await viewerFor(req, db)
  if (!v) return new NextResponse('Forbidden', { status: 403 })
  const path = req.nextUrl.searchParams.get('path') ?? ''
  const [coachId, clientId] = path.split('/')
  if (coachId !== v.coachId || path.includes('..')) return new NextResponse('Forbidden', { status: 403 })
  if (v.role === 'client' && clientId !== v.clientId) return new NextResponse('Forbidden', { status: 403 })
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600)
  if (error || !data?.signedUrl) return new NextResponse('Not found', { status: 404 })
  return NextResponse.redirect(data.signedUrl, { headers: { 'Cache-Control': 'private, max-age=3000' } })
}
