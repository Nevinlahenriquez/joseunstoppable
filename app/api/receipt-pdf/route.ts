import { NextRequest, NextResponse } from 'next/server'
import type { Invoice, InvoiceLineItem } from '@/lib/crm-types'
import { escapeHtml } from '@/lib/escape-html'

export const runtime = 'nodejs'
export const maxDuration = 60

const BIZ = {
  name: 'José Unstoppable',
  address: (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || ''),
  email: 'hola@joseunstoppable.com',
  phone: '',
  website: 'joseunstoppable.com',
  legal: 'José Unstoppable',
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {

  const date = d.length <= 10 ? new Date(d + 'T00:00:00') : new Date(d)
  return date.toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function receiptNumber(invoiceNumber: string): string {
  return `R-${invoiceNumber}`
}

function buildReceiptHtml(inv: Invoice, method: string): string {
  const lineItems: InvoiceLineItem[] = inv.lineItems ?? []
  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.price, 0)
  const total = subtotal + (inv.taxes ?? 0)

  const amountPaid = inv.amountPaid && inv.amountPaid > 0 ? inv.amountPaid : total
  const currency = inv.currency || 'USD'
  const paidOn = inv.paidAt || inv.createdAt
  const rNo = receiptNumber(inv.number)

  const lineRows = lineItems.map(li => `
    <tr>
      <td class="td-main">
        <div class="li-name">${escapeHtml(li.name)}</div>
        ${li.description ? `<div class="li-desc">${escapeHtml(li.description)}</div>` : ''}
      </td>
      <td class="td-num">${li.quantity}</td>
      <td class="td-num td-bold">${fmt(li.quantity * li.price, currency)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt; color: #1a0030; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { width: 100%; padding: 48px 52px; display: flex; flex-direction: column; }
  table, .header, .paid-band, .meta-row, .totals, .notes, .footer { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }

  /* ── Header ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 22px; border-bottom: 2px solid #212A4D; }
  .brand-name { font-size: 15pt; font-weight: 800; color: #212A4D; margin-bottom: 6px; }
  .brand-meta { font-size: 8.5pt; color: #666; line-height: 1.8; }
  .r-label { font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #16a34a; margin-bottom: 6px; text-align: right; }
  .r-number { font-size: 22pt; font-weight: 800; color: #212A4D; text-align: right; line-height: 1; }
  .r-ref { font-size: 8.5pt; color: #999; text-align: right; margin-top: 6px; }

  /* ── Paid band ── */
  .paid-band {
    display: flex; align-items: center; justify-content: space-between;
    background: #0d3d1e; border-radius: 12px; padding: 22px 28px; margin-bottom: 28px;
  }
  .paid-left { display: flex; align-items: center; gap: 16px; }
  .paid-stamp {
    border: 2.5px solid #4ade80; color: #4ade80; border-radius: 8px;
    padding: 6px 14px; font-size: 15pt; font-weight: 800; letter-spacing: 3px;
    transform: rotate(-4deg);
  }
  .paid-caption { color: #a7f3d0; font-size: 8.5pt; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px; }
  .paid-amount { color: #fff; font-size: 24pt; font-weight: 800; line-height: 1; }
  .paid-date { text-align: right; color: #a7f3d0; font-size: 9pt; line-height: 1.7; }
  .paid-date strong { color: #fff; display: block; font-size: 10.5pt; }

  /* ── Meta row ── */
  .meta-row { display: flex; gap: 0; margin-bottom: 26px; }
  .meta-box { flex: 1; }
  .meta-box + .meta-box { padding-left: 28px; border-left: 1px solid #E4F4FD; margin-left: 28px; }
  .meta-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bbb; margin-bottom: 6px; }
  .meta-value { font-size: 10pt; font-weight: 700; color: #212A4D; line-height: 1.5; }
  .meta-sub { font-size: 9pt; color: #888; margin-top: 2px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #212A4D; }
  thead th { padding: 9px 12px; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.75); text-align: left; }
  thead th:not(:first-child) { text-align: right; }
  .td-main { padding: 10px 12px; border-bottom: 1px solid #E4F4FD; vertical-align: top; }
  .td-num { padding: 10px 12px; border-bottom: 1px solid #E4F4FD; text-align: right; vertical-align: top; white-space: nowrap; }
  .td-bold { font-weight: 700; }
  .li-name { font-weight: 600; color: #0C2A43; font-size: 10pt; }
  .li-desc { font-size: 8.5pt; color: #999; margin-top: 2px; }

  /* ── Totals ── */
  .totals { margin-left: auto; width: 260px; margin-bottom: 24px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9.5pt; color: #888; }
  .totals-row.total { background: #0d3d1e; color: #fff; font-weight: 800; padding: 12px 16px; border-radius: 8px; margin-top: 8px; font-size: 12pt; }

  .notes { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 9pt; color: #14532d; margin-bottom: 20px; line-height: 1.7; }

  .footer { margin-top: auto; padding-top: 20px; border-top: 1px solid #E4F4FD; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #bbb; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">${BIZ.name}</div>
      <div class="brand-meta">
        ${BIZ.legal}<br>
        ${BIZ.address}<br>
        ${BIZ.email} &nbsp;·&nbsp; ${BIZ.phone}<br>
        ${BIZ.website}
      </div>
    </div>
    <div>
      <div class="r-label">Recibo de pago</div>
      <div class="r-number">${rNo}</div>
      <div class="r-ref">for Invoice #${escapeHtml(inv.number)}</div>
    </div>
  </div>

  <!-- Paid band -->
  <div class="paid-band">
    <div class="paid-left">
      <div class="paid-stamp">PAID</div>
      <div>
        <div class="paid-caption">Importe recibido</div>
        <div class="paid-amount">${fmt(amountPaid, currency)}</div>
      </div>
    </div>
    <div class="paid-date">
      Pagado el<strong>${fmtDate(paidOn)}</strong>
      via ${escapeHtml(method)}
    </div>
  </div>

  <!-- Meta row -->
  <div class="meta-row">
    <div class="meta-box">
      <div class="meta-label">Recibido de</div>
      <div class="meta-value">${escapeHtml(inv.clientName)}${inv.clientCompany ? ` · ${escapeHtml(inv.clientCompany)}` : ''}</div>
      ${inv.clientEmail ? `<div class="meta-sub">${escapeHtml(inv.clientEmail)}</div>` : ''}
    </div>
    ${inv.projectTitle ? `
    <div class="meta-box">
      <div class="meta-label">Concepto</div>
      <div class="meta-value">${escapeHtml(inv.projectTitle)}</div>
    </div>` : ''}
    <div class="meta-box">
      <div class="meta-label">Forma de pago</div>
      <div class="meta-value">${escapeHtml(method)}</div>
    </div>
  </div>

  <!-- Line items -->
  <table>
    <thead>
      <tr>
        <th style="width:64%">Descripción</th>
        <th>Cant.</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal, currency)}</span></div>
    ${inv.taxes ? `<div class="totals-row"><span>Impuestos</span><span>${fmt(inv.taxes, currency)}</span></div>` : ''}
    <div class="totals-row total"><span>Total pagado</span><span>${fmt(amountPaid, currency)}</span></div>
  </div>

  <div class="notes">Este recibo confirma que el pago se ha recibido por completo y no queda nada pendiente. Guárdalo para tus registros. Gracias por tu confianza.</div>

  <!-- Footer -->
  <div class="footer">
    <div>${BIZ.name} &nbsp;·&nbsp; Recibo ${rNo} &nbsp;·&nbsp; ${BIZ.email}</div>
    <div style="color:#16a34a;font-weight:700">Pagado por completo · ${fmt(amountPaid, currency)}</div>
  </div>

</div>
</body>
</html>`
}

async function pdfShift(html: string): Promise<Buffer> {
  const apiKey = process.env.PDFSHIFT_API_KEY
  if (!apiKey) throw new Error('PDFSHIFT_API_KEY is not configured')

  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, format: 'A4', margin: '0' }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`PDFShift ${res.status}: ${detail.slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const method = (req.nextUrl.searchParams.get('method') || 'Manual payment').slice(0, 40)
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await sb.from('invoices').select('*').eq('id', id).single()
    if (error || !data) return NextResponse.json({ error: 'Factura no encontrada', detail: error?.message }, { status: 404 })

    const inv: Invoice = {
      id: data.id, number: data.number,
      clientName: data.client_name, clientEmail: data.client_email,
      clientCompany: data.client_company ?? undefined,
      projectTitle: data.project_title ?? undefined,
      lineItems: data.line_items ?? [],
      taxes: data.taxes ?? 0, amountPaid: data.amount_paid ?? 0,
      currency: data.currency, status: data.status,
      notes: data.notes ?? undefined,
      issueDate: data.issue_date, dueDate: data.due_date,
      createdAt: data.created_at, paidAt: data.paid_at ?? undefined,
      proposalId: data.proposal_id ?? undefined,
    }

    const html = buildReceiptHtml(inv, method)
    const pdf = await pdfShift(html)

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Recibo-${receiptNumber(inv.number)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'No se pudo generar el PDF del recibo', detail: message }, { status: 500 })
  }
}
