import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { escapeHtml } from '@/lib/escape-html'
import {
  EMAIL_FROM, OWNER_EMAIL, SITE_URL,
  documentShell, longDate, money, scrubClientCopy, shortDate,
} from '@/lib/email'

export const runtime = 'nodejs'

const FROM = EMAIL_FROM
const NOTIFY_EMAIL = OWNER_EMAIL

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { invoiceId, invoiceNumber, clientName, clientEmail, clientCompany, projectTitle, lineItems, taxes, amountPaid, currency, dueDate, issueDate, notes } = body
    if (!invoiceId) return NextResponse.json({ error: 'missing invoiceId' }, { status: 400 })

    const key = process.env.RESEND_API_KEY
    if (!key) return NextResponse.json({ ok: true, skipped: 'no key' })

    const eClientName = escapeHtml(clientName), eClientCompany = escapeHtml(clientCompany)
    const eClientEmail = escapeHtml(clientEmail), eProjectTitle = escapeHtml(projectTitle)
    const cleanNotes = scrubClientCopy(notes)
    const eNotes = escapeHtml(cleanNotes)

    const cur = typeof currency === 'string' && currency ? currency : 'EUR'
    const fmt = (n: number) => money(n, cur, money(0, cur))
    const items: { name?: string; description?: string; quantity: number; price: number }[] = Array.isArray(lineItems) ? lineItems : []
    const subtotal = items.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.price) || 0), 0)
    const taxAmount = Number(taxes) || 0
    const paidAmount = Number(amountPaid) || 0
    const total = subtotal + taxAmount
    const balance = total - paidAmount

    const numberLabel = String(invoiceNumber ?? '').trim()
    const eInvoiceNumber = escapeHtml(numberLabel)
    const dueLabelShort = shortDate(dueDate, 'on receipt')
    const dueLabelLong = longDate(dueDate, 'On receipt')
    const issueLabelLong = longDate(issueDate, longDate(new Date().toISOString(), ''))

    const lineRows = items.map(li => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E4F4FD;font-size:13.5px;">
          <div style="font-weight:600;color:#0C2A43;">${escapeHtml(scrubClientCopy(li.name) || 'Servicio')}</div>
          ${li.description ? `<div style="font-size:12px;color:#7b7288;margin-top:2px;">${escapeHtml(scrubClientCopy(li.description))}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4F4FD;text-align:center;font-size:13.5px;color:#5f5670;">${escapeHtml(String(li.quantity ?? 1))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4F4FD;text-align:right;font-size:13.5px;color:#5f5670;">${fmt(Number(li.price) || 0)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #E4F4FD;text-align:right;font-size:13.5px;font-weight:600;color:#0C2A43;">${fmt((Number(li.quantity) || 0) * (Number(li.price) || 0))}</td>
      </tr>`).join('')

    const card = `
<table role="presentation" class="e-wrap" cellpadding="0" cellspacing="0" border="0" width="640" style="width:640px;max-width:640px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#0C2A43;line-height:1.7;">
  <!-- Header -->
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#212A4D" style="background-color:#212A4D;border-radius:12px 12px 0 0;">
      <tr>
        <td class="e-hpad" style="padding:28px 32px;" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-right:14px;">
              <img src="${SITE_URL}/icon.png" width="52" height="52" alt="José Unstoppable" style="display:block;border:0;border-radius:11px;" />
            </td>
            <td valign="middle">
              <div class="e-brand" style="color:#ffffff;font-weight:800;font-size:16px;line-height:1.2;">José Unstoppable</div>
              <div style="color:#BFE6FA;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Factura</div>
            </td>
          </tr></table>
        </td>
        <td class="e-hpad" style="padding:28px 32px;text-align:right;" valign="middle" align="right">
          ${numberLabel ? `<div class="e-num" style="color:#ffffff;font-weight:800;font-size:20px;line-height:1.2;">#${eInvoiceNumber}</div>` : ''}
          <div style="color:#BFE6FA;font-size:12px;margin-top:4px;">Vence el ${escapeHtml(dueLabelShort)}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td class="e-body" bgcolor="#ffffff" style="background-color:#ffffff;padding:36px;border:1px solid #E4F4FD;border-top:none;border-radius:0 0 12px 12px;">
    <!-- Bill to -->
    <div style="margin-bottom:28px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#8b839a;margin-bottom:6px;">Facturar a</div>
      <div style="font-weight:700;font-size:15px;color:#0C2A43;">${eClientName}${clientCompany ? ` &middot; ${eClientCompany}` : ''}</div>
      <div style="font-size:13px;color:#5f5670;margin-top:2px;">${eClientEmail}</div>
    </div>

    <!-- Meta -->
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
      <tr>
        <td style="padding:6px 0;color:#7b7288;">Fecha de emisión</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;color:#0C2A43;">${escapeHtml(issueLabelLong)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#7b7288;">Vencimiento</td>
        <td style="padding:6px 0;text-align:right;font-weight:600;color:#0C2A43;">${escapeHtml(dueLabelLong)}</td>
      </tr>
      ${projectTitle ? `<tr><td style="padding:6px 0;color:#7b7288;">Concepto</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#0C2A43;">${eProjectTitle}</td></tr>` : ''}
    </table>

    <!-- Line items -->
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr bgcolor="#212A4D" style="background-color:#212A4D;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#E4F4FD;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Descripción</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;color:#E4F4FD;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Cant.</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#E4F4FD;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Precio</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;color:#E4F4FD;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <!-- Totals -->
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <tr><td style="padding:6px 0;color:#7b7288;font-size:13px;">Subtotal</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#0C2A43;">${fmt(subtotal)}</td></tr>
      ${taxAmount ? `<tr><td style="padding:6px 0;color:#7b7288;font-size:13px;">Impuestos</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#0C2A43;">${fmt(taxAmount)}</td></tr>` : ''}
      ${paidAmount ? `<tr><td style="padding:6px 0;color:#7b7288;font-size:13px;">Importe pagado</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#16a34a;">-${fmt(paidAmount)}</td></tr>` : ''}
      <tr>
        <td bgcolor="#212A4D" style="padding:14px 16px;background-color:#212A4D;font-weight:700;font-size:14px;color:#ffffff;border-radius:8px 0 0 8px;">Pendiente de pago</td>
        <td bgcolor="#212A4D" style="padding:14px 16px;background-color:#212A4D;text-align:right;font-weight:800;font-size:18px;color:#ffffff;border-radius:0 8px 8px 0;">${fmt(balance)}</td>
      </tr>
    </table>

    ${cleanNotes ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;"><tr><td bgcolor="#F1F8FD" style="background-color:#F1F8FD;border-left:3px solid #0E71AC;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#5f5670;">${eNotes}</td></tr></table>` : ''}

    <!-- CTA -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 28px;">
      <tr><td bgcolor="#0E71AC" style="background-color:#0E71AC;border-radius:100px;">
        <a href="${SITE_URL}/invoice/${encodeURIComponent(String(invoiceId))}" class="e-cta" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;padding:15px 32px;border-radius:100px;text-decoration:none;">Ver y pagar la factura</a>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#8b839a;text-align:center;margin:0 0 6px;">Plazo de pago: 7 días desde la fecha de la factura.</p>
    <p style="font-size:12px;color:#8b839a;text-align:center;margin:0;">José Unstoppable &middot; hola@joseunstoppable.com &middot; joseunstoppable.com</p>
  </td></tr>
</table>`

    const subjectNumber = numberLabel ? `#${numberLabel} ` : ''
    const html = documentShell({
      title: `Factura ${subjectNumber}de José Unstoppable`.trim(),
      preview: `${fmt(balance)}, vence el ${dueLabelLong.toLowerCase()}.`,
      card,
    })

    const sends = [
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [clientEmail],
          reply_to: NOTIFY_EMAIL,
          subject: `Factura ${subjectNumber}de José Unstoppable, ${fmt(balance)} pendiente`,
          html,
        }),
      }),
    ]

    await Promise.allSettled(sends)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo enviar la factura' }, { status: 500 })
  }
}
