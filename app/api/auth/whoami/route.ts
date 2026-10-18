import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE, STAFF_EMAIL } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })
  const staff = session.staff === true
  const editor = session.role === 'editor'
  const partner = session.role === 'partner'
  return NextResponse.json({
    ok: true,
    email: session.email,
    role: session.role,
    editor,
    partner,
    staff,
    label: editor ? 'Content editor' : partner ? 'Socio' : staff ? 'Team' : 'José Unstoppable',
    sub: editor ? 'Content Studio access only' : partner ? 'Shared board · Projects and Tasks' : staff ? `Team access · ${STAFF_EMAIL}` : 'Owner',
  })
}
