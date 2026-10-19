'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { activateOnboarding, fmtDate, fmtDateTime, OnboardingAnswers, OnboardingProgress, OnboardingShare, StatusPill } from '@/components/os/Onboarding'
import { SearchSelect } from '@/components/os/SearchSelect'
import { usePeople } from '@/components/os/usePeople'
import { PROGRESS_LABEL, stageOf, type OnboardingRow, type Progress } from '@/lib/onboarding'

const STAGES: Progress[] = ['not_opened', 'started', 'half', 'completed']
const STAGE_NOTE: Record<Progress, string> = {
  not_opened: 'Tienen el enlace, aún no lo abren',
  started: 'Lo abrieron, menos de la mitad',
  half: 'Les falta poco para terminar',
  completed: 'Respuestas listas para el plan',
}

export default function OnboardingAdminPage() {
  const [rows, setRows] = useState<OnboardingRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [contactKey, setContactKey] = useState('')
  const [dealId, setDealId] = useState('')
  const [manual, setManual] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<{ row: OnboardingRow; emailed?: boolean; existing?: boolean } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Progress | 'all'>('all')
  const [welcome, setWelcome] = useState({ videoUrl: '', message: '' })
  const [welcomeMsg, setWelcomeMsg] = useState('')

  const people = usePeople()
  const contactItems = useMemo(() => people.filter(p => !p.spam && (p.email || p.phone)).map(p => ({
    id: p.key,
    label: p.name || p.email || p.phone,
    sub: [p.email, p.phone].filter(Boolean).join(' · ') || undefined,
    badge: p.stage === 'client' ? 'Cliente' : p.stage === 'lead' ? 'Lead' : undefined,
  })), [people])

  const load = useCallback(() => fetch('/api/admin/onboarding').then(r => r.json()).catch(() => null).then(d => {
    setRows(d?.onboardings ?? [])
    if (d?.welcome) setWelcome(d.welcome)
    setError(d && !d.ok ? d.error || '' : d ? '' : 'No hay conexión con el servidor.')
    setLoaded(true)
  }), [])
  useEffect(() => { void load() }, [load])

  function pickContact(key: string) {
    setContactKey(key)
    const p = people.find(x => x.key === key)
    if (!p) return
    setForm({ name: p.name || p.email, email: p.email, phone: p.phone })
    setDealId(p.dealId ?? '')
    setFresh(null)
  }

  function clearContact() {
    setContactKey(''); setDealId(''); setForm({ name: '', email: '', phone: '' })
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const r = await activateOnboarding({ ...form, dealId: dealId || undefined, sendEmail: sendEmail && !!form.email })
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setFresh({ row: r.onboarding, emailed: r.emailed, existing: r.existing })
    clearContact()
    setManual(false)
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
    if (fresh?.row.id === row.id) setFresh(null)
    void load()
  }

  const counts = useMemo(() => {
    const c: Record<Progress, number> = { not_opened: 0, started: 0, half: 0, completed: 0 }
    for (const r of rows) c[stageOf(r)]++
    return c
  }, [rows])
  const shown = filter === 'all' ? rows : rows.filter(r => stageOf(r) === filter)
  const picked = contactKey ? people.find(p => p.key === contactKey) : null
  const ready = !!form.name.trim()

  return (
    <div style={{ maxWidth: 1040 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Onboarding</h1>
          <p className="os-page-sub">Sale solo cuando confirmas el pago de un cliente. También puedes elegir un contacto y activarlo tú. Aquí ves cuánto ha rellenado cada uno; todo se guarda mientras escriben.</p>
        </div>
      </div>

      <div className="os-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 20 }}>
        {STAGES.map(s => (
          <button key={s} type="button" className="os-stat-card" onClick={() => setFilter(filter === s ? 'all' : s)}
            style={{ padding: '16px 18px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', outline: filter === s ? '2px solid var(--os-accent)' : 'none', outlineOffset: -2 }}>
            <span className="os-stat-label" style={{ minHeight: 0, paddingRight: 0 }}>{PROGRESS_LABEL[s]}</span>
            <div className="os-stat-value" style={{ marginTop: 6 }}>{loaded ? counts[s] : '…'}</div>
            <div className="os-stat-sub">{STAGE_NOTE[s]}</div>
          </button>
        ))}
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Activar onboarding</div>
        <form onSubmit={activate} style={{ display: 'grid', gap: 12 }}>
          {!manual ? (
            <div>
              <label className="os-label" style={{ display: 'block', marginBottom: 4 }}>Elige un contacto</label>
              <SearchSelect value={contactKey} items={contactItems} onChange={pickContact} placeholder="Busca por nombre, email o teléfono…" />
              {picked && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--os-line)', fontSize: 13, color: 'var(--os-text)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{form.name}</strong>
                  <span style={{ color: 'var(--os-text-muted)' }}>{[form.email || 'sin email', form.phone || 'sin WhatsApp'].join(' · ')}</span>
                  {dealId && <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--os-accent)' }}>Las respuestas van a su lead</span>}
                </div>
              )}
              <button type="button" onClick={() => { setManual(true); clearContact() }}
                style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--os-accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
                ¿No está en tus contactos? Escribe sus datos
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Nombre
                  <input className="os-crm-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ana García" style={{ marginTop: 4 }} />
                </label>
                <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Email
                  <input className="os-crm-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ana@email.com" style={{ marginTop: 4 }} />
                </label>
                <label className="os-label" style={{ display: 'block', minWidth: 0 }}>WhatsApp
                  <input className="os-crm-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+34 600 000 000" style={{ marginTop: 4 }} />
                </label>
              </div>
              <button type="button" onClick={() => { setManual(false); clearContact() }}
                style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--os-accent)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Elegir de mis contactos
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="os-btn os-btn-primary" disabled={busy || !ready}>
              <i className="ti ti-clipboard-check" /> {busy ? 'Activando…' : 'Activar onboarding'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: form.email ? 'var(--os-text)' : 'var(--os-text-faint)', cursor: 'pointer' }}>
              <input type="checkbox" checked={sendEmail && !!form.email} disabled={!form.email} onChange={e => setSendEmail(e.target.checked)} />
              Enviarle el enlace por email ahora
            </label>
          </div>
        </form>
        {fresh && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--os-line)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 8 }}>
              {fresh.existing ? `${fresh.row.name} ya tenía un onboarding. Este es su enlace:` : fresh.emailed ? `Listo. Le hemos enviado el enlace a ${fresh.row.email}. También puedes mandárselo por WhatsApp:` : `Enlace de ${fresh.row.name} listo. Mándaselo:`}
            </div>
            <OnboardingShare row={{ ...fresh.row, last_sent_at: fresh.emailed ? new Date().toISOString() : fresh.row.last_sent_at }} />
          </div>
        )}
        {error && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--os-bad)' }}>{error}</div>}
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="os-card-title">Clientes</div>
          {filter !== 'all' && (
            <button type="button" className="os-btn os-btn-ghost os-btn-sm" onClick={() => setFilter('all')}>
              {PROGRESS_LABEL[filter]} <i className="ti ti-x" />
            </button>
          )}
        </div>
        {!loaded ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>
        ) : shown.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>{rows.length ? 'Nadie en este paso ahora mismo.' : 'Aún no hay ninguno. Elige un contacto arriba y activa el primero.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shown.map(r => {
              const last = r.completed_at || r.updated_at || r.opened_at
              return (
                <div key={r.id} style={{ borderBottom: '1px solid var(--os-line)' }}>
                  <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 2px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--os-text)' }}>{r.name || 'Sin nombre'}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--os-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[r.email, r.phone, r.source === 'link' ? 'Enlace general' : null].filter(Boolean).join(' · ') || ' '}
                      </span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--os-text-faint)', whiteSpace: 'nowrap', minWidth: 120 }}>
                      {r.status === 'completed' ? `Terminado ${fmtDate(r.completed_at)}` : last ? `Última vez ${fmtDateTime(last)}` : `Enviado ${fmtDate(r.last_sent_at || r.created_at)}`}
                    </span>
                    <OnboardingProgress row={r} />
                    <i className={`ti ti-chevron-${openId === r.id ? 'up' : 'down'}`} style={{ color: 'var(--os-text-faint)' }} />
                  </button>
                  {openId === r.id && (
                    <div style={{ padding: '4px 2px 18px' }}>
                      {r.status === 'completed' ? <OnboardingAnswers row={r} /> : (
                        <>
                          {r.answers && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-warn)', marginBottom: 4 }}>Sin terminar: esto es lo que ha rellenado (guardado automáticamente)</div><OnboardingAnswers row={r} /></div>}
                          <OnboardingShare row={r} />
                        </>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        {r.email && (
                          <Link href={`/admin/contacts/${encodeURIComponent(r.email)}`} className="os-btn os-btn-ghost os-btn-sm"><i className="ti ti-user" /> Ficha del contacto</Link>
                        )}
                        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void remove(r)} style={{ color: 'var(--os-bad)' }}><i className="ti ti-trash" /> Borrar</button>
                        <span style={{ marginLeft: 'auto' }}><StatusPill status={r.status} /></span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="os-card" style={{ padding: '20px 24px' }}>
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
