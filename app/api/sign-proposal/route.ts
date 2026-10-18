import { SITE_URL, WHATSAPP_URL } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml } from '@/lib/escape-html'
import { EMAIL_FROM, INTERNAL_FROM, OWNER_EMAIL, documentShell, longDate, moneyRounded, scrubClientCopy } from '@/lib/email'
import { isResultsBased, proposalLang, resultsTiers } from '@/lib/results-billing'

export const runtime = 'nodejs'
export const maxDuration = 60

const FROM = EMAIL_FROM
const NOTIFY_EMAIL = OWNER_EMAIL

function randHex(bytes: number): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  let s = ''
  for (const b of a) s += b.toString(16).padStart(2, '0')
  return s
}

async function buildSignedPdf(req: NextRequest, token: string, signer: string, date: string): Promise<string | null> {
  if (!token) return null
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get('host')}`
    const q = new URLSearchParams({ token, signed: '1', signer, date })
    const res = await fetch(`${base}/api/proposal-pdf?${q.toString()}`)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer()).toString('base64')
  } catch {
    return null
  }
}

async function sendEmail(key: string, payload: Record<string, unknown>) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const token: string = typeof body.token === 'string' ? body.token : ''
    const signerNameRaw: string = typeof body.signerName === 'string' ? body.signerName.slice(0, 120) : ''
    const signerEmailRaw: string = typeof body.signerEmail === 'string' ? body.signerEmail.slice(0, 254) : ''

    const sigImgRaw: string | null = (
      typeof body.signatureImg === 'string' &&
      body.signatureImg.startsWith('data:image/png;base64,') &&
      body.signatureImg.length < 200_000
    ) ? body.signatureImg : null
    if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })
    if (signerEmailRaw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(signerEmailRaw)) {
      return NextResponse.json({ error: 'invalid signer email' }, { status: 400 })
    }

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!sbUrl || !sbKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 })
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(sbUrl, sbKey)
    const { data: rows } = await sb.from('proposals').select('*').eq('token', token).limit(1)
    const p = rows && rows.length ? rows[0] : null
    if (!p) return NextResponse.json({ error: 'proposal not found' }, { status: 404 })

    const currentStatus = String(p.status ?? '')
    if (currentStatus === 'void' || currentStatus === 'declined') {
      return NextResponse.json({
        error: 'Este acuerdo ya no está activo. Escribe a José para recibir uno actualizado.',
      }, { status: 409 })
    }

    const proposalId: string = p.id
    const proposalRef: string = p.ref ?? ''
    const clientName: string = p.client_name ?? ''
    const clientEmail: string = p.client_email ?? ''
    const clientCompany: string = p.client_company ?? ''

    const clientPhone: string = p.client_phone ?? ''
    const clientAddress: string = p.client_address ?? ''
    const title: string = p.title ?? ''
    const total = p.total ?? ''
    const currency: string = p.currency ?? 'USD'
    const bankInfo: string = p.bank_info ?? ''

    const payMethods: string[] | null = Array.isArray(p.payment_methods) ? p.payment_methods : null

    const storedSigner = String(p.signer_name ?? '').trim()
    const signerName: string = (currentStatus === 'signed' && storedSigner)
      ? storedSigner
      : (signerNameRaw || clientName)
    const signerEmail: string = signerEmailRaw || clientEmail

    const schedule = Array.isArray(p.payment_schedule) ? p.payment_schedule : []
    const firstPhase = schedule[0] ?? null
    const monthlyAmount: number = firstPhase?.amount ?? (typeof total === 'number' ? total : Number(total) || 0)

    const evenSchedule = schedule.length > 1
      && schedule.every((m: { amount?: number }) => (m.amount ?? 0) === (schedule[0].amount ?? 0))
    const isOneTime: boolean = typeof p.one_time === 'boolean' ? p.one_time : !evenSchedule

    const results = isResultsBased({ paymentSchedule: schedule })
    const lang = proposalLang({ paymentSchedule: schedule })
    const es = lang === 'es'
    const tierLine = () => resultsTiers(schedule)
      .map(t => !Number.isFinite(t.to)
        ? (es ? `${fmtMoney(t.price)} por cliente nuevo que pague` : `${fmtMoney(t.price)} per new paying client`)
        : es ? `${fmtMoney(t.price)} por cliente (${t.from} a ${t.to})` : `${fmtMoney(t.price)} per client (${t.from} to ${t.to})`)
      .join(', ')
    const feeLabel = results ? (es ? 'Pago' : 'Payment') : isOneTime ? 'Importe' : 'Cuota mensual'
    const feeValue = (n: number) => results
      ? (es ? `Nada por adelantado. ${tierLine()}` : `Nothing upfront. ${tierLine()}`)
      : (isOneTime ? fmtMoney(n) : `${fmtMoney(n)}/mes`)

    const fmtMoney = (n: number) => moneyRounded(n, currency, 'por confirmar')

    const signedAtDate = p.signed_at ? new Date(String(p.signed_at)) : new Date()
    const signedAt = (Number.isNaN(signedAtDate.getTime()) ? new Date() : signedAtDate).toLocaleString('es-ES', {
      timeZone: 'Europe/Madrid', month: 'long', day: 'numeric',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const alreadySigned = currentStatus === 'signed' && !!p.signed_at
    if (!alreadySigned) {

      const updatePayload: Record<string, unknown> = { status: 'signed', signed_at: new Date().toISOString(), signer_name: signerName }
      if (sigImgRaw) updatePayload.signer_signature = sigImgRaw
      await sb.from('proposals').update(updatePayload).eq('token', token)
    }


    let invoiceNumber: string | null = null
    let invoiceId: string | null = null
    let invoiceDueStr: string | null = null

    let invoiceError: string | null = null
    const invoiceLabel: string = firstPhase?.label ?? 'First month retainer'
    try {
      const { data: existingInv } = await sb.from('invoices').select('id, number, due_date').eq('proposal_id', proposalId).eq('phase_index', 0).limit(1)
      if (existingInv && existingInv.length) {
        invoiceNumber = existingInv[0].number
        invoiceId = existingInv[0].id
        invoiceDueStr = existingInv[0].due_date ?? null
        if (!p.linked_invoice_id) await sb.from('proposals').update({ linked_invoice_id: existingInv[0].id }).eq('id', proposalId)
      } else if (firstPhase && !results && (Number(firstPhase.amount) || 0) > 0) {

        const { data: allInv } = await sb.from('invoices').select('number')
        const nums = (allInv ?? []).map(r => parseInt(r.number, 10)).filter(n => !isNaN(n))
        invoiceNumber = nums.length ? String(Math.max(...nums) + 1) : `${new Date().getFullYear()}126`
        const invId = randHex(12)
        const today = new Date()
        const due = new Date(today); due.setDate(due.getDate() + 7)
        invoiceDueStr = due.toISOString().slice(0, 10)
        const lineId = randHex(8)
        const invRow = {
          id: invId, number: invoiceNumber,
          payment_methods: payMethods,
          client_name: clientName, client_email: clientEmail, client_company: clientCompany || null,
          client_phone: clientPhone || null, client_address: clientAddress || null,
          project_title: title,

          line_items: [{
            id: lineId,
            name: title,
            description: schedule.length > 1
              ? `${firstPhase.label}. Alcance y calendario completos en la propuesta firmada ${proposalRef}.`
              : `Según lo acordado en la propuesta firmada ${proposalRef}.`,
            quantity: 1,
            price: firstPhase.amount,
          }],
          taxes: 0, amount_paid: 0, currency, status: 'sent',
          notes: [
            schedule.length > 1
              ? `${firstPhase.label} de ${schedule.length}, según el acuerdo firmado.`
              : 'Pago completo, según el acuerdo firmado.',
            token ? `La propuesta firmada, con el alcance y el calendario completos: ${SITE_URL}/proposal/${token}` : '',
            'Firmada el ' + signedAt + '.',
          ].filter(Boolean).join('\n'),
          issue_date: today.toISOString().slice(0, 10), due_date: invoiceDueStr,
          created_at: today.toISOString(), sent_at: today.toISOString(), paid_at: null,
          proposal_id: proposalId, phase_index: 0,
        }

        let row: Record<string, unknown> = { ...invRow }
        let invErr = (await sb.from('invoices').insert(row)).error
        for (let attempt = 0; attempt < 4 && invErr; attempt++) {
          const missing = /'([^']+)' column/.exec(invErr.message)?.[1]
          if (!missing || !(missing in row)) break
          console.error(`sign-proposal: invoices.${missing} does not exist. Retrying without it, and a Supabase migration is pending.`)
          const stripped: Record<string, unknown> = {}
          for (const k of Object.keys(row)) if (k !== missing) stripped[k] = row[k]
          row = stripped
          invErr = (await sb.from('invoices').insert(row)).error
        }
        if (invErr) {

          invoiceError = invErr.message
          invoiceNumber = null
          console.error('sign-proposal: could not create the first invoice', invErr)
        } else {
          invoiceId = invId
          await sb.from('proposals').update({ linked_invoice_id: invId }).eq('id', proposalId)
        }
      }
    } catch (err) {

      invoiceError = String(err)
      invoiceNumber = null
      console.error('sign-proposal: invoice creation failed', err)
    }

    const key = process.env.RESEND_API_KEY
    if (key) {
      const firstName = escapeHtml(String(signerName || clientName || '').trim().split(/\s+/)[0] || 'there')
      const eRef = escapeHtml(proposalRef || 'your agreement')

      const cleanTitle = scrubClientCopy(title) || 'our engagement'
      const eTitle = escapeHtml(cleanTitle)
      const eClientName = escapeHtml(clientName)
      const eClientCompany = escapeHtml(clientCompany)
      const eSignerName = escapeHtml(signerName)
      const eSignerEmail = escapeHtml(signerEmail)
      const eClientEmail = escapeHtml(clientEmail)

      const resultsClientHtml = documentShell({
        title: es ? `Firmado y confirmado: ${proposalRef || 'tu acuerdo'}` : `Signed and confirmed: ${proposalRef || 'your agreement'}`,
        preview: es ? 'Tu acuerdo está firmado. No hay nada que pagar hoy.' : 'Your agreement is signed. Nothing to pay today.',
        card: `
