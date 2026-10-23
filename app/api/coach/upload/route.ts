import { NextRequest, NextResponse } from 'next/server'
import { coachDb, viewerFor, PHOTO_BUCKET } from '@/lib/coach/server'
import { NO_DB } from '@/lib/os-supabase'

export const runtime = 'nodejs'

const MAX_BYTES = 8 * 1024 * 1024

// Progress photos go to a PRIVATE bucket. A client can only write into their
// own folder; the coach anywhere under the coach id.
export async function POST(req: NextRequest) {
  const db = await coachDb()
  if (!db) return NextResponse.json(NO_DB, { status: 503 })
  const v = await viewerFor(req, db)
  if (!v) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const clientId = String(form?.get('clientId') ?? '')
  if (!(file instanceof Blob) || !clientId) return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'La foto es demasiado grande' }, { status: 413 })
  if (!/^image\//.test(file.type)) return NextResponse.json({ ok: false, error: 'Solo imágenes' }, { status: 415 })
  if (v.role === 'client' && clientId !== v.clientId) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 })
  if (!/^[\w-]+$/.test(clientId)) return NextResponse.json({ ok: false, error: 'bad client' }, { status: 400 })

  const path = `${v.coachId}/${clientId}/${crypto.randomUUID()}.jpg`
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, path })
}
