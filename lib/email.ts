
import { escapeHtml } from './escape-html'

export const SITE_URL = 'https://joseunstoppable.com'

export const APPLY_URL = `${SITE_URL}/reserva`
export const APPLY_LABEL = 'Reserva tu llamada gratis'

export const EMAIL_FROM = process.env.EMAIL_FROM
  ?? 'José Unstoppable <hola@joseunstoppable.com>'
export const EMAIL_REPLY_TO = 'hola@joseunstoppable.com'

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'hola@joseunstoppable.com'
export const WHATSAPP_URL = 'https://wa.me/'
export const LOGO_URL = `${SITE_URL}/email-logo.png`

const FROM_ADDRESS = (EMAIL_FROM.match(/<([^>]+)>/)?.[1] ?? EMAIL_FROM).trim()
export const INTERNAL_FROM = process.env.EMAIL_FROM_INTERNAL ?? `Sistema José <${FROM_ADDRESS}>`

function isOwnerInbox(to: string): boolean {
  const t = to.trim().toLowerCase()
  return [OWNER_EMAIL, process.env.LEAD_NOTIFY_EMAIL ?? '']
    .some(o => o && o.trim().toLowerCase() === t)
}

export function fromFor(to: string): string {
  return isOwnerInbox(to) ? INTERNAL_FROM : EMAIL_FROM
}

const REPLY_TO = EMAIL_REPLY_TO

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY is not set, nothing was sent')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromFor(to), to: [to], reply_to: REPLY_TO, subject, html }),
    })
    if (!res.ok) {

      const body = await res.text().catch(() => '')
      console.error(`[email] Resend refused ${res.status} sending to ${to}: ${body.slice(0, 300)}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] send threw', err)
    return false
  }
}

export function money(value: unknown, currency = 'EUR', fallback = ''): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  const code = /^[A-Za-z]{3}$/.test(String(currency || '')) ? String(currency).toUpperCase() : 'EUR'
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: code, minimumFractionDigits: 2 }).format(n)
  } catch {
    return `${code} ${n.toFixed(2)}`
  }
}

export function moneyRounded(value: unknown, currency = 'EUR', fallback = ''): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  const code = /^[A-Za-z]{3}$/.test(String(currency || '')) ? String(currency).toUpperCase() : 'EUR'
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(n)
  } catch {
    return `${code} ${Math.round(n)}`
  }
}

export function longDate(value: unknown, fallback = ''): string {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback

  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function shortDate(value: unknown, fallback = ''): string {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function weekdayDate(value: unknown, fallback = ''): string {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw)
  if (Number.isNaN(d.getTime())) return fallback
  return d.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function firstNameOf(fullName: unknown, fallback = ''): string {
  const first = String(fullName ?? '').trim().split(/\s+/)[0]
  return first || fallback
}

export function orDash(value: unknown, fallback = 'No indicado'): string {
  const s = String(value ?? '').trim()
  return s && s !== 'undefined' && s !== 'null' ? s : fallback
}

const PARTNER_NAMES = /brand\s*archway/i

export function scrubClientCopy(value: unknown): string {
  const raw = String(value ?? '')
  if (!raw.trim()) return ''
  const cleaned = raw
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !PARTNER_NAMES.test(sentence))
    .join(' ')
  return cleaned
    .replace(/\s*—\s*/g, ', ')
    .replace(/(\d)\s*–\s*(\d)/g, '$1 to $2')
    .replace(/\s*–\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim()
}

// Brand palette (same blues as the site): deep navy into José's blue.
const TEXT = '#14263A'
const MUTED = '#4A5E72'
const FAINT = '#7A8A9A'
const CARD = '#FFFFFF'
const PAGE = '#EAF1F8'
const LINE = '#DCE6F0'
const TINT = '#F2F7FC'
const NAVY = '#0C2A43'
const BLUE = '#0E71AC'
const SKY = '#2A98D6'
const ACCENT = BLUE
const HEADER_GRADIENT = `linear-gradient(135deg,${NAVY} 0%,${BLUE} 58%,${SKY} 100%)`
const BUTTON_GRADIENT = `linear-gradient(135deg,${SKY} 0%,${BLUE} 100%)`
const FONT = `'Plus Jakarta Sans',Helvetica,Arial,sans-serif`
export const AVATAR_URL = `${SITE_URL}/images/jose-avatar.jpg`

export function preheader(text: string): string {
  return `<div style="display:none;font-size:1px;color:${CARD};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(text)}${'&#8199;&#65279;&#847; '.repeat(30)}</div>`
}

export type EmailCta = { label: string; href: string }

export function button(cta: EmailCta): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:30px auto 10px;">
  <tr><td bgcolor="${BLUE}" style="background-color:${BLUE};background-image:${BUTTON_GRADIENT};border-radius:999px;box-shadow:0 10px 24px rgba(14,113,172,.32);">
    <a href="${cta.href}" class="e-btn" style="display:inline-block;padding:18px 42px;font-family:${FONT};font-size:16px;font-weight:800;letter-spacing:.2px;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(cta.label)}&nbsp;&nbsp;&rarr;</a>
  </td></tr>
</table>`
}

export function linkLine(label: string, href: string): string {
  return `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;color:${MUTED};">${escapeHtml(label)}</p>
<p style="margin:0 0 24px;font-family:${FONT};font-size:12.5px;color:${ACCENT};word-break:break-all;">${href}</p>`
}

export function signature(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;">
  <tr>
    <td style="padding-right:14px;vertical-align:middle;"><img src="${AVATAR_URL}" alt="José" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:50%;border:2px solid ${LINE};" /></td>
    <td style="vertical-align:middle;font-family:${FONT};">
      <div style="font-size:15px;line-height:1.4;color:${TEXT};">Un abrazo,</div>
      <div style="font-size:16px;font-weight:800;color:${TEXT};">José</div>
      <div style="font-size:13px;color:${MUTED};">Tu coach · José Unstoppable</div>
    </td>
  </tr>
</table>`
}

