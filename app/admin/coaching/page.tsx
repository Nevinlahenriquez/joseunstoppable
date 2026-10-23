'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus, Search, Send } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Avatar, Empty, Sheet, Spinner } from '@/components/coach/ui'
import InviteSheet from '@/components/coach/admin/InviteSheet'
import { useArea } from '@/components/coach/admin/CoachArea'
import { adherence } from '@/lib/coach/fitness'
import { addDays, daysBetween, uid, ymd } from '@/lib/coach/util'
import { getPeople } from '@/lib/people'
import type { Client } from '@/lib/coach/types'

interface Row { c: Client; avatar?: string; last?: string; adh: number; planned: number; weightDelta: number | null; unread: number; review: number; next?: string; alerts: string[] }

const STATUS: Record<Client['status'], [string, string]> = { active: ['Activo', 'ca-pill-ok'], invited: ['Invitado', 'ca-pill-warn'], paused: ['En pausa', ''] }

export default function CoachClients() {
  const router = useRouter()
  const { coach } = useCoach()
  const { toast } = useArea()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'attention' | 'invited'>('all')
  const [adding, setAdding] = useState(false)
  const [invite, setInvite] = useState<Client | null>(null)

  const { data, reload } = useData(async s => {
    const [clients, workouts, logs, metrics, messages] = await Promise.all([s.list('clients'), s.list('workouts'), s.list('logs'), s.list('metrics'), s.list('messages')])
    const today = ymd()
    const rows: Row[] = clients.map(c => {
      const w = workouts.filter(x => x.clientId === c.id)
      const l = logs.filter(x => x.clientId === c.id && x.finishedAt).sort((a, b) => b.date.localeCompare(a.date))
      const a = adherence(w, l, addDays(today, -13), today)
      const wt = metrics.filter(m => m.clientId === c.id && m.type === 'weight').sort((x, y) => x.date.localeCompare(y.date))
      const unread = messages.filter(m => m.clientId === c.id && m.from === 'client' && !m.read).length
      const doneIds = new Set(l.map(x => x.workoutId))
      const next = w.filter(x => x.date && x.date >= today && !doneIds.has(x.id)).sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''))[0]?.date
      const alerts: string[] = []
      if (c.status === 'active') {
        if (!l.length) alerts.push('Aún no ha registrado ningún entreno')
        else if (daysBetween(l[0].date, today) >= 7) alerts.push(`${daysBetween(l[0].date, today)} días sin entrenar`)
        if (!next && w.length) alerts.push('No tiene entrenos programados')
        if (!w.length) alerts.push('Sin entrenos asignados')
      }
      const review = l.filter(x => !x.reviewedAt).length
      if (review) alerts.push(`${review} entreno${review > 1 ? 's' : ''} por revisar`)
      if (unread) alerts.push(`${unread} mensaje${unread > 1 ? 's' : ''} sin leer`)
      return { c, review, last: l[0]?.date, adh: a.pct, planned: a.planned, weightDelta: wt.length > 1 ? Math.round((wt[wt.length - 1].value - wt[0].value) * 10) / 10 : null, unread, next, alerts }
    })
    return rows.sort((x, y) => y.alerts.length - x.alerts.length || x.c.name.localeCompare(y.c.name))
  })

  const list = useMemo(() => (data ?? []).filter(r => {
    if (q && !`${r.c.name} ${r.c.email}`.toLowerCase().includes(q.toLowerCase())) return false
    if (filter === 'active') return r.c.status === 'active'
    if (filter === 'invited') return r.c.status === 'invited'
    if (filter === 'attention') return r.alerts.length > 0
    return true
  }), [data, q, filter])

  const kpi = useMemo(() => {
    const d = data ?? []
    const act = d.filter(r => r.c.status === 'active')
    const withPlan = act.filter(r => r.planned)
    return {
      active: act.length,
      adh: withPlan.length ? Math.round(withPlan.reduce((n, r) => n + r.adh, 0) / withPlan.length) : 0,
      attention: d.filter(r => r.alerts.length).length,
      unread: d.reduce((n, r) => n + r.unread, 0),
      review: d.reduce((n, r) => n + r.review, 0),
    }
  }, [data])

  return (
    <div>
      <div className="ca-page-head">
        <div><h1>Clientes</h1><p className="ca-muted">Entrenos, nutrición y progreso de cada persona que entrena con {coach.name.split(' ')[0]}.</p></div>
        <button className="ca-btn" onClick={() => setAdding(true)}><Plus size={18} /> Nuevo cliente</button>
      </div>
      {!data ? <Spinner /> : (
        <div className="ca-stack">
          <div className="ca-kpis">
            <div className="ca-kpi"><b>{kpi.active}</b><small>Clientes activos</small></div>
            <div className="ca-kpi"><b>{kpi.adh}%</b><small>Cumplimiento (14 días)</small></div>
            <div className="ca-kpi"><b style={{ color: kpi.attention ? 'var(--bad)' : undefined }}>{kpi.attention}</b><small>Necesitan atención</small></div>
            <div className="ca-kpi"><b>{kpi.review}</b><small>Entrenos por revisar · {kpi.unread} mensajes</small></div>
          </div>
          <div className="ca-row" style={{ flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={17} style={{ position: 'absolute', left: 12, top: 15, color: 'var(--muted)' }} />
              <input className="ca-input" style={{ paddingLeft: 38 }} placeholder="Buscar por nombre o email" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
            </div>
            <div className="ca-chips">
              {([['all', 'Todos'], ['attention', 'Atención'], ['active', 'Activos'], ['invited', 'Invitados']] as const).map(([k, l]) => <button key={k} className={`ca-chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
            </div>
          </div>
          {!data.length ? (
            <Empty icon="🏋️" title="Tu primer cliente" text="Añade a alguien, invítale por WhatsApp y su app se abre con su ficha inicial." action={<button className="ca-btn" onClick={() => setAdding(true)}><Plus size={18} /> Nuevo cliente</button>} />
          ) : (
            <div className="ca-table-wrap">
              <table className="ca-table">
                <thead><tr><th>Cliente</th><th>Estado</th><th>Último entreno</th><th>Cumplimiento</th><th>Peso</th><th>Próximo</th><th /></tr></thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.c.id} className="click" onClick={() => router.push(`/admin/coaching/${r.c.id}`)}>
                      <td>
                        <div className="ca-row" style={{ gap: 10 }}>
                          <Avatar name={r.c.name} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <b style={{ color: 'var(--ink)' }}>{r.c.name}</b>
                            {r.alerts.length > 0 && <div style={{ color: 'var(--bad)', fontSize: 12.5, fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center' }}><AlertTriangle size={13} /> {r.alerts[0]}</div>}
                          </div>
                        </div>
                      </td>
                      <td><span className={`ca-pill ${STATUS[r.c.status][1]}`}>{STATUS[r.c.status][0]}</span></td>
                      <td>{r.last ? fmtAgo(r.last) : <span className="ca-muted">Nunca</span>}</td>
                      <td style={{ minWidth: 120 }}>{r.planned ? <div className="ca-stack" style={{ gap: 4 }}><b style={{ color: 'var(--ink)' }}>{r.adh}%</b><div className="ca-progressbar"><i style={{ width: `${r.adh}%`, background: r.adh >= 75 ? 'var(--ok)' : r.adh >= 50 ? 'var(--warn)' : 'var(--bad)' }} /></div></div> : <span className="ca-muted">–</span>}</td>
                      <td>{r.weightDelta === null ? <span className="ca-muted">–</span> : <b style={{ color: 'var(--ink)' }}>{r.weightDelta > 0 ? '+' : ''}{r.weightDelta} kg</b>}</td>
                      <td>{r.next ? new Date(r.next + 'T12:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }) : <span className="ca-muted">–</span>}</td>
                      <td onClick={e => e.stopPropagation()}><button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => setInvite(r.c)}><Send size={15} /> Invitar</button></td>
                    </tr>
                  ))}
                  {!list.length && <tr><td colSpan={7} className="ca-muted" style={{ textAlign: 'center', padding: 28 }}>Nadie coincide con ese filtro.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <AddClient open={adding} existing={(data ?? []).map(r => r.c.email.toLowerCase())} coachId={coach.id} onClose={() => setAdding(false)}
        onAdded={c => { setAdding(false); reload(); toast(`${c.name} añadido`); setInvite(c) }} />
      <InviteSheet client={invite} onClose={() => setInvite(null)} />
    </div>
  )
}

function fmtAgo(d: string) {
  const n = daysBetween(d, ymd())
  return n <= 0 ? 'Hoy' : n === 1 ? 'Ayer' : `Hace ${n} días`
}

function AddClient({ open, existing, coachId, onClose, onAdded }: { open: boolean; existing: string[]; coachId: string; onClose: () => void; onAdded: (c: Client) => void }) {
  const { store } = useCoach()
  const [f, setF] = useState({ name: '', email: '', phone: '', plan: '' })
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // People already in the CRM (leads, deals, event guests), so nobody is retyped.
  const people = useMemo(() => { try { return open ? getPeople().filter(p => p.email) : [] } catch { return [] } }, [open])
  const pick = (name: string) => {
    const p = people.find(x => x.name === name)
    setF(s => ({ ...s, name, ...(p ? { email: p.email, phone: p.phone || s.phone } : {}) }))
  }

  async function save() {
    const email = f.email.trim().toLowerCase()
    if (!f.name.trim()) { setErr('Escribe su nombre.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr('Escribe un email válido. Es con lo que entra a la app.'); return }
    if (existing.includes(email)) { setErr('Ya hay un cliente con ese email.'); return }
    setSaving(true); setErr(null)
    const c: Client = { id: uid('cl-'), coachId, name: f.name.trim(), email, phone: f.phone.trim() || undefined, plan: f.plan.trim() || undefined, status: 'invited', createdAt: new Date().toISOString() }
    try { await store.put('clients', c); setF({ name: '', email: '', phone: '', plan: '' }); onAdded(c) }
    catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo cliente"
      footer={<><button className="ca-btn ca-btn-ghost" onClick={onClose}>Cancelar</button><button className="ca-btn" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Añadir'}</button></>}>
      <div className="ca-stack">
        <label className="ca-field"><span className="ca-label">Nombre</span>
          <input className="ca-input" list="crm-people" value={f.name} onChange={e => pick(e.target.value)} placeholder="Nombre y apellido" autoFocus />
          <datalist id="crm-people">{people.slice(0, 200).map(p => <option key={p.key} value={p.name}>{p.email}</option>)}</datalist>
        </label>
        <label className="ca-field"><span className="ca-label">Email</span><input className="ca-input" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="con el que entrará" /></label>
        <div className="ca-grid2">
          <label className="ca-field"><span className="ca-label">WhatsApp</span><input className="ca-input" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+34 600 000 000" /></label>
          <label className="ca-field"><span className="ca-label">Plan (opcional)</span><input className="ca-input" value={f.plan} onChange={e => setF({ ...f, plan: e.target.value })} placeholder="Ej. Online 3 meses" /></label>
        </div>
        <p className="ca-muted" style={{ fontSize: 13.5, margin: 0 }}>La primera vez que entre, la app le pide su ficha (objetivo, medidas, experiencia, alimentación) y calcula sus calorías y macros.</p>
        {err && <div className="ca-alert" role="alert">{err}</div>}
      </div>
    </Sheet>
  )
}
