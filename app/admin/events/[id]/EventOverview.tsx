'use client'

import { useEffect, useMemo, useState } from 'react'
import EvIcon from '../EvIcon'
import type { CrmEvent, EventAttendee } from '@/lib/event-types'
import { computeEventAnalytics, type EventAnalytics } from '@/lib/event-analytics'
import { SHARED_DEFAULT_IMAGE } from '@/lib/event-images'
import { getDeals } from '@/lib/crm-store'

type Tab = 'overview' | 'details' | 'speakers' | 'schedule' | 'attendees' | 'emails' | 'settings'

const card: React.CSSProperties = { background: 'var(--os-card)', backgroundImage: 'var(--os-card-image, none)', border: '1px solid var(--os-line)', borderRadius: 20, padding: '20px 22px', boxShadow: '0 2px 12px rgba(20,10,40,.05)' }
const h: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--os-text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }
const pct = (n: number | null) => (n === null ? 'n/d' : `${Math.round(n * 100)}%`)
const money = (n: number, cur: string) => cur === 'USD' ? `$${n.toLocaleString('es-ES')}` : `${n.toLocaleString('es-ES')} €`

function localAnalytics(event: CrmEvent, attendees: EventAttendee[]): EventAnalytics {
  return computeEventAnalytics(
    { id: event.id, slug: event.slug, title: event.title, status: event.status, date: event.date, time: event.time, timezone: event.timezone, price: event.price, currency: event.currency, capacity: event.capacity },
    attendees.map(a => ({ email: a.email, status: a.status, paid: a.paid, paid_amount: a.paidAmount, checked_in: a.checkedIn, source: a.source, registered_at: a.registeredAt })),
    [],
    getDeals().map(d => ({ client_email: d.clientEmail ?? null, stage: d.stage ?? null })),
  )
}

