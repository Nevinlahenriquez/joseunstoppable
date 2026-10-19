'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { activateOnboarding, fmtDate, OnboardingAnswers, OnboardingShare, StatusPill } from '@/components/os/Onboarding'
import type { OnboardingRow } from '@/lib/onboarding'

export default function OnboardingAdminPage() {
  const [rows, setRows] = useState<OnboardingRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<OnboardingRow | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [welcome, setWelcome] = useState({ videoUrl: '', message: '' })
  const [welcomeMsg, setWelcomeMsg] = useState('')

  const load = useCallback(() => fetch('/api/admin/onboarding').then(r => r.json()).catch(() => null).then(d => {
    setRows(d?.onboardings ?? [])
    if (d?.welcome) setWelcome(d.welcome)
    setError(d && !d.ok ? d.error || '' : d ? '' : 'No hay conexión con el servidor.')
    setLoaded(true)
  }), [])
  useEffect(() => { void load() }, [load])

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const r = await activateOnboarding(form)
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setFresh(r.onboarding)
    setForm({ name: '', email: '', phone: '' })
    void load()
  }

  async function saveWelcome(e: React.FormEvent) {
    e.preventDefault()
    setWelcomeMsg('Guardando…')
    const d = await fetch('/api/admin/onboarding', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(welcome) })
      .then(r => r.json()).catch(() => null)
    setWelcomeMsg(d?.ok ? 'Guardado. Todos los clientes nuevos lo verán en su bienvenida.' : d?.error || 'No se pudo guardar.')
  }

  async function remove(row: OnboardingRow) {
    const ok = await confirmAction({ message: `¿Borrar el onboarding de ${row.name || 'este cliente'}?`, detail: 'Su enlace dejará de funcionar.', confirmLabel: 'Borrar', destructive: true })
    if (!ok) return
    await fetch(`/api/admin/onboarding?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    if (fresh?.id === row.id) setFresh(null)
    void load()
  }

  const pending = rows.filter(r => r.status !== 'completed').length

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Onboarding</h1>
          <p className="os-page-sub">Sale solo al confirmar el pago de un cliente. También puedes activarlo a mano y mandar el enlace por WhatsApp. Sus respuestas aparecen aquí, en su ficha y en su lead.</p>
        </div>
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Activar onboarding</div>
        <form onSubmit={activate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Nombre
            <input className="os-crm-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ana García" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>WhatsApp
            <input className="os-crm-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+34 600 000 000" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Email
            <input className="os-crm-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ana@email.com" style={{ marginTop: 4 }} />
          </label>
          <button className="os-btn os-btn-primary" disabled={busy || !form.name.trim()}>
            <i className="ti ti-clipboard-check" /> {busy ? 'Activando…' : 'Activar'}
          </button>
        </form>
        {fresh && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--os-line)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 8 }}>
              Enlace de {fresh.name} listo. Mándaselo:
            </div>
            <OnboardingShare row={fresh} />
          </div>
        )}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--os-bad)' }}>{error}</div>}
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 6 }}>Página de bienvenida</div>
        <p className="os-page-sub" style={{ margin: '0 0 12px' }}>
          Cuando confirmas un pago (factura pagada) o marcas un lead como ganado, el cliente recibe por email su página de bienvenida con este vídeo y el botón a su onboarding.
        </p>
        <form onSubmit={saveWelcome} style={{ display: 'grid', gap: 10 }}>
          <label className="os-label" style={{ display: 'block' }}>Vídeo de YouTube
            <input className="os-crm-input" value={welcome.videoUrl} onChange={e => setWelcome({ ...welcome, videoUrl: e.target.value })} placeholder="https://youtu.be/…" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block' }}>Mensaje de bienvenida (opcional)
            <textarea className="os-crm-textarea" rows={3} value={welcome.message} onChange={e => setWelcome({ ...welcome, message: e.target.value })} placeholder="Gracias por confiar en mí. A partir de hoy trabajamos juntos…" style={{ marginTop: 4 }} />
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="os-btn os-btn-primary os-btn-sm">Guardar</button>
            {welcomeMsg && <span style={{ fontSize: 13, color: 'var(--os-text-muted)' }}>{welcomeMsg}</span>}
          </div>
        </form>
      </div>

      <div className="os-card" style={{ padding: '20px 24px' }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>
          Clientes {pending > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--os-text-faint)' }}>· {pending} sin terminar</span>}
        </div>
        {!loaded ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Aún no hay ninguno. Activa el primero arriba o desde la ficha de un lead.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--os-line)' }}>
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 2px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--os-text)' }}>{r.name || 'Sin nombre'}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--os-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[r.email, r.phone, r.source === 'link' ? 'Enlace general' : null].filter(Boolean).join(' · ') || ' '}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--os-text-faint)', whiteSpace: 'nowrap' }}>{fmtDate(r.completed_at || r.created_at)}</span>
                  <StatusPill status={r.status} />
                  <i className={`ti ti-chevron-${openId === r.id ? 'up' : 'down'}`} style={{ color: 'var(--os-text-faint)' }} />
                </button>
                {openId === r.id && (
                  <div style={{ padding: '4px 2px 18px' }}>
                    {r.status === 'completed' ? <OnboardingAnswers row={r} /> : (
                      <>
                        {r.answers && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-warn)', marginBottom: 4 }}>Sin terminar: esto es lo que ha rellenado</div><OnboardingAnswers row={r} /></div>}
                        <OnboardingShare row={r} />
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {r.email && (
                        <Link href={`/admin/contacts/${encodeURIComponent(r.email)}`} className="os-btn os-btn-ghost os-btn-sm"><i className="ti ti-user" /> Ficha del contacto</Link>
                      )}
                      <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void remove(r)} style={{ color: 'var(--os-bad)' }}><i className="ti ti-trash" /> Borrar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
