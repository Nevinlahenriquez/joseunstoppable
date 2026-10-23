import { NextRequest, NextResponse } from 'next/server'
import { coachDb, viewerFor } from '@/lib/coach/server'

export const runtime = 'nodejs'

// Which store the app should use, and who is looking. No database = demo mode,
// so a preview can be clicked through without any keys.
export async function GET(req: NextRequest) {
  const db = await coachDb()
  if (!db) return NextResponse.json({ ok: true, live: false })
  const v = await viewerFor(req, db)
  return NextResponse.json({ ok: true, live: true, viewer: v })
}
