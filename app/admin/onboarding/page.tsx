'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { activateOnboarding, fmtDate, OnboardingAnswers, OnboardingShare } from '@/components/os/Onboarding'
import { progressOf, type OnboardingRow } from '@/lib/onboarding'
import { SearchSelect } from '@/components/os/SearchSelect'
import { usePeople } from '@/components/os/usePeople'

// Where each client is: link sent, opened, part-filled (the form saves as
// they type) or done.
function stageOf(r: OnboardingRow) {
  const p = progressOf(r)
  if (r.status === 'completed') return { p, label: 'Completado', color: 'var(--os-good)' }
  if (p > 0) return { p, label: `${p}% completado`, color: 'var(--os-warn)' }
  if (r.status === 'opened') return { p, label: 'Abierto, sin empezar', color: 'var(--os-accent)' }
  return { p, label: 'Enlace enviado', color: 'var(--os-text-faint)' }
}

function Progress({ r }: { r: OnboardingRow }) {
  const st = stageOf(r)
  return (
    <span style={{ display: 'grid', gap: 4, width: 150, flexShrink: 0 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
      <span style={{ height: 6, borderRadius: 6, background: 'var(--os-line)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${st.p}%`, background: st.p === 100 ? 'var(--os-good)' : 'var(--os-accent)', borderRadius: 6 }} />
      </span>
    </span>
  )
}

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
  const [picked, setPicked] = useState('')
  const [mailMsg, setMailMsg] = useState<Record<string, string>>({})
  const people = usePeople()
  const items = people.filter(p => p.email || p.phone).map(p => ({
    id: p.key, label: p.name || p.email || p.phone, sub: [p.email, p.phone].filter(Boolean).join(' · '),
    badge: p.stage === 'client' ? 'Cliente' : p.stage === 'lead' ? 'Lead' : undefined,
  }))

  function pick(key: string) {
    setPicked(key)
    const p = people.find(x => x.key === key)
    if (p) setForm({ name: p.name || p.email, email: p.email, phone: p.phone })
  }

  async function emailLink(row: OnboardingRow) {
    setMailMsg(m => ({ ...m, [row.id]: 'Enviando…' }))
    const d = await fetch('/api/admin/onboarding', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: row.id, action: 'email' }) })
      .then(x => x.json()).catch(() => null)
    setMailMsg(m => ({ ...m, [row.id]: d?.ok ? `Enviado a ${row.email}` : d?.error || 'No se pudo enviar.' }))
  }

  const mailButton = (row: OnboardingRow) => row.email ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="os-btn os-btn-ghost os-btn-sm" onClick={() => void emailLink(row)}><i className="ti ti-mail" /> Enviar por email</button>
      {mailMsg[row.id] && <span style={{ fontSize: 12, color: 'var(--os-text-muted)' }}>{mailMsg[row.id]}</span>}
    </span>
  ) : null

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
    setPicked('')
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
  const counts = [
    { label: 'Enlace enviado', n: rows.filter(r => stageOf(r).label === 'Enlace enviado').length },
    { label: 'Abierto', n: rows.filter(r => r.status === 'opened' && progressOf(r) === 0).length },
    { label: 'A medias', n: rows.filter(r => r.status !== 'completed' && progressOf(r) > 0).length },
    { label: 'Completado', n: rows.filter(r => r.status === 'completed').length },
  ]

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Onboarding</h1>
          <p className="os-page-sub">Sale solo al confirmar el pago de un cliente. También puedes elegir un contacto y activarlo tú. El formulario se guarda mientras lo rellenan, así ves hasta dónde llegó cada uno.</p>
        </div>
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Activar onboarding</div>
        <div style={{ marginBottom: 12 }}>
          <div className="os-label" style={{ marginBottom: 4 }}>Elige un contacto</div>
          <SearchSelect value={picked} items={items} onChange={pick} placeholder="Busca por nombre, email o teléfono…" />
        </div>
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
            <i className="ti ti-clipboard-check" /> {busy ? 'Activando…' : 'Activar onboarding'}
          </button>
        </form>
        {fresh && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--os-line)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 8 }}>
              Enlace de {fresh.name} listo. Mándaselo:
            </div>
            <OnboardingShare row={fresh} />
            <div style={{ marginTop: 8 }}>{mailButton(fresh)}</div>
          </div>
        )}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--os-bad)' }}>{error}</div>}
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>
          Seguimiento {pending > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--os-text-faint)' }}>· {pending} sin terminar</span>}
        </div>
        {rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
            {counts.map(c => (
              <div key={c.label} style={{ background: 'var(--os-card-alt)', border: '1px solid var(--os-line)', borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--os-text-primary)' }}>{c.n}</div>
                <div style={{ fontSize: 11.5, color: 'var(--os-text-faint)', fontWeight: 700 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}
        {!loaded ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Aún no hay ninguno. Activa el primero arriba o desde la ficha de un lead.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid var(--os-line)' }}>
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, width: '100%', padding: '11px 2px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <span style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--os-text)' }}>{r.name || 'Sin nombre'}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--os-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[r.email, r.phone, r.source === 'link' ? 'Enlace general' : null].filter(Boolean).join(' · ') || ' '}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--os-text-faint)', whiteSpace: 'nowrap' }}>{fmtDate(r.completed_at || r.created_at)}</span>
                  <Progress r={r} />
                  <i className={`ti ti-chevron-${openId === r.id ? 'up' : 'down'}`} style={{ color: 'var(--os-text-faint)' }} />
                </button>
                {openId === r.id && (
                  <div style={{ padding: '4px 2px 18px' }}>
                    {r.status === 'completed' ? <OnboardingAnswers row={r} /> : (
                      <>
                        {r.answers && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-warn)', marginBottom: 4 }}>Sin terminar: esto es lo que ha rellenado</div><OnboardingAnswers row={r} /></div>}
                        <OnboardingShare row={r} />
                        <div style={{ marginTop: 8 }}>{mailButton(r)}</div>
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
      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 0 }}>
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

    </div>
  )
}