// Numbered steps ("what happens next"), the backbone of the client emails.
export function steps(items: Array<[string, string]>): string {
  const rows = items.map(([title, text], i) => `<tr>
    <td style="width:44px;padding:0 14px 18px 0;vertical-align:top;">
      <div style="width:36px;height:36px;line-height:36px;border-radius:50%;background-color:${TINT};border:1px solid ${LINE};text-align:center;font-family:${FONT};font-size:14px;font-weight:800;color:${BLUE};">${i + 1}</div>
    </td>
    <td style="padding:0 0 18px;vertical-align:top;font-family:${FONT};">
      <div style="font-size:15.5px;font-weight:800;color:${TEXT};line-height:1.4;padding-top:7px;">${escapeHtml(title)}</div>
      <div style="font-size:14px;line-height:1.6;color:${MUTED};">${escapeHtml(text)}</div>
    </td>
  </tr>`).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 4px;">${rows}</table>`
}

export function detailRows(rows: Array<[string, unknown]>): string {
  const body = rows
    .filter(([, v]) => String(v ?? '').trim())
    .map(([k, v], i) => `<tr>
      <td class="e-row-label" style="padding:11px 16px 11px 18px;font-family:${FONT};font-size:13px;color:${FAINT};vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${escapeHtml(k)}</td>
      <td class="e-row-value" style="padding:11px 18px 11px 0;font-family:${FONT};font-size:14.5px;font-weight:700;color:${TEXT};${i ? `border-top:1px solid ${LINE};` : ''}">${escapeHtml(String(v))}</td>
    </tr>`)
    .join('')
  return body ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${TINT}" style="border-collapse:separate;width:100%;margin:6px 0 22px;background-color:${TINT};border:1px solid ${LINE};border-radius:14px;">${body}</table>` : ''
}

