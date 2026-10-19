'use client'

import { useEffect, useState } from 'react'
import { BOOKING_STATUS, bookingsFor, contactRowFor, hydrateContactSources, type BookingRow } from '@/lib/contact-sources'
import type { ContactRow } from '@/lib/contacts-db'
import type { OnboardingRow } from '@/lib/onboarding'
import { OnboardingAnswers, OnboardingShare, StatusPill, fmtDate } from './Onboarding'

// Calls and onboarding for one person, shared by the contact drawer and the
// full contact page.

const fmtCall = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin hora elegida'

export function useBookings(email?: string | null): BookingRow[] {
  const [rows, setRows] = useState<BookingRow[]>(() => (email ? bookingsFor(email) : []))
  useEffect(() => {
    if (!email) return
    let live = true
    void Promise.resolve().then(() => { if (live) setRows(bookingsFor(email)) })
    void hydrateContactSources().then(() => { if (live) setRows(bookingsFor(email)) })
    return () => { live = false }
  }, [email])
  return email ? rows : []
}

export function CallsList({ email, emptyText = 'Sin llamadas reservadas.' }: { email?: string | null; emptyText?: string }) {
  const rows = useBookings(email)
  const [now] = useState(() => Date.now())
  if (!rows.length) return <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>{emptyText}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map(b => {
        const st = BOOKING_STATUS[b.status] ?? { label: b.status, color: 'var(--os-text-faint)' }
        const upcoming = b.start_at && Date.parse(b.start_at) > now && b.status === 'booked'
        return (
          <div key={b.id} style={{ padding: '9px 2px', borderBottom: '1px solid var(--os-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 140, fontWeight: 700, fontSize: 13.5, color: 'var(--os-text)', textTransform: 'capitalize' }}>{fmtCall(b.start_at)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, color: st.color, background: 'var(--os-line)', whiteSpace: 'nowrap' }}>{st.label}</span>
              {upcoming && b.meet_url && (
                <a className="os-btn os-btn-ghost os-btn-sm" href={b.meet_url} target="_blank" rel="noopener noreferrer"><i className="ti ti-video" /> Meet</a>
              )}
            </div>
            {b.notes && <div style={{ fontSize: 12.5, color: 'var(--os-text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{b.notes}</div>}
          </div>
        )
      })}
    </div>
  )
}

// The drawer's version: nothing at all when they never booked.
export function CallsSection({ email }: { email?: string | null }) {
  const rows = useBookings(email)
  if (!rows.length) return null
  return (
    <div className="os-crm-section">
      <div className="os-crm-section-title">Llamadas</div>
      <CallsList email={email} />
    </div>
  )
}

// Read-only onboarding state for the drawer; activating it lives on the full page.
export function OnboardingSummary({ email }: { email?: string | null }) {
  const [state, setState] = useState<{ key: string; row: OnboardingRow | null; error: string }>({ key: '', row: null, error: '' })
  useEffect(() => {
    if (!email) return
    let live = true
    fetch(`/api/admin/onboarding?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => { if (live) setState({ key: email, row: d?.onboardings?.[0] ?? null, error: d?.ok === false ? d.error || 'No se pudo cargar.' : '' }) })
      .catch(() => { if (live) setState({ key: email, row: null, error: 'No se pudo cargar.' }) })
    return () => { live = false }
  }, [email])
  if (!email || state.key !== email) return null
  const { row, error } = state
  if (!row && !error) return null
  return (
    <div className="os-crm-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="os-crm-section-title" style={{ marginBottom: 0 }}>Onboarding</div>
        {row && <StatusPill status={row.status} />}
        {row?.completed_at && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--os-text-faint)' }}>{fmtDate(row.completed_at)}</span>}
      </div>
      {error ? <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)' }}>{error}</div>
        : row?.status === 'completed' ? <OnboardingAnswers row={row} />
        : row ? <OnboardingShare row={row} /> : null}
    </div>
  )
}

// The person's file from the `contacts` table: goals, what they told José on
// the call form and in onboarding, plus his own notes and the InvoiceShift key.
export function ContactProfile({ email }: { email: string }) {
  const [row, setRow] = useState<ContactRow | null>(() => contactRowFor(email))
  const [form, setForm] = useState<{ notes: string; invoiceshift_customer_id: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let live = true
    void hydrateContactSources().then(() => { if (live) setRow(contactRowFor(email)) })
    return () => { live = false }
  }, [email])
  if (!row) return null
  const f = form ?? { notes: row.notes ?? '', invoiceshift_customer_id: row.invoiceshift_customer_id ?? '' }

  async function save(k: 'notes' | 'invoiceshift_customer_id') {
    if (!row || (row[k] ?? '') === f[k]) return
    const d = await fetch('/api/admin/contacts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: row.id, [k]: f[k] }) }).then(r => r.json()).catch(() => null)
    if (d?.ok) { setRow({ ...row, [k]: f[k] || null }); setMsg('Guardado'); setTimeout(() => setMsg(''), 1500) }
    else setMsg(d?.error || 'No se guardó.')
  }

  const facts: [string, string | number | null][] = [
    ['Edad', row.age && `${row.age} años`],
    ['Peso', row.weight_kg && `${row.weight_kg} kg`],
    ['Altura', row.height_cm && `${row.height_cm} cm`],
    ['Plazo', row.timeframe],
    ['Urgencia', row.urgency],
    ['Lo que le frena', row.blocker],
    ['Fecha clave', row.key_date],
    ['Compromiso', row.commitment !== null && row.commitment !== undefined ? `${row.commitment}/10` : null],
    ['Inversión', row.budget],
    ['Listo para empezar', row.ready_to_change],
    ['Entrena', [row.training_days, row.training_place].filter(Boolean).join(' · ')],
  ]
  const shown = facts.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 0)
  const qa = Object.entries(row.call_answers ?? {})

  return (
    <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="os-crm-section-title" style={{ marginBottom: 0 }}>Ficha</div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, color: row.status === 'client' ? 'var(--os-good)' : 'var(--os-accent)', background: row.status === 'client' ? 'var(--os-good-soft)' : 'var(--os-accent-soft)' }}>{row.status === 'client' ? 'Cliente' : 'Lead'}</span>
        {msg && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--os-text-faint)' }}>{msg}</span>}
      </div>
      {row.goals.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {row.goals.map(g => <span key={g} className="os-tag-chip active">{g}</span>)}
        </div>
      )}
      {shown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          {shown.map(([k, v]) => (
            <div key={k} style={{ background: 'var(--os-card-alt)', border: '1px solid var(--os-line)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--os-text-faint)' }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--os-text)', marginTop: 2, overflowWrap: 'anywhere' }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {qa.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => setOpen(o => !o)}>
            <i className={`ti ${open ? 'ti-chevron-up' : 'ti-list-details'}`} /> {open ? 'Ocultar' : 'Ver'} respuestas de la llamada
          </button>
          {open && (
            <div style={{ display: 'grid', gap: 2, marginTop: 10 }}>
              {qa.map(([k, v]) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 170px) 1fr', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--os-line)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--os-text-faint)' }}>{k}</span>
                  <span style={{ color: 'var(--os-text)', fontWeight: 600, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="os-crm-field">
        <label>Notas de José</label>
        <textarea className="os-crm-textarea" value={f.notes} placeholder="Lo que quieras recordar de esta persona"
          onChange={e => setForm({ ...f, notes: e.target.value })} onBlur={() => save('notes')} />
      </div>
      <div className="os-crm-field">
        <label>InvoiceShift · ID de cliente</label>
        <input className="os-crm-input" value={f.invoiceshift_customer_id} placeholder="Se rellena al conectar InvoiceShift"
          onChange={e => setForm({ ...f, invoiceshift_customer_id: e.target.value })} onBlur={() => save('invoiceshift_customer_id')} />
      </div>
    </div>
  )
}
