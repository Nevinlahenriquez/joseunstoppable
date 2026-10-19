import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { readSetting, writeSetting } from '@/lib/app-settings'
import { cleanPaymentSettings, revolutUrl, DEFAULT_PAYMENT_SETTINGS, PAYMENT_SETTINGS_ID } from '@/lib/payment-settings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const settings = await readSetting(PAYMENT_SETTINGS_ID, DEFAULT_PAYMENT_SETTINGS)
  return NextResponse.json({ ok: true, settings: cleanPaymentSettings(settings) })
}

// PUT { revolut, bizum, holder, iban, swift, note }
export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false }, { status: 401 })
  const settings = cleanPaymentSettings(await req.json().catch(() => ({})))
  if (settings.revolut && !revolutUrl(settings.revolut)) {
    return NextResponse.json({ ok: false, error: 'Ese no parece un link de Revolut. Pega tu revolut.me/… o tu @usuario.' }, { status: 400 })
  }
  const r = await writeSetting(PAYMENT_SETTINGS_ID, settings)
  return NextResponse.json({ ...r, settings }, { status: r.ok ? 200 : 500 })
}
