'use client'

import { useCallback, useEffect, useState } from 'react'
import { copyText } from '@/lib/clipboard'

type Booking = {
  id: string; name: string; email: string | null; phone: string | null; notes: string | null
  start_at: string | null; status: string; source: string | null; meet_url: string | null; created_at: string
}
type Availability = { timeZone: string; duration: number; minNoticeHours: number; daysShown: number; week: Record<string, string[]>; meetingNote: string }

const DAYS: [string, string][] = [['1', 'Lunes'], ['2', 'Martes'], ['3', 'Miércoles'], ['4', 'Jueves'], ['5', 'Viernes'], ['6', 'Sábado'], ['7', 'Domingo']]
const STATUS: Record<string, { label: string; color: string }> = {
  booked: { label: 'Reservada', color: 'var(--os-accent)' },
  requested: { label: 'Sin hora', color: 'var(--os-warn)' },
  showed: { label: 'Vino', color: 'var(--os-good)' },
  won: { label: 'Cliente', color: 'var(--os-good)' },
  no_show: { label: 'No vino', color: 'var(--os-bad)' },
  cancelled: { label: 'Cancelada', color: 'var(--os-text-muted)' },
}

export default function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([])
  const [av, setAv] = useState<Availability | null>(null)
  const [google, setGoogle] = useState<{ connected: boolean; email?: string; configured: boolean } | null>(null)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState<'next' | 'past' | 'hours'>('next')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const d = await fetch('/api/admin/bookings').then(r => r.json()).catch(() => null)
    if (!d) return setMsg('No se pudo cargar.')
    setRows(d.bookings ?? []); setAv(d.availability); setGoogle(d.google)
    if (d.ok === false && d.error) setMsg(d.error)
  }, [])

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('google')
    if (q === 'connected') setMsg('Google Calendar conectado.')
    if (q === 'error') setMsg('Google no se pudo conectar. Inténtalo otra vez.')
    if (q === 'missing') setMsg('Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel.')
    void load()
  }, [load])

  async function setStatus(id: string, status: string) {
    setRows(r => r.map(b => (b.id === id ? { ...b, status } : b)))
    const d = await fetch('/api/admin/bookings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) }).then(r => r.json()).catch(() => null)
    if (!d?.ok) { setMsg(d?.error || 'No se guardó.'); void load() }
  }

  async function saveHours() {
    if (!av) return
    setSaving(true)
    const d = await fetch('/api/admin/bookings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ availability: av }) }).then(r => r.json()).catch(() => null)
    setSaving(false)
    setMsg(d?.ok ? 'Horario guardado.' : d?.error || 'No se guardó.')
  }

  const now = Date.now()
  const upcoming = rows.filter(b => b.status === 'requested' || (b.start_at && Date.parse(b.start_at) >= now - 3600_000 && b.status !== 'cancelled')).sort((a, b) => (a.start_at ?? '9').localeCompare(b.start_at ?? '9'))
  const past = rows.filter(b => !upcoming.includes(b))
  const tz = av?.timeZone ?? 'Europe/Madrid'
  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('es-ES', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin hora'
  const list = tab === 'next' ? upcoming : past
  const bookingUrl = typeof window !== 'undefined' ? `${location.origin}/reserva` : '/reserva'

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Llamadas</h1>
          <p className="os-page-sub">Tu agenda de llamadas de 30 minutos. Sustituye a Calendly.</p>
        </div>
        <button className="os-btn" onClick={() => { void copyText(bookingUrl); setMsg('Enlace copiado: ' + bookingUrl) }}>Copiar enlace de reserva</button>
      </div>

      {msg && <div className="os-card" style={{ padding: 12, marginBottom: 12 }}>{msg}</div>}

      {google && (
        <div className="os-card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Google Calendar</strong>
          {google.connected
            ? <span>Conectado{google.email ? ` (${google.email})` : ''}. Las horas ocupadas no se ofrecen y cada llamada entra con su enlace de Meet.</span>
            : <span>No conectado. Las llamadas se guardan aquí, pero sin ver tus huecos ocupados ni crear el Meet.</span>}
          {google.configured
            ? <a className="os-btn" href="/api/google/start" style={{ marginLeft: 'auto' }}>{google.connected ? 'Reconectar' : 'Conectar Google'}</a>
            : <span style={{ marginLeft: 'auto', color: 'var(--os-text-muted)' }}>Falta configurar Google en Vercel.</span>}
        </div>
      )}

      <div className="os-chiprow" style={{ marginBottom: 12 }}>
        {([['next', `Próximas (${upcoming.length})`], ['past', `Pasadas (${past.length})`], ['hours', 'Mi horario']] as const).map(([k, l]) => (
          <button key={k} className="os-chip" data-active={tab === k} onClick={() => setTab(k)} style={tab === k ? { background: 'var(--os-accent)', color: '#fff' } : undefined}>{l}</button>
        ))}
      </div>

      {tab !== 'hours' && (
        list.length === 0
          ? <div className="os-empty"><div className="os-empty-title">Nada por aquí</div><div className="os-empty-sub">Las reservas de /reserva aparecen aquí al momento.</div></div>
          : <div style={{ display: 'grid', gap: 10 }}>
              {list.map(b => (
                <div key={b.id} className="os-card" style={{ padding: 14, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong style={{ fontSize: 16 }}>{b.name}</strong>
                    <span style={{ color: STATUS[b.status]?.color }}>{STATUS[b.status]?.label ?? b.status}</span>
                    <span style={{ color: 'var(--os-text-muted)' }}>{fmt(b.start_at)}</span>
                    {b.source && <span className="os-chip">{b.source}</span>}
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {b.meet_url && <a className="os-btn" href={b.meet_url} target="_blank" rel="noreferrer">Meet</a>}
                      {b.phone && <a className="os-btn" href={`https://wa.me/${b.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                      <select className="os-select" value={b.status} onChange={e => void setStatus(b.id, e.target.value)}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </span>
                  </div>
                  <div style={{ color: 'var(--os-text-muted)', fontSize: 13 }}>{[b.email, b.phone].filter(Boolean).join(' · ')}</div>
                  {b.notes && <details><summary style={{ cursor: 'pointer' }}>Respuestas</summary><pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', fontSize: 13 }}>{b.notes}</pre></details>}
                </div>
              ))}
            </div>
      )}

      {tab === 'hours' && av && (
        <div className="os-card" style={{ padding: 18, display: 'grid', gap: 14 }}>
          <p className="os-page-sub" style={{ margin: 0 }}>Escribe tus franjas por día, separadas por coma. Ejemplo: 10:00-13:00, 17:00-20:00. Vacío = no disponible.</p>
          {DAYS.map(([k, label]) => (
            <div key={k} className="os-form-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, alignItems: 'center' }}>
              <label className="os-label">{label}</label>
              <input className="os-input" value={(av.week[k] ?? []).join(', ')} placeholder="No disponible"
                onChange={e => setAv({ ...av, week: { ...av.week, [k]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <div className="os-form-group"><label className="os-label">Duración (min)</label><input className="os-input" type="number" value={av.duration} onChange={e => setAv({ ...av, duration: Number(e.target.value) })} /></div>
            <div className="os-form-group"><label className="os-label">Antelación mínima (horas)</label><input className="os-input" type="number" value={av.minNoticeHours} onChange={e => setAv({ ...av, minNoticeHours: Number(e.target.value) })} /></div>
            <div className="os-form-group"><label className="os-label">Días que se ofrecen</label><input className="os-input" type="number" value={av.daysShown} onChange={e => setAv({ ...av, daysShown: Number(e.target.value) })} /></div>
            <div className="os-form-group"><label className="os-label">Zona horaria</label><input className="os-input" value={av.timeZone} onChange={e => setAv({ ...av, timeZone: e.target.value })} /></div>
          </div>
          <div className="os-form-group"><label className="os-label">Nota en el email de confirmación (opcional)</label><input className="os-input" value={av.meetingNote} onChange={e => setAv({ ...av, meetingNote: e.target.value })} /></div>
          <div><button className="os-btn" disabled={saving} onClick={() => void saveHours()}>{saving ? 'Guardando…' : 'Guardar horario'}</button></div>
        </div>
      )}
    </div>
  )
}