<table role="presentation" class="e-wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#0C2A43;line-height:1.75;">
  <tr><td class="e-hpad" bgcolor="#212A4D" style="background-color:#212A4D;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="https://joseunstoppable.com/icon.png" width="64" height="64" alt="José Unstoppable" style="border:0;border-radius:13px;display:block;margin:0 auto 12px;" />
    <div style="color:#BFE6FA;font-size:11px;font-weight:700;letter-spacing:3px;">José Unstoppable</div>
  </td></tr>
  <tr><td class="e-body" bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 32px;border:1px solid #E4F4FD;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="font-size:22px;font-weight:800;color:#0C2A43;margin:0 0 12px;">${es ? `Listo, ${firstName}.` : `You are in, ${firstName}.`}</h2>
    <p style="color:#4a4359;margin:0 0 20px;">${es ? `Tu acuerdo <strong>${eTitle}</strong> está firmado y recibido. Este es el resumen:` : `Your agreement for <strong>${eTitle}</strong> has been signed and received. Here is the summary:`}</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">${es ? 'Referencia' : 'Reference'}</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;border-bottom:1px solid #E4F4FD;text-align:right;">${eRef}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">${es ? 'Cliente' : 'Client'}</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;border-bottom:1px solid #E4F4FD;text-align:right;">${eClientName}${clientCompany ? ` / ${eClientCompany}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">${escapeHtml(feeLabel)}</td><td style="padding:8px 0;font-weight:600;color:#0E71AC;border-bottom:1px solid #E4F4FD;text-align:right;">${escapeHtml(feeValue(0))}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;">${es ? 'Firmado' : 'Signed'}</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;text-align:right;">${escapeHtml(signedAt)} (hora de España)</td></tr>
    </table>
    <p style="color:#4a4359;margin:0 0 8px;">${es
      ? 'Hoy no hay nada que pagar. Cada mes te envío una factura solo por los clientes nuevos que entraron por el sistema, según los tramos del acuerdo.'
      : 'There is nothing to pay today. Each month I send you an invoice only for the new clients the system brought in, at the tiers in the agreement.'}</p>
    <p style="color:#4a4359;margin:0 0 8px;">${es
      ? 'Para empezar, rellena el formulario de inicio en joseunstoppable.com/onboarding y te escribo por WhatsApp para la primera llamada.'
      : 'To start I need: your Claude Pro account, admin access to your Facebook page, and the details of your offer and what your clients struggle with most. With that we book the first session.'}</p>
    <p style="color:#4a4359;margin:0 0 24px;">${es ? 'Tu copia firmada va adjunta. Cualquier duda, responde a este correo o escríbeme por WhatsApp.' : 'Your signed copy is attached. Any question, reply to this email or message me on WhatsApp.'}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#25D366" style="background-color:#25D366;border-radius:100px;">
      <a href="${WHATSAPP_URL}" class="e-cta" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;padding:14px 26px;border-radius:100px;text-decoration:none;">${es ? 'Escribir a José por WhatsApp' : 'Message José on WhatsApp'}</a>
    </td></tr></table>
    <p style="margin:32px 0 0;font-size:12px;color:#8b839a;">José Unstoppable &middot; hola@joseunstoppable.com &middot; joseunstoppable.com</p>
  </td></tr>
</table>`,
      })

      const clientHtml = documentShell({
        title: `Firmado y confirmado: ${proposalRef || 'tu acuerdo'}`,
        preview: `Tu acuerdo ${cleanTitle} está firmado. La primera factura llega en otro email.`,
        card: `
<table role="presentation" class="e-wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#0C2A43;line-height:1.75;">
  <tr><td class="e-hpad" bgcolor="#212A4D" style="background-color:#212A4D;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="https://joseunstoppable.com/icon.png" width="64" height="64" alt="José Unstoppable" style="border:0;border-radius:13px;display:block;margin:0 auto 12px;" />
    <div style="color:#BFE6FA;font-size:11px;font-weight:700;letter-spacing:3px;">José Unstoppable</div>
  </td></tr>
  <tr><td class="e-body" bgcolor="#ffffff" style="background-color:#ffffff;padding:36px 32px;border:1px solid #E4F4FD;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="font-size:22px;font-weight:800;color:#0C2A43;margin:0 0 12px;">Listo, ${firstName}.</h2>
    <p style="color:#4a4359;margin:0 0 20px;">Tu acuerdo <strong>${eTitle}</strong> está firmado y recibido. Este es el resumen:</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:24px;">
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">Referencia</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;border-bottom:1px solid #E4F4FD;text-align:right;">${eRef}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">Cliente</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;border-bottom:1px solid #E4F4FD;text-align:right;">${eClientName}${clientCompany ? ` / ${eClientCompany}` : ''}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">Programa</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;border-bottom:1px solid #E4F4FD;text-align:right;">${eTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">${feeLabel}</td><td style="padding:8px 0;font-weight:700;color:#0E71AC;border-bottom:1px solid #E4F4FD;text-align:right;">${escapeHtml(feeValue(monthlyAmount))}</td></tr>
      <tr><td style="padding:8px 0;color:#7b7288;">Firmado</td><td style="padding:8px 0;font-weight:600;color:#0C2A43;text-align:right;">${escapeHtml(signedAt)} (hora de España)</td></tr>
    </table>
    <p style="color:#4a4359;margin:0 0 8px;">Tu primera factura llega ahora en otro email, con los datos de pago. En cuanto se confirme, empezamos en un plazo de 48 horas.</p>
    <p style="color:#4a4359;margin:0 0 24px;">¿Alguna duda mientras tanto? Responde a este correo o escríbeme por WhatsApp.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#25D366" style="background-color:#25D366;border-radius:100px;">
      <a href="${WHATSAPP_URL}" class="e-cta" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;padding:14px 26px;border-radius:100px;text-decoration:none;">Escribir a José por WhatsApp</a>
    </td></tr></table>
    <p style="margin:32px 0 0;font-size:12px;color:#8b839a;">José Unstoppable &middot; hola@joseunstoppable.com &middot; joseunstoppable.com</p>
  </td></tr>
</table>`,
      })

      const notifyHtml = documentShell({
        title: `Propuesta firmada: ${proposalRef}`,
        preview: `${clientName} firmó ${cleanTitle}.`,
        card: `
<table role="presentation" class="e-wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #E4F4FD;border-radius:12px;padding:28px 32px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#0C2A43;line-height:1.7;">
    <h2 style="font-size:20px;color:#0C2A43;margin:0 0 16px;">Propuesta firmada: ${eRef}</h2>
    <table role="presentation" style="border-collapse:collapse;font-size:14px;width:100%;">
      ${[
        ['Cliente', `${eClientName}${clientCompany ? ` / ${eClientCompany}` : ''}`],
        ['Email', eClientEmail],
        ['Firmado por', `${eSignerName} (${eSignerEmail})`],
        ['Título', eTitle],
        [feeLabel, escapeHtml(feeValue(monthlyAmount))],
        ['ID de propuesta', escapeHtml(proposalId ?? proposalRef)],
        ['Firmado el', `${escapeHtml(signedAt)} (hora de España)`],
      ].map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#7b7288;white-space:nowrap;">${k}</td><td style="padding:6px 0;font-weight:600;color:#0C2A43;">${v}</td></tr>`).join('')}
    </table>
    ${invoiceError
      ? `<p style="margin-top:20px;padding:14px 16px;background:#fff4f4;border:1px solid #f5c2c2;border-radius:8px;color:#8a1c1c;font-size:13px;line-height:1.6;"><strong>La factura NO se creó y no se ha cobrado al cliente.</strong><br>${escapeHtml(invoiceError)}<br><br>La copia firmada va adjunta y el acuerdo sigue en pie. Crea la factura a mano: /admin/proposals, abre ${eRef} y luego Convert to invoice.</p>`
      : !invoiceId
        ? `<p style="margin-top:20px;color:#8b839a;font-size:12px;">${results ? 'Pago por resultados: no se cobró nada al firmar. Cada mes, abre esta propuesta en /admin/proposals y usa Facturar clientes nuevos para crear la comisión en borrador.' : 'No hay nada que pagar al firmar, así que no se creó factura.'} La copia firmada va adjunta.</p>`
        : `<p style="margin-top:20px;color:#8b839a;font-size:12px;">La primera factura ${invoiceNumber ? `(#${escapeHtml(invoiceNumber)}) ` : ''}se generó y se envió al cliente automáticamente. La copia firmada va adjunta. Gestiónala en /admin/invoices.</p>`}
  </td></tr>
</table>`,
      })

      const eInvNum = escapeHtml(invoiceNumber ?? '')
      const eInvLabel = escapeHtml(scrubClientCopy(invoiceLabel) || 'Primer pago')
      const eBank = escapeHtml(bankInfo)
      const invDueLabel = longDate(invoiceDueStr, '')
      const invoiceHtml = documentShell({
        title: `Tu primera factura de José Unstoppable`,
        preview: `${fmtMoney(monthlyAmount)}${invDueLabel ? `, vence el ${invDueLabel}` : ''}. Dentro tienes los datos de pago.`,
        card: `
<table role="presentation" class="e-wrap" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#0C2A43;line-height:1.7;">
  <tr><td bgcolor="#212A4D" style="background-color:#212A4D;padding:26px 30px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="https://joseunstoppable.com/icon.png" width="56" height="56" alt="José Unstoppable" style="border:0;border-radius:12px;display:block;margin:0 auto 10px;" />
    <div style="color:#BFE6FA;font-size:11px;font-weight:700;letter-spacing:2px;">Factura${eInvNum ? ` #${eInvNum}` : ''}</div>
  </td></tr>
  <tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:34px 30px;border:1px solid #E4F4FD;border-top:none;border-radius:0 0 12px 12px;">
    <p style="color:#4a4359;margin:0 0 20px;">Hola ${firstName}, aquí tienes tu primera factura de <strong>${eTitle}</strong>.</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:22px;">
      <tr><td style="padding:9px 0;color:#7b7288;border-bottom:1px solid #E4F4FD;">${eInvLabel}</td><td style="padding:9px 0;font-weight:700;color:#0E71AC;border-bottom:1px solid #E4F4FD;text-align:right;">${escapeHtml(fmtMoney(monthlyAmount))}</td></tr>
      ${invDueLabel ? `<tr><td style="padding:9px 0;color:#7b7288;">Vence</td><td style="padding:9px 0;font-weight:600;color:#0C2A43;text-align:right;">${escapeHtml(invDueLabel)}</td></tr>` : ''}
    </table>
    ${bankInfo ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;"><tr><td><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#8b839a;margin-bottom:8px;">Datos de pago</div><div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#4a4359;white-space:pre-wrap;background:#F1F8FD;border:1px solid #E4F4FD;border-radius:8px;padding:14px 16px;line-height:1.8;">${eBank}</div></td></tr></table>` : ''}
    ${invoiceId ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px;"><tr><td bgcolor="#0E71AC" style="background-color:#0E71AC;border-radius:100px;"><a href="https://joseunstoppable.com/invoice/${encodeURIComponent(invoiceId)}" style="display:inline-block;color:#ffffff;font-weight:700;font-size:15px;padding:14px 30px;border-radius:100px;text-decoration:none;">View and pay invoice</a></td></tr></table>` : ''}
    <p style="margin:0;font-size:12px;color:#8b839a;text-align:center;">Plazo de pago: 7 días.</p>
    <p style="margin:6px 0 0;font-size:12px;color:#8b839a;text-align:center;">José Unstoppable &middot; hola@joseunstoppable.com</p>
  </td></tr>
</table>`,
      })

      const signedPdfBase64 = await buildSignedPdf(req, token, signerName || clientName, `${signedAt} (hora de España)`)
      const refSlug = (proposalRef || 'agreement').replace(/[^A-Za-z0-9._-]+/g, '-')
      const signedAttachments = signedPdfBase64
        ? [{ filename: `Propuesta-${refSlug}-signed.pdf`, content: signedPdfBase64 }]
        : undefined

      const kickName = (clientName || '').trim().split(/\s+/)[0] || 'there'
      const company = (clientCompany || '').trim()
      const forCompany = company ? ` for ${escapeHtml(company)}` : ''
      const kickoffHtml = documentShell({
        title: 'Próximos pasos',
        preview: 'Rellena el formulario de inicio y empezamos.',
        card: `
    <p style="margin:0 0 16px;font-size:15.5px;line-height:1.7;color:#2f2a3d;">Hola ${escapeHtml(kickName)},</p>
    <p style="margin:0 0 16px;font-size:15.5px;line-height:1.7;color:#2f2a3d;">Gracias por confiar en mí. A partir de ahora vamos juntos a por ello.</p>
    <p style="margin:0 0 16px;font-size:15.5px;line-height:1.7;color:#2f2a3d;"><strong>Paso 1:</strong> rellena el formulario de inicio. Son unos minutos y con tus respuestas preparo tu plan de entreno y de nutrición: <a href="${SITE_URL}/onboarding?nombre=${encodeURIComponent(kickName)}" style="color:#0E71AC;font-weight:600;">${SITE_URL}/onboarding</a></p>
    <p style="margin:0 0 16px;font-size:15.5px;line-height:1.7;color:#2f2a3d;"><strong>Paso 2:</strong> en cuanto se confirme el pago te escribo por WhatsApp para darte acceso a la app y agendar nuestra primera llamada.</p>
    <p style="margin:0 0 6px;font-size:15.5px;line-height:1.7;color:#2f2a3d;">Cualquier duda, responde a este correo.</p>
    <p style="margin:0;font-size:15.5px;line-height:1.7;color:#2f2a3d;">José</p>`,
      })

      const sends = [
        sendEmail(key, {
          from: FROM,
          to: [clientEmail],
          reply_to: NOTIFY_EMAIL,
          subject: `Firmado y confirmado: ${proposalRef || cleanTitle}`,

          html: results
            ? resultsClientHtml
            : clientHtml.replace('</table>', '') + kickoffHtml.replace(/^[\s\S]*?<table/, '<table'),
          ...(signedAttachments ? { attachments: signedAttachments } : {}),
        }),
        sendEmail(key, {
          from: INTERNAL_FROM,
          to: [NOTIFY_EMAIL],
          subject: `Propuesta firmada: ${proposalRef || cleanTitle}, ${clientName || signerEmail}`,
          html: notifyHtml,
          ...(signedAttachments ? { attachments: signedAttachments } : {}),
        }),
      ]

      if (invoiceId) {
        sends.push(sendEmail(key, {
          from: FROM,
          to: [clientEmail],
          reply_to: NOTIFY_EMAIL,
          subject: `Tu primera factura${invoiceNumber ? ` #${invoiceNumber}` : ''} de José Unstoppable`,
          html: invoiceHtml,
        }))
      }
      await Promise.allSettled(sends)
    }

    return NextResponse.json({ ok: true, invoiceNumber, invoiceId })
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la firma' }, { status: 500 })
  }
}
