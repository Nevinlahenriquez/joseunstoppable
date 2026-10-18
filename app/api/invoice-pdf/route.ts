import { NextRequest, NextResponse } from 'next/server'
import type { Invoice, InvoiceLineItem } from '@/lib/crm-types'
import { escapeHtml } from '@/lib/escape-html'

export const runtime = 'nodejs'
export const maxDuration = 60

const BIZ = {
  name: 'José Unstoppable',

  legal: 'José Unstoppable',

  address: (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || ''),
  email: 'hola@joseunstoppable.com',
  phone: '',
  iban: (process.env.NEXT_PUBLIC_BANK_IBAN || ''),
  swift: (process.env.NEXT_PUBLIC_BANK_SWIFT || ''),
  bank: 'José Unstoppable',
  website: 'joseunstoppable.com',
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildInvoiceHtml(inv: Invoice, proposalRef?: string): string {
  const lineItems: InvoiceLineItem[] = inv.lineItems ?? []
  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.price, 0)
  const total = subtotal + (inv.taxes ?? 0)
  const balance = total - (inv.amountPaid ?? 0)
  const currency = inv.currency || 'USD'

  const lineRows = lineItems.map(li => `
    <tr>
      <td class="td-main">
        <div class="li-name">${escapeHtml(li.name)}</div>
        ${li.description ? `<div class="li-desc">${escapeHtml(li.description)}</div>` : ''}
      </td>
      <td class="td-num">${li.quantity}</td>
      <td class="td-num">${fmt(li.price, currency)}</td>
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
    font-size: 11pt;
    color: #1a0030;
    background: #fff;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* No vh height, that made PDFShift render a near-empty second page. Content
     flows naturally on a single Letter page. */
  .page {
    width: 100%;
    padding: 48px 52px;
    display: flex;
    flex-direction: column;
  }
  table, .header, .meta-row, .totals, .notes, .payment-box, .footer {
    page-break-inside: avoid; break-inside: avoid;
  }
  thead { display: table-header-group; } /* repeat header if a long table wraps */
  tr { page-break-inside: avoid; break-inside: avoid; }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    padding-bottom: 24px;
    border-bottom: 2px solid #212A4D;
  }
  .brand-name { font-size: 15pt; font-weight: 800; color: #212A4D; margin-bottom: 6px; }
  .brand-meta { font-size: 8.5pt; color: #666; line-height: 1.8; }
  .invoice-label { font-size: 8pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #0E71AC; margin-bottom: 6px; text-align: right; }
  .invoice-number { font-size: 22pt; font-weight: 800; color: #212A4D; text-align: right; line-height: 1; }

  /* ── Meta row ── */
  .meta-row {
    display: flex;
    gap: 0;
    margin-bottom: 28px;
  }
  .meta-box {
    flex: 1;
  }
  .meta-box + .meta-box {
    padding-left: 32px;
    border-left: 1px solid #E4F4FD;
    margin-left: 32px;
  }
  .meta-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bbb; margin-bottom: 6px; }
  .meta-value { font-size: 10pt; font-weight: 700; color: #212A4D; line-height: 1.5; }
  .meta-sub { font-size: 9pt; color: #888; margin-top: 2px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #212A4D; }
  thead th {
    padding: 9px 12px;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.75);
    text-align: left;
  }
  thead th:not(:first-child) { text-align: right; }
  .td-main { padding: 10px 12px; border-bottom: 1px solid #E4F4FD; vertical-align: top; }
  .td-num { padding: 10px 12px; border-bottom: 1px solid #E4F4FD; text-align: right; vertical-align: top; white-space: nowrap; }
  .td-bold { font-weight: 700; }
  .li-name { font-weight: 600; color: #0C2A43; font-size: 10pt; }
  .li-desc { font-size: 8.5pt; color: #999; margin-top: 2px; }

  /* ── Totals ── */
  .totals { margin-left: auto; width: 240px; margin-bottom: 24px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9.5pt; color: #888; }
  .totals-row.balance {
    background: #212A4D; color: #fff; font-weight: 800;
    padding: 10px 14px; border-radius: 8px; margin-top: 8px; font-size: 12pt;
  }

  /* ── Notes ── */
  .notes { background: #F1F8FD; border-left: 3px solid #0E71AC; padding: 10px 14px; border-radius: 0 6px 6px 0; font-size: 9pt; color: #555; margin-bottom: 20px; line-height: 1.65; }

  /* ── Payment details ── */
  .payment-box {
    border: 1px solid #E4F4FD;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .payment-box-title { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #0E71AC; margin-bottom: 10px; }
  .payment-grid { display: flex; gap: 32px; }
  .payment-col { flex: 1; font-size: 9pt; color: #555; line-height: 1.9; }
  .payment-col strong { color: #212A4D; font-weight: 700; display: block; margin-bottom: 2px; }

  /* ── Footer ── */
  .footer {
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid #E4F4FD;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #bbb;
  }
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
      <div class="invoice-label">Factura</div>
      <div class="invoice-number">#${inv.number}</div>
    </div>
  </div>

  <!-- Meta row: bill to / dates -->
  <div class="meta-row">
    <div class="meta-box">
      <div class="meta-label">Facturar a</div>
      <div class="meta-value">${escapeHtml(inv.clientName)}${inv.clientCompany ? ` · ${escapeHtml(inv.clientCompany)}` : ''}</div>
      ${inv.clientEmail ? `<div class="meta-sub">${escapeHtml(inv.clientEmail)}</div>` : ''}
      ${inv.clientAddress ? `<div class="meta-sub">${escapeHtml(inv.clientAddress)}</div>` : ''}
      ${inv.clientPhone ? `<div class="meta-sub">${escapeHtml(inv.clientPhone)}</div>` : ''}
      ${inv.clientVat ? `<div class="meta-sub">VAT ID: ${escapeHtml(inv.clientVat)}</div>` : ''}
    </div>
    <div class="meta-box">
      <div class="meta-label">Fecha de emisión</div>
      <div class="meta-value">${fmtDate(inv.issueDate)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Vencimiento</div>
      <div class="meta-value" style="color:${inv.status === 'overdue' ? '#dc2626' : '#212A4D'}">${fmtDate(inv.dueDate)}</div>
    </div>
    ${inv.projectTitle ? `
    <div class="meta-box">
      <div class="meta-label">Concepto</div>
      <div class="meta-value">${escapeHtml(inv.projectTitle)}</div>
    </div>` : ''}
    ${proposalRef ? `
    <div class="meta-box">
      <div class="meta-label">Propuesta</div>
      <div class="meta-value" style="color:#0E71AC">${proposalRef}</div>
    </div>` : ''}
  </div>

  <!-- Line items -->
  <table>
    <thead>
      <tr>
        <th style="width:50%">Descripción</th>
        <th>Cant.</th>
        <th>Precio</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal, currency)}</span></div>
    ${inv.taxes ? `<div class="totals-row"><span>Impuestos</span><span>${fmt(inv.taxes, currency)}</span></div>` : ''}
    ${inv.amountPaid ? `<div class="totals-row"><span>Importe pagado</span><span style="color:#16a34a">− ${fmt(inv.amountPaid, currency)}</span></div>` : ''}
    <div class="totals-row balance"><span>Pendiente de pago</span><span>${fmt(balance, currency)}</span></div>
  </div>

  ${inv.notes ? `<div class="notes">${escapeHtml(inv.notes)}</div>` : ''}

  <!-- Payment details -->
  <div class="payment-box">
    <div class="payment-box-title">Datos de pago</div>
    <div class="payment-grid">
      <div class="payment-col">
        <strong>Transferencia bancaria</strong>
        ${BIZ.bank}<br>
        IBAN: ${BIZ.iban}<br>
        SWIFT/BIC: ${BIZ.swift}<br>
        <em style="color:#aaa;font-size:8pt;">Inside SEPA: send as a domestic transfer.</em>
      </div>
    </div>
    <div style="margin-top:8px;">
      <em style="color:#aaa;font-size:8pt;">Concepto: Factura #${inv.number} &nbsp;·&nbsp; Pago a 7 días</em>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>${BIZ.name} &nbsp;·&nbsp; Factura #${inv.number} &nbsp;·&nbsp; ${BIZ.email}</div>
    <div style="color:#0E71AC;font-weight:700">${fmt(balance, currency)} a pagar antes del ${fmtDate(inv.dueDate)}</div>
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
    body: JSON.stringify({
      source: html,
      format: 'A4',
      margin: '0',
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`PDFShift ${res.status}: ${detail.slice(0, 300)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
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
      clientAddress: data.client_address ?? undefined,
      clientPhone: data.client_phone ?? undefined,
      clientVat: data.client_vat ?? undefined,
      projectTitle: data.project_title ?? undefined,
      lineItems: data.line_items ?? [],
      taxes: data.taxes ?? 0, amountPaid: data.amount_paid ?? 0,
      currency: data.currency, status: data.status,
      notes: data.notes ?? undefined,
      issueDate: data.issue_date, dueDate: data.due_date,
      createdAt: data.created_at,
      proposalId: data.proposal_id ?? undefined,
    }

    let proposalRef: string | undefined
    if (data.proposal_id) {
      const { data: prop } = await sb.from('proposals').select('ref').eq('id', data.proposal_id).single()
      proposalRef = prop?.ref ?? undefined
    }

    const html = buildInvoiceHtml(inv, proposalRef)
    const pdf = await pdfShift(html)

    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Factura-${inv.number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'No se pudo generar el PDF', detail: message }, { status: 500 })
  }
}
