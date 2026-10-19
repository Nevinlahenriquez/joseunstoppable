'use client'

import { useEffect, useRef, useState } from 'react'
import { copyText } from '@/lib/clipboard'
import { answerRows, STATUS_LABEL, type OnboardingRow, type OnboardingStatus } from '@/lib/onboarding'

// Dashboard side of the client onboarding: activate a personal link, send it
// on WhatsApp, and read the answers once the client has filled it in.

export type ActivateInput = { name: string; email?: string; phone?: string; dealId?: string }
export type ActivateResult = { ok: true; onboarding: OnboardingRow; existing?: boolean; emailed?: boolean } | { ok: false; error: string }

export async function activateOnboarding(input: ActivateInput): Promise<ActivateResult> {
  try {
    const r = await fetch('/api/admin/onboarding', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok || !d.ok) return { ok: false, error: d.error || `No se pudo activar (${r.status}).` }
    return { ok: true, onboarding: d.onboarding, existing: d.existing, emailed: d.emailed }
  } catch {
    return { ok: false, error: 'No hay conexión con el servidor.' }
  }
}

// The link clients get: their welcome page (video + steps), which leads into the form.
export const onboardingUrl = (token: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/bienvenida/${token}`

const digits = (s?: string | null) => (s ?? '').replace(/[^\d]/g, '')
// wa.me needs the country code; a bare 9-digit Spanish mobile gets +34.
const waNumber = (s?: string | null) => { const d = digits(s); return /^[67]\d{8}$/.test(d) ? '34' + d : d }

export function inviteText(name: string | null | undefined, url: string) {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return `Hola${first ? ' ' + first : ''}! Bienvenido/a al equipo 💪 Aquí tienes tu bienvenida y tu onboarding: ${url}\n\nSon 5 minutos. Cuando lo envíes, mándame 3 fotos (frontal, perfil y espalda) y te escribo para la llamada de bienvenida.`
}

const STATUS_COLOR: Record<OnboardingStatus, string> = {
  sent: 'var(--os-text-muted)',
  opened: 'var(--os-warn)',
  completed: 'var(--os-good)',
}

export function StatusPill({ status }: { status: OnboardingStatus }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, color: STATUS_COLOR[status], background: status === 'completed' ? 'var(--os-good-soft)' : 'var(--os-line)', whiteSpace: 'nowrap' }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function OnboardingShare({ row }: { row: Pick<OnboardingRow, 'token' | 'name' | 'phone'> }) {
  const [copied, setCopied] = useState(false)
  const url = onboardingUrl(row.token)
  const wa = waNumber(row.phone)
  const waHref = `https://wa.me/${wa}?text=${encodeURIComponent(inviteText(row.name, url))}`
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="os-crm-input" readOnly value={url} onFocus={e => e.target.select()} style={{ flex: 1, fontSize: 13 }} />
        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => { void copyText(url).then(ok => { setCopied(ok); setTimeout(() => setCopied(false), 1600) }) }}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="os-btn os-btn-primary os-btn-sm" href={waHref} target="_blank" rel="noopener noreferrer">
          <i className="ti ti-brand-whatsapp" /> {wa ? 'Enviar por WhatsApp' : 'Enviar por WhatsApp (elige el chat)'}
        </a>
        <a className="os-btn os-btn-ghost os-btn-sm" href={url} target="_blank" rel="noopener noreferrer">
          <i className="ti ti-external-link" /> Ver como cliente
        </a>
      </div>
    </div>
  )
}

export function OnboardingAnswers({ row }: { row: OnboardingRow }) {
  const rows = answerRows(row.answers ?? {})
  if (!rows.length) return <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Todavía no ha respondido.</div>
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 170px) 1fr', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--os-line)', fontSize: 13.5 }}>
          <span style={{ color: 'var(--os-text-faint)' }}>{k}</span>
          <span style={{ color: 'var(--os-text)', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

// The card on a contact's page: activate, share, or read their answers.
export function OnboardingCard({ name, email, phone, dealId, refresh }: ActivateInput & { refresh?: string }) {
  const [row, setRow] = useState<OnboardingRow | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const firstLoad = useRef(true)
  useEffect(() => {
    // After a stage change, give the server a moment to start the onboarding before reading it.
    const wait = firstLoad.current ? 0 : 1500
    firstLoad.current = false
    const t = setTimeout(() => {
      const q = email ? fetch(`/api/admin/onboarding?email=${encodeURIComponent(email)}`).then(r => r.json()).catch(() => null) : Promise.resolve(null)
      void q.then(d => {
        setRow(d?.onboardings?.[0] ?? null)
        if (d && !d.ok && d.error) setError(d.error)
        setLoaded(true)
      })
    }, wait)
    return () => clearTimeout(t)
  }, [email, refresh])

  async function activate() {
    setBusy(true); setError('')
    const r = await activateOnboarding({ name, email, phone, dealId })
    setBusy(false)
    if (r.ok) setRow(r.onboarding)
    else setError(r.error)
  }

  return (
    <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div className="os-crm-section-title" style={{ marginBottom: 0 }}>Onboarding</div>
        {row && <StatusPill status={row.status} />}
        {row?.completed_at && <span style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>{fmtDate(row.completed_at)}</span>}
      </div>
      {!loaded ? (
        <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>
      ) : row?.status === 'completed' ? (
        <>
          {open ? <OnboardingAnswers row={row} /> : (
            <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => setOpen(true)}><i className="ti ti-list-details" /> Ver respuestas</button>
          )}
        </>
      ) : row ? (
        <>
          {row.answers && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-warn)', marginBottom: 4 }}>Sin terminar: esto es lo que ha rellenado</div><OnboardingAnswers row={row} /></div>}
          <OnboardingShare row={row} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)', marginBottom: 10 }}>
            Activa su onboarding y le mandas el enlace. Sus respuestas aparecen aquí.
          </div>
          <button className="os-btn os-btn-primary os-btn-sm" disabled={busy} onClick={() => void activate()}>
            <i className="ti ti-clipboard-check" /> {busy ? 'Activando…' : 'Activar onboarding'}
          </button>
        </>
      )}
      {error && <div style={{ marginTop: 10, fontSize: 13, color: 'var(--os-bad)' }}>{error}</div>}
    </div>
  )
}