export default function EventOverview({ event, attendees, goTo }: { event: CrmEvent; attendees: EventAttendee[]; goTo: (t: Tab) => void }) {
  const local = useMemo(() => localAnalytics(event, attendees), [event, attendees])
  const [remote, setRemote] = useState<EventAnalytics | null>(null)
  const [remoteFailed, setRemoteFailed] = useState(false)
  const [insights, setInsights] = useState<{ lines: string[]; via: string; note?: string } | null>(null)
  const [thinking, setThinking] = useState(false)
  const [insightError, setInsightError] = useState('')

  useEffect(() => {
    let alive = true
    fetch(`/api/os/events/analytics?id=${encodeURIComponent(event.id)}`)
      .then(r => r.json())
      .then(j => { if (!alive) return; if (j?.ok) setRemote(j.analytics); else setRemoteFailed(true) })
      .catch(() => { if (alive) setRemoteFailed(true) })
    return () => { alive = false }
  }, [event.id])

  const a = remote ?? local
  const isPaid = a.event.price > 0
  const before = a.daysToGo !== null && a.daysToGo >= 0

  async function askInsight() {
    setThinking(true); setInsightError('')
    try {
      const r = await fetch('/api/os/events/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: event.id }) })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'No se pudo leer este evento.')
      setInsights({ lines: j.insights ?? [], via: j.via, note: j.note })
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : 'No se pudo leer este evento.')
    } finally { setThinking(false) }
  }

  const isOnline = event.format !== 'in_person'
  const checks: { label: string; ok: boolean; fix: Tab; hint: string }[] = [
    { label: 'Imagen propia', ok: !!(event.thumbnailImage || event.coverImage) && (event.thumbnailImage || event.coverImage) !== SHARED_DEFAULT_IMAGE, fix: 'details', hint: 'Elige una en Detalles' },
    { label: 'Fecha y hora', ok: !!event.date && !!event.time, fix: 'details', hint: 'Ponla en Detalles' },
    { label: isOnline ? 'Enlace para unirse (solo a inscritos)' : 'Dirección', ok: !!event.location?.trim(), fix: 'details', hint: isOnline ? 'Pega el enlace de Meet en Detalles' : 'Añade la dirección en Detalles' },
    { label: 'Descripción que venda el resultado', ok: (event.description || '').replace(/<[^>]+>/g, '').trim().length > 80, fix: 'details', hint: 'Escríbela en Detalles' },
    { label: 'Límite de plazas', ok: event.capacity > 0, fix: 'details', hint: 'Pon el aforo en Detalles' },
    { label: 'Programa', ok: event.agenda.length > 0, fix: 'schedule', hint: 'Añádelo en Programa' },
    { label: 'Publicado', ok: event.status === 'published', fix: 'details', hint: 'Tú decides: publícalo cuando esté listo para vender' },
  ]
  const done = checks.filter(c => c.ok).length

  const funnel = [
    { label: 'Vieron la página', value: a.visitors, note: remote ? '' : 'necesita el servidor' },
    { label: isPaid ? 'Pagaron su plaza' : 'Se inscribieron', value: a.registered, note: '' },
    { label: 'Vinieron', value: a.showedUp, note: before ? 'después del evento' : '' },
    { label: 'En el pipeline o clientes', value: a.inPipeline + a.becameClients, note: '' },
  ]
  const top = Math.max(1, ...funnel.map(f => f.value))

  const maxViews = Math.max(1, ...a.byDay.map(d => d.views))
  const maxSignups = Math.max(1, ...a.byDay.map(d => d.registered))

  const tiles = [
    { icon: 'ti-clock', tint: 'rgba(139,92,246,.14)', color: '#0E71AC', label: before ? (a.daysToGo === 0 ? 'Hoy' : 'Días que faltan') : 'Hace (días)', value: a.daysToGo === null ? 'n/d' : a.daysToGo === 0 ? 'En directo' : String(Math.abs(a.daysToGo)) },
    { icon: 'ti-ticket', tint: 'rgba(234,169,46,.16)', color: '#C27C0E', label: isPaid ? 'Plazas pagadas' : 'Inscritos', value: `${a.registered}${a.event.capacity ? ` / ${a.event.capacity}` : ''}` },
    { icon: 'ti-cash', tint: 'var(--os-good-soft)', color: 'var(--os-good)', label: 'Ingresos por entradas', value: money(a.revenue, a.event.currency) },
    { icon: 'ti-eye', tint: 'rgba(59,130,246,.14)', color: '#2563EB', label: 'De visita a inscripción', value: pct(a.visitToSignup) },
    { icon: 'ti-check', tint: 'rgba(236,72,153,.12)', color: '#DB2777', label: isPaid ? 'Pago completado' : 'Asistencia', value: isPaid ? pct(a.signupToPaid) : pct(a.showRate) },
    { icon: 'ti-users', tint: 'rgba(16,185,129,.14)', color: '#059669', label: 'Se hicieron clientes', value: String(a.becameClients) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="evx-tiles">
        {tiles.map(t => (
          <div key={t.label} className="evx-tile">
            <div className="evx-kpi-icon" style={{ background: t.tint, color: t.color, width: 38, height: 38, borderRadius: 12 }}><EvIcon name={t.icon} size={18} /></div>
            <div className="evx-kpi-n" style={{ fontSize: 24 }}>{t.value}</div>
            <div className="evx-kpi-l">{t.label}</div>
          </div>
        ))}
      </div>

      {a.unpaid > 0 && (
        <div style={{ ...card, borderColor: 'var(--os-warn)', background: 'var(--os-warn-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--os-text)' }}><strong>{a.unpaid}</strong> empezaron el pago y no lo terminaron. Un mensaje personal a cada uno es la plaza más barata que venderás.</div>
          <button onClick={() => goTo('attendees')} style={{ background: 'none', border: '1.5px solid var(--os-warn)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: 'var(--os-warn)', cursor: 'pointer' }}>Ver quiénes</button>
        </div>
      )}

      {}
      <div style={{ ...card, background: 'linear-gradient(135deg,rgba(14,113,172,.12),rgba(234,169,46,.06))', borderColor: 'rgba(139,92,246,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--os-text)', display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--os-accent)', display: 'inline-flex' }}><EvIcon name="ti-sparkles" size={18} /></span> Análisis de este evento</div>
            <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)', marginTop: 3 }}>Lee los números reales de abajo y te dice el siguiente paso. Nunca envía nada.</div>
          </div>
          <button onClick={askInsight} disabled={thinking} style={{ background: 'var(--os-accent)', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: thinking ? 'wait' : 'pointer', opacity: thinking ? 0.7 : 1 }}>
            {thinking ? 'Leyendo…' : insights ? 'Leer otra vez' : 'Leer los números'}
          </button>
        </div>
        {insightError && <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--os-bad)' }}>{insightError}</div>}
        {insights && (
          <ul style={{ margin: '14px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.lines.length ? insights.lines.map((l, i) => <li key={i} style={{ fontSize: 13.5, color: 'var(--os-text)', lineHeight: 1.5 }}>{l}</li>)
              : <li style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Aún no destaca nada. Vuelve cuando la gente empiece a inscribirse.</li>}
          </ul>
        )}
        {insights?.note && <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--os-text-faint)' }}>{insights.note}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        {}
        <div style={card}>
          <div style={h}>De la página a cliente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {funnel.map(f => (
              <div key={f.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 4 }}>
                  <span>{f.label}{f.note && <span style={{ color: 'var(--os-text-faint)', fontWeight: 500 }}> · {f.note}</span>}</span><span>{f.value}</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: 'var(--os-line)', overflow: 'hidden' }}>
                  <div style={{ width: `${(f.value / top) * 100}%`, height: '100%', background: 'var(--os-accent)', borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
          {!remote && remoteFailed && <div style={{ fontSize: 11.5, color: 'var(--os-text-faint)', marginTop: 10 }}>No se pudieron leer las visitas aquí, así que las plazas y el dinero vienen de la copia de este navegador.</div>}
          {remote && <div style={{ fontSize: 11.5, color: 'var(--os-text-faint)', marginTop: 10 }}>Las visitas se cuentan desde el 9 de octubre de 2026.</div>}
        </div>

        {}
        <div style={card}>
          <div style={{ ...h, display: 'flex', justifyContent: 'space-between' }}><span>Listo para vender</span><span>{done} de {checks.length}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checks.map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span aria-hidden style={{ width: 18, height: 18, borderRadius: 100, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', background: c.ok ? 'var(--os-good)' : 'transparent', border: c.ok ? 'none' : '1.5px solid var(--os-text-faint)' }}>{c.ok ? '✓' : ''}</span>
                <span style={{ flex: 1, color: c.ok ? 'var(--os-text-muted)' : 'var(--os-text)', fontWeight: c.ok ? 500 : 700 }}>{c.label}</span>
                {!c.ok && <button onClick={() => goTo(c.fix)} style={{ background: 'none', border: 'none', color: 'var(--os-accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, textAlign: 'right' }}>{c.hint}</button>}
              </div>
            ))}
          </div>
        </div>

        {}
        <div style={card}>
          <div style={h}>Últimos 21 días</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
            {a.byDay.map(d => (
              <div key={d.day} title={`${d.day}: ${d.registered} inscritos, ${d.views} visitas`} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1, height: '100%' }}>
                <div style={{ flex: 1, height: `${(d.views / maxViews) * 100}%`, minHeight: d.views ? 2 : 0, background: 'var(--os-line)', borderRadius: 2 }} />
                <div style={{ flex: 1, height: `${(d.registered / maxSignups) * 100}%`, minHeight: d.registered ? 2 : 0, background: 'var(--os-accent)', borderRadius: 2 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--os-text-faint)', marginTop: 8 }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--os-accent)', borderRadius: 2, marginRight: 5 }} />Inscripciones</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--os-line)', borderRadius: 2, marginRight: 5 }} />Visitas</span>
          </div>
        </div>

        {}
        <div style={card}>
          <div style={h}>De dónde vienen</div>
          {[...(a.referrers.length ? [{ title: 'Visitas', rows: a.referrers }] : []), { title: 'Inscripciones', rows: a.sources }].map(g => (
            <div key={g.title} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--os-text-muted)', marginBottom: 6 }}>{g.title}</div>
              {g.rows.length === 0 ? <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)' }}>Nada todavía.</div> : g.rows.map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--os-text)' }}>
                  <span>{r.label.charAt(0).toUpperCase() + r.label.slice(1)}</span><span style={{ fontWeight: 700 }}>{r.count}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {!before && a.registered > 0 && (
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--os-text)' }}>
            <strong>{a.showedUp}</strong> vinieron, <strong>{a.inPipeline}</strong> están en el pipeline y <strong>{a.becameClients}</strong> se hicieron clientes. Quien vino y no está en el pipeline es tu lista de seguimiento.
          </div>
          <button onClick={() => goTo('attendees')} style={{ background: 'none', border: '1.5px solid var(--os-line)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: 'var(--os-accent)', cursor: 'pointer' }}>Abrir la lista</button>
        </div>
      )}
    </div>
  )
}
