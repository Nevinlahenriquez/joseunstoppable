'use client'

import { useEffect, useState } from 'react'
import { copyText } from '@/lib/clipboard'
import { DEFAULT_PAYMENT_SETTINGS, paymentText, revolutLink, type PaymentSettings } from '@/lib/payment-settings'

// "Cómo te pagan": José pastes his Revolut link once and it shows on every
// invoice, with Bizum and the bank account as the other ways to pay.
export function PaymentSettingsCard() {
  const [s, setS] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetch('/api/payment-settings').then(r => r.json()).then(d => {
      if (d?.settings) {
        setS(d.settings)
        setEditing(!d.settings.revolutUrl && !d.settings.iban && !d.settings.bizum)
      }
    }).catch(() => setEditing(true)).finally(() => setLoaded(true))
  }, [])

  const set = (k: keyof PaymentSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS(p => ({ ...p, [k]: e.target.value }))
  const rev = revolutLink(s.revolutUrl)
  const revBad = Boolean(s.revolutUrl.trim()) && !rev

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/payment-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.ok) { setS(d.settings); setMsg({ ok: true, text: 'Guardado. Ya sale en tus facturas.' }); setEditing(false) }
      else setMsg({ ok: false, text: d?.error || `No se pudo guardar (HTTP ${r.status}).` })
    } catch { setMsg({ ok: false, text: 'Sin conexión. No se guardó nada.' }) }
    setBusy(false)
  }

  async function copy(key: string, text: string) {
    if (await copyText(text)) { setCopied(key); setTimeout(() => setCopied(''), 1800) }
  }

  const empty = !rev && !s.bizum && !s.iban

  return (
    <div className="os-card os-pay-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <div className="os-card-title">Cómo te pagan</div>
        {loaded && !editing && <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => setEditing(true)}><i className="ti ti-pencil" /> Editar</button>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--os-text-faint)', margin: '0 0 14px' }}>
        Lo que ven tus clientes en cada factura y lo que copias para WhatsApp.
      </p>

      {!loaded ? <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div> : editing ? (
        <form onSubmit={save}>
          <label className="os-label">Tu link de Revolut</label>
          <input className="os-input" value={s.revolutUrl} onChange={set('revolutUrl')} placeholder="revolut.me/tuusuario o @tuusuario" autoComplete="off" />
          <div style={{ fontSize: 12, marginTop: 5, color: revBad ? 'var(--os-bad)' : 'var(--os-text-faint)' }}>
            {revBad ? 'Eso no es un link de Revolut.' : rev ? <>Tus clientes abrirán <strong>{rev}</strong></> : 'En Revolut: Pagos › Revolut.me › Compartir. Pega el link aquí.'}
          </div>

          <label className="os-label" style={{ display: 'block', marginTop: 14 }}>Bizum (número de móvil)</label>
          <input className="os-input" value={s.bizum} onChange={set('bizum')} inputMode="tel" placeholder="+34 600 000 000" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
            <div>
              <label className="os-label">Titular</label>
              <input className="os-input" value={s.holder} onChange={set('holder')} />
            </div>
            <div>
              <label className="os-label">IBAN</label>
              <input className="os-input" value={s.iban} onChange={set('iban')} placeholder="ES00 0000 0000 0000 0000 0000" autoComplete="off" />
            </div>
          </div>
          <label className="os-label" style={{ display: 'block', marginTop: 10 }}>SWIFT/BIC (opcional)</label>
          <input className="os-input" value={s.swift} onChange={set('swift')} />

          <label className="os-label" style={{ display: 'block', marginTop: 14 }}>Nota para el cliente</label>
          <textarea className="os-input" rows={2} value={s.note} onChange={set('note')} style={{ resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="os-btn os-btn-primary" disabled={busy || revBad} style={{ flex: 1 }}>{busy ? 'Guardando…' : 'Guardar'}</button>
            {!empty && <button type="button" className="os-btn os-btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>}
          </div>
        </form>
      ) : (
        <div>
          {rev && (
            <div className="os-pay-rev">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: .4, textTransform: 'uppercase', opacity: .8 }}>Revolut</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, overflowWrap: 'anywhere' }}>{rev.replace('https://', '')}</div>
              </div>
              <button className="os-btn os-btn-sm os-pay-rev-btn" onClick={() => copy('rev', rev)}>
                <i className={`ti ${copied === 'rev' ? 'ti-check' : 'ti-copy'}`} /> {copied === 'rev' ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          )}
          {s.bizum && <Row label="Bizum" value={s.bizum} />}
          {s.iban && <Row label="Titular" value={s.holder} />}
          {s.iban && <Row label="IBAN" value={s.iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()} mono />}
          {s.iban && s.swift && <Row label="SWIFT/BIC" value={s.swift} mono />}
          {s.note && <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)', marginTop: 10, lineHeight: 1.55 }}>{s.note}</div>}
          {empty && <p style={{ fontSize: 13, color: 'var(--os-warn)', margin: 0 }}>Aún no has puesto cómo te pagan.</p>}

          {!empty && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => copy('all', paymentText(s))}>
                <i className={`ti ${copied === 'all' ? 'ti-check' : 'ti-clipboard-text'}`} /> {copied === 'all' ? 'Copiado' : 'Copiar todo para WhatsApp'}
              </button>
            </div>
          )}
        </div>
      )}
      {msg && <div style={{ fontSize: 12.5, marginTop: 10, color: msg.ok ? 'var(--os-good)' : 'var(--os-bad)' }}>{msg.text}</div>}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid var(--os-line)', fontSize: 13.5 }}>
      <span style={{ color: 'var(--os-text-faint)', minWidth: 76 }}>{label}</span>
      <span style={{ fontFamily: mono ? 'ui-monospace, monospace' : 'inherit', color: 'var(--os-text)', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  )
}