export function quoteBlock(label: string, text: string): string {
  if (!String(text ?? '').trim()) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
  <tr><td bgcolor="${TINT}" style="background-color:${TINT};border:1px solid ${LINE};border-left:4px solid ${BLUE};border-radius:0 12px 12px 0;padding:16px 18px;">
    <div style="font-family:${FONT};font-size:10.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${BLUE};margin-bottom:6px;">${escapeHtml(label)}</div>
    <div style="font-family:${FONT};font-size:14.5px;line-height:1.7;color:${TEXT};white-space:pre-wrap;">${escapeHtml(text)}</div>
  </td></tr>
</table>`
}

export type ShellOptions = {

  title: string

  preview: string

  body: string
  cta?: EmailCta

  note?: string

  showFooterLinks?: boolean

  // Small label above the title, e.g. "Bienvenido/a al programa".
  eyebrow?: string

  // "Un abrazo, José" with his photo, after the button.
  signOff?: boolean
}

export function emailShell(o: ShellOptions): string {
  const cta = o.cta ? button(o.cta) : ''
  const note = o.note
    ? `<p style="margin:22px 0 0;font-family:${FONT};font-size:12.5px;line-height:1.7;color:${FAINT};">${o.note}</p>`
    : ''
  const footLink = (href: string, label: string) => `<a href="${href}" style="color:#BFE3F7;text-decoration:none;font-weight:700;">${label}</a>`
  const footerLinks = o.showFooterLinks === false
    ? ''
    : `<div style="font-family:${FONT};font-size:12.5px;margin:0 0 10px;">
         ${footLink(`${SITE_URL}/reserva`, 'Reserva tu llamada')}&nbsp;&nbsp;<span style="color:#4F7593;">&middot;</span>&nbsp;&nbsp;${footLink(`${SITE_URL}/masterclass`, 'Masterclass')}&nbsp;&nbsp;<span style="color:#4F7593;">&middot;</span>&nbsp;&nbsp;${footLink('https://www.instagram.com/joseunstoppable/', 'Instagram')}
       </div>`
  const eyebrow = o.eyebrow
    ? `<div style="display:inline-block;font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#ffffff;background-color:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:6px 12px;margin:0 0 14px;">${escapeHtml(o.eyebrow)}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme:light;supported-color-schemes:light;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body, table, td, div, p, a, h1, h2, h3 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  /* Most of these are read on a phone: full-width card, thumb-sized button,
     label/value rows stacked instead of squeezed. */
  @media only screen and (max-width:620px) {
    .e-card { width:100% !important; border-radius:0 !important; }
    .e-outer { padding:0 !important; }
    .e-pad  { padding-left:22px !important; padding-right:22px !important; }
    .e-head { padding:30px 22px 34px !important; border-radius:0 !important; }
    .e-foot { border-radius:0 !important; }
    .e-btn  { display:block !important; width:100% !important; box-sizing:border-box !important;
              padding-top:18px !important; padding-bottom:18px !important; font-size:17px !important; text-align:center !important; }
    .e-row-label { display:block !important; width:100% !important; padding:12px 18px 0 !important; }
    .e-row-value { display:block !important; width:100% !important; padding:2px 18px 12px !important; border-top:0 !important; }
    .e-title { font-size:26px !important; line-height:1.2 !important; }
  }
  a, p, td { word-break:break-word; overflow-wrap:break-word; }
  p { margin:0 0 16px; }
</style>
</head>
<body bgcolor="${PAGE}" style="margin:0;padding:0;width:100%;background-color:${PAGE};color:${TEXT};font-family:${FONT};">
${preheader(o.preview)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${PAGE}" style="background-color:${PAGE};">
  <tr><td align="center" class="e-outer" style="padding:36px 16px;">
    <table role="presentation" class="e-card" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${CARD};border-radius:24px;box-shadow:0 18px 50px rgba(12,42,67,.12);">

      <tr><td bgcolor="${BLUE}" class="e-head" style="background-color:${BLUE};background-image:${HEADER_GRADIENT};padding:34px 40px 40px;border-radius:24px 24px 0 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 30px;">
          <tr>
            <td style="vertical-align:middle;width:46px;"><img src="${LOGO_URL}" alt="" width="38" height="38" style="display:block;width:38px;height:38px;border-radius:10px;border:1px solid rgba(255,255,255,.25);" /></td>
            <td style="vertical-align:middle;font-family:${FONT};font-size:13px;letter-spacing:2.4px;text-transform:uppercase;color:#ffffff;"><span style="font-weight:800;">José</span> <span style="font-weight:500;opacity:.85;">Unstoppable</span></td>
          </tr>
        </table>
        ${eyebrow}
        <div class="e-title" style="font-family:${FONT};font-size:30px;font-weight:800;line-height:1.18;letter-spacing:-.4px;color:#ffffff;">${escapeHtml(o.title)}</div>
        ${o.preview && o.preview !== o.title ? `<div style="font-family:${FONT};font-size:15px;line-height:1.6;color:rgba(255,255,255,.82);margin-top:10px;">${escapeHtml(o.preview)}</div>` : ''}
      </td></tr>

      <tr><td bgcolor="${CARD}" class="e-pad" style="background-color:${CARD};padding:36px 40px 34px;font-family:${FONT};font-size:16px;line-height:1.7;color:${TEXT};">
        ${o.body}
        ${cta}
        ${note}
        ${o.signOff ? signature() : ''}
      </td></tr>

      <tr><td bgcolor="${NAVY}" class="e-pad e-foot" style="background-color:${NAVY};padding:26px 40px 28px;text-align:center;border-radius:0 0 24px 24px;">
        ${footerLinks}
        <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:#9DB4C8;">
          José Unstoppable &middot; Coaching de transformación física<br>
          <a href="mailto:${EMAIL_REPLY_TO}" style="color:#9DB4C8;text-decoration:underline;">${EMAIL_REPLY_TO}</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function documentShell(o: { title: string; preview: string; card: string }): string {
  return `<!DOCTYPE html>
<html lang="es" style="color-scheme:light;supported-color-schemes:light;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(o.title)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  @media only screen and (max-width:640px) {
    .e-wrap { width:100% !important; }
    .e-hpad { padding:22px 20px !important; }
    .e-body { padding:24px 20px !important; }
    .e-num { font-size:17px !important; }
    .e-brand { font-size:15px !important; }
    .e-cta { display:block !important; width:100% !important; box-sizing:border-box !important; }
  }
</style>
</head>
<body bgcolor="${PAGE}" style="margin:0;padding:0;width:100%;background-color:${PAGE};color:${TEXT};font-family:Helvetica,Arial,sans-serif;">
${preheader(o.preview)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${PAGE}" style="background-color:${PAGE};">
  <tr><td align="center" style="padding:32px 16px;">${o.card}</td></tr>
</table>
</body>
</html>`
}

export function wrapEmail(title: string, bodyHtml: string, cta?: EmailCta, preview?: string, eyebrow?: string): string {
  return emailShell({ title, preview: preview || title, body: bodyHtml, cta, eyebrow })
}
