import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { readSetting, writeSetting } from '@/lib/app-settings'
<<<<<<< HEAD
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
=======
import { cleanPaymentSettings, revolutLink, DEFAULT_PAYMENT_SETTINGS, PAYMENT_SETTINGS_ID } from '@/lib/payment-settings'

export const dynamic = 'force-dynamic'

// GET: how to pay José, shown on every invoice. Nothing private: these are the
// details he sends every client anyway.
export async function GET() {
  const settings = cleanPaymentSettings(await readSetting(PAYMENT_SETTINGS_ID, DEFAULT_PAYMENT_SETTINGS))
  return NextResponse.json({ ok: true, revolutUrl: revolutLink(settings.revolutUrl), settings })
}

// PUT { revolutUrl, bizum, holder, iban, swift, note }: José saves them on Cobrar.
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const settings = cleanPaymentSettings(await req.json().catch(() => ({})))
  if (settings.revolutUrl) {
    const link = revolutLink(settings.revolutUrl)
    if (!link) return NextResponse.json({ ok: false, error: 'Ese enlace no es de Revolut. Pega tu revolut.me/… o tu @usuario.' }, { status: 400 })
    settings.revolutUrl = link
  }
  const r = await writeSetting(PAYMENT_SETTINGS_ID, settings)
  return NextResponse.json({ ...r, revolutUrl: settings.revolutUrl, settings }, { status: r.ok ? 200 : 500 })
>>>>>>> origin/main
}
