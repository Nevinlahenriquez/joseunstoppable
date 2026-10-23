import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { bunnyConfig, createUpload, videoState, isVideoId } from '@/lib/coach/bunny'

export const runtime = 'nodejs'

const NOT_SET = { ok: false, configured: false, error: 'Bunny Stream no está conectado (faltan BUNNY_STREAM_API_KEY, BUNNY_STREAM_LIBRARY_ID y BUNNY_STREAM_CDN_HOSTNAME en Vercel).' }

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const cfg = bunnyConfig()
  if (!cfg) return NextResponse.json(NOT_SET)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ ok: true, configured: true })
  if (!isVideoId(id)) return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 })
  try { return NextResponse.json({ ok: true, ...(await videoState(cfg, id)) }) }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 }) }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const cfg = bunnyConfig()
  if (!cfg) return NextResponse.json(NOT_SET, { status: 503 })
  const { title } = await req.json().catch(() => ({})) as { title?: string }
  try { return NextResponse.json({ ok: true, ticket: await createUpload(cfg, String(title || 'Ejercicio').slice(0, 120)) }) }
  catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 }) }
}
