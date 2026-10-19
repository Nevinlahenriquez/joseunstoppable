import { NextResponse } from 'next/server'
import { readSetting } from '@/lib/app-settings'
import { cleanPaymentSettings, DEFAULT_PAYMENT_SETTINGS, PAYMENT_SETTINGS_ID } from '@/lib/payment-settings'

export const dynamic = 'force-dynamic'

// What a client needs to pay José (shown on invoices). Nothing private here:
// these are the details José sends to every client anyway.
export async function GET() {
  const s = cleanPaymentSettings(await readSetting(PAYMENT_SETTINGS_ID, DEFAULT_PAYMENT_SETTINGS))
  return NextResponse.json({ ok: true, settings: s }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
