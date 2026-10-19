'use client'

import { useState } from 'react'
import { PaymentSettingsCard } from '@/components/os/PaymentSettingsCard'
import { currencyOptions } from '@/lib/fx'
import { SearchSelect } from '@/components/os/SearchSelect'
import { usePeople } from '@/components/os/usePeople'
import { copyText } from '@/lib/clipboard'

interface MadeLink { url: string; description: string; amount: number; currency: string; recurring: boolean }

export default function PaymentsPage() {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [recurring, setRecurring] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [links, setLinks] = useState<MadeLink[]>([])
  const [copied, setCopied] = useState('')
  const [contactKey, setContactKey] = useState('')

  const people = usePeople()
  const contactItems = people.map(p => ({
    id: p.key,
    label: p.name || p.email,
    sub: [p.company, p.name ? p.email : ''].filter(Boolean).join(' · ') || undefined,
    badge: p.stage,
  }))
  function pickContact(key: string) {
    setContactKey(key)
    const p = people.find(x => x.key === key)
    if (!p) return
    setClientName(p.name)
    setClientEmail(p.email)
  }

  function copy(key: string, text: string) {
    setCopied(key)
    void copyText(text)
    window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 2200)
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/os/payment-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description, amount: Number(amount), currency, recurring, clientName, clientEmail,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.ok) {
        setError(d?.error ? String(d.error) : `Stripe lo rechazó (HTTP ${res.status}).`)
      } else {
        setLinks(prev => [{ url: d.url, description: d.description, amount: d.amount, currency: d.currency, recurring: d.recurring }, ...prev])
        setDescription(''); setAmount('')
      }
    } catch {
      setError('Sin conexión con el servidor. No se creó nada.')
    }
    setBusy(false)
  }

  return (
    <div>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Cobrar</h1>
          <p className="os-page-sub">
            Pon tu Revolut una vez y sale en todas tus facturas. También puedes crear un link de pago con tarjeta.
          </p>
        </div>
      </div>

      {error && (
        <div className="os-card" style={{ borderColor: 'var(--os-bad)', marginBottom: 18 }}>
          <strong style={{ color: 'var(--os-bad)' }}>{error}</strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16, alignItems: 'start' }}>

        {}
        <form onSubmit={create} className="os-card">
          <div className="os-card-title" style={{ marginBottom: 4 }}>Link de pago con tarjeta</div>
          <p style={{ fontSize: 13, color: 'var(--os-text-faint)', margin: '0 0 16px' }}>
            No caduca: sigue funcionando aunque lo abran la semana que viene.
          </p>

          <label className="os-label">Concepto</label>
          <input className="os-input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Programa 12 semanas" required />

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="os-label">Importe</label>
              <input className="os-input" value={amount} onChange={e => setAmount(e.target.value)}
                inputMode="decimal" placeholder="500" required />
            </div>
            <div style={{ width: 108 }}>
              <label className="os-label">Moneda</label>
              <select className="os-select" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: '100%' }}>
                {}
                {currencyOptions(currency).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label className="os-label" style={{ display: 'block', marginTop: 12 }}>Elegir contacto</label>
          <SearchSelect value={contactKey} items={contactItems} onChange={pickContact}
            placeholder="Busca nombre o email…" />

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="os-label">Nombre</label>
              <input className="os-input" value={clientName} onChange={e => { setClientName(e.target.value); setContactKey('') }} placeholder="Opcional" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="os-label">Email</label>
              <input className="os-input" value={clientEmail} onChange={e => { setClientEmail(e.target.value); setContactKey('') }} placeholder="Opcional" />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, fontSize: 13.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
            Cobrar cada mes
          </label>

          <button className="os-btn os-btn-primary" disabled={busy} style={{ marginTop: 16, width: '100%' }}>
            {busy ? 'Creando…' : 'Crear link'}
          </button>
        </form>

        <PaymentSettingsCard />
      </div>

      {}
      {links.length > 0 && (
        <div className="os-card" style={{ marginTop: 16 }}>
          <div className="os-card-title" style={{ marginBottom: 12 }}>Links creados ahora</div>
          {links.map(l => (
            <div key={l.url} style={{
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
              padding: '12px 0', borderTop: '1px solid var(--os-line)',
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--os-text)' }}>
                  {l.description} · {l.currency} {l.amount}{l.recurring ? ' / mes' : ''}
                </div>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12.5, color: 'var(--os-accent)', wordBreak: 'break-all' }}>{l.url}</a>
              </div>
              <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => copy(l.url, l.url)}>
                {copied === l.url ? '✓ Copiado' : 'Copiar link'}
              </button>
            </div>
          ))}
          <p style={{ fontSize: 12.5, color: 'var(--os-text-faint)', margin: '12px 0 0' }}>
            Quedan guardados en Stripe. Esta lista solo muestra los de esta sesión.
          </p>
        </div>
      )}
    </div>
  )
}
