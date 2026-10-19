import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { readSetting, writeSetting } from '@/lib/app-settings'
import { DEFAULT_PAYMENT_SETTINGS, normalizeRevolut, PAYMENT_SETTING, type PaymentSettings } from '@/lib/payment-details'

export const dynamic = 'force-dynamic'

// GET: the public payment options shown on invoices (only the Revolut link).
export async function GET() {
  const s = await readSetting<PaymentSettings>(PAYMENT_SETTING, DEFAULT_PAYMENT_SETTINGS)
  return NextResponse.json({ ok: true, revolutUrl: s.revolutUrl || '' })
}

// PUT { revolutUrl }: José sets or clears his Revolut link.
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const b = await req.json().catch(() => ({})) as Record<string, unknown>
  const revolutUrl = normalizeRevolut(typeof b.revolutUrl === 'string' ? b.revolutUrl.slice(0, 300) : '')
  if (revolutUrl === null) return NextResponse.json({ ok: false, error: 'Ese enlace no es de Revolut. Pega tu revolut.me/…' }, { status: 400 })
  const r = await writeSetting(PAYMENT_SETTING, { revolutUrl })
  return NextResponse.json({ ...r, revolutUrl })
}
