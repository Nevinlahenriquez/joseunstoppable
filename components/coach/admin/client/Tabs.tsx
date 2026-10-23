'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CalendarPlus, Check, List, Plus, Send, Trash2 } from 'lucide-react'
import type { Checkin, Client, Exercise, Message, Metric, MetricType, NutritionPlan, Photo, Workout, WorkoutLog } from '@/lib/coach/types'
import { useCoach } from '@/lib/coach/store'
import { Empty, LineChart, Ring, Sheet } from '@/components/coach/ui'
import ExerciseProgress from '@/components/coach/ExerciseProgress'
import { PhotoCompare, PhotoTimeline } from '@/components/coach/Photos'
import WorkoutEditor, { newWorkout } from '../WorkoutEditor'
import NutritionEditor, { newPlan } from '../NutritionEditor'
import { useArea } from '../CoachArea'
import { Agenda, SessionReview, needsReview } from './Session'
import { achievements } from '@/lib/coach/achievements'
import { adherence, bmi, exerciseHistory, targetsFrom } from '@/lib/coach/fitness'
import { METRICS } from '@/lib/coach/metrics'
import { addDays, ageFrom, daysBetween, fmtDuration, parseYmd, uid, weekStart, ymd } from '@/lib/coach/util'

export interface ClientData {
  client: Client
  workouts: Workout[]
  logs: WorkoutLog[]
  metrics: Metric[]
  photos: Photo[]
  nutrition: NutritionPlan[]
  messages: Message[]
  checkins: Checkin[]
  exercises: Exercise[]
  templates: Workout[]
  foodTemplates: NutritionPlan[]
}
interface P { d: ClientData; reload: () => void; patch: (p: Partial<ClientData>) => void }

const day = (s: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => parseYmd(s).toLocaleDateString('es', o)
const GOAL: Record<string, string> = { lose_fat: 'Perder grasa', recomp: 'Recomposición', gain_muscle: 'Ganar músculo', strength: 'Fuerza', health: 'Salud y energía', performance: 'Rendimiento' }

function finished(d: ClientData) { return d.logs.filter(l => l.finishedAt).sort((a, b) => b.date.localeCompare(a.date)) }

// ── Resumen ────────────────────────────────────────────────────────────────
export function Summary({ d, go }: P & { go: (t: 'train' | 'progress' | 'food' | 'chat' | 'checkins' | 'photos' | 'profile') => void }) {
  const today = ymd()
  const done = finished(d)
  const a4 = adherence(d.workouts, done, addDays(today, -27), today)
  const weights = d.metrics.filter(m => m.type === 'weight').sort((a, b) => a.date.localeCompare(b.date))
  const wDelta = weights.length > 1 ? Math.round((weights[weights.length - 1].value - weights[0].value) * 10) / 10 : null
  const doneIds = new Set(done.map(l => l.workoutId))
  const upcoming = d.workouts.filter(w => w.date && w.date >= today && !doneIds.has(w.id)).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 4)
  const ws = weekStart(today)
  const week = adherence(d.workouts, done, ws, addDays(ws, 6))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
  const badges = achievements(d.logs, d.metrics, d.photos, d.checkins, d.exercises.map(e => e.id))
  const lastCi = [...d.checkins].sort((a, b) => b.date.localeCompare(a.date))[0]
  const unread = d.messages.filter(m => m.from === 'client' && !m.read)
  const alerts: [string, Parameters<typeof go>[0]][] = []
  if (!d.client.intake) alerts.push(['Todavía no ha rellenado su ficha inicial.', 'profile'])
  if (!upcoming.length) alerts.push(['No tiene entrenos programados. Asígnale una plantilla.', 'train'])
  if (!d.nutrition.length) alerts.push(['Sin plan de nutrición.', 'food'])
  if (done[0] && daysBetween(done[0].date, today) >= 7) alerts.push([`${daysBetween(done[0].date, today)} días sin entrenar.`, 'train'])
  const toReview = d.logs.filter(needsReview).length
  if (toReview) alerts.push([`${toReview} entreno${toReview > 1 ? 's' : ''} terminado${toReview > 1 ? 's' : ''} por revisar.`, 'train'])
  if (unread.length) alerts.push([`${unread.length} mensaje${unread.length > 1 ? 's' : ''} sin leer.`, 'chat'])

  return (
    <div className="ca-stack">
      {alerts.map(([t, k]) => <button key={t} className="ca-alert" style={{ border: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => go(k)}>{t}</button>)}
      <div className="ca-kpis">
        <div className="ca-kpi"><b>{a4.planned ? `${a4.pct}%` : '–'}</b><small>Cumplimiento 4 semanas ({a4.done}/{a4.planned})</small></div>
        <div className="ca-kpi"><b>{done.length}</b><small>Entrenos completados</small></div>
        <div className="ca-kpi"><b>{wDelta === null ? '–' : `${wDelta > 0 ? '+' : ''}${wDelta} kg`}</b><small>Cambio de peso</small></div>
        <div className="ca-kpi"><b>{lastCi ? `${lastCi.energy}/5` : '–'}</b><small>Energía (último check-in)</small></div>
      </div>
      <div className="ca-split">
        <div className="ca-card ca-stack">
          <div className="ca-between"><h3>Peso</h3><button className="ca-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => go('progress')}>Ver progreso</button></div>
          <LineChart points={weights.map(m => ({ x: m.date, y: m.value }))} unit=" kg" height={150} />
          {d.client.intake && <div className="ca-muted" style={{ fontSize: 14 }}>Objetivo: {d.client.intake.targetWeightKg} kg · {GOAL[d.client.intake.goal]}</div>}
        </div>
        <div className="ca-card ca-stack">
          <div className="ca-between"><h3>Próximos entrenos</h3><button className="ca-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => go('train')}>Planificar</button></div>
          {upcoming.length ? <div className="ca-list">{upcoming.map(w => <div key={w.id} className="ca-li" style={{ cursor: 'default' }}><div className="ca-li-main"><div className="ca-li-title">{w.name}</div><div className="ca-li-sub">{day(w.date!)}</div></div></div>)}</div>
            : <div className="ca-muted" style={{ fontSize: 14 }}>Nada programado.</div>}
        </div>
      </div>
      <div className="ca-split">
        <div className="ca-card ca-stack">
          <div className="ca-between"><h3>Esta semana</h3><span className="ca-muted" style={{ fontSize: 13 }}>{day(ws, { day: 'numeric', month: 'short' })} – {day(addDays(ws, 6), { day: 'numeric', month: 'short' })}</span></div>
          <div className="ca-row" style={{ gap: 18, alignItems: 'center' }}>
            <Ring value={week.planned ? week.done / week.planned : 0} size={84}><b style={{ fontSize: 18, color: 'var(--ink)' }}>{week.done}/{week.planned}</b></Ring>
            <div className="ca-week">{weekDays.map((dt, i) => {
              const ws2 = d.workouts.filter(w => w.date === dt)
              const st = ws2.map(w => { const l = d.logs.find(x => x.workoutId === w.id); return l?.finishedAt ? 'ok' : dt < today ? 'bad' : 'plan' })
              return <div key={dt} className={dt === today ? 'today' : ''}><small>{WEEKDAYS[i]}</small><span className={st.includes('bad') ? 'bad' : st.includes('ok') ? 'ok' : st.length ? 'plan' : ''} /></div>
            })}</div>
          </div>
          <div className="ca-muted" style={{ fontSize: 13.5 }}>{week.planned ? `${week.done} de ${week.planned} entrenos hechos esta semana.` : 'Sin entrenos esta semana.'}</div>
        </div>
        <div className="ca-card ca-stack">
          <h3>Logros</h3>
          <div className="ca-badges">{badges.map(b => (
            <div key={b.id} className={b.earned ? 'on' : ''} title={b.detail}><span>{b.icon}</span><b>{b.title}</b><small>{b.detail}</small></div>
          ))}</div>
        </div>
      </div>
      <div className="ca-card ca-stack">
        <h3>Últimas sesiones</h3>
        {done.length ? <div className="ca-list">{done.slice(0, 6).map(l => (
          <div key={l.id} className="ca-li" style={{ cursor: 'default', alignItems: 'flex-start' }}>
            <div className="ca-li-main">
              <div className="ca-li-title">{l.workoutName} {needsReview(l) && <span className="ca-pill" style={{ marginLeft: 6 }}>Por revisar</span>}</div>
              <div className="ca-li-sub">{day(l.date)}{l.durationSec ? ` · ${fmtDuration(l.durationSec)}` : ''}{l.rpe ? ` · RPE ${l.rpe}` : ''}{l.rating ? ` · ${'★'.repeat(l.rating)}` : ''}</div>
              {l.comment && <div style={{ fontSize: 14, marginTop: 4 }}>“{l.comment}”</div>}
            </div>
          </div>
        ))}</div> : <div className="ca-muted" style={{ fontSize: 14 }}>Todavía no ha registrado ninguna sesión.</div>}
      </div>
      {d.client.intake?.why && <div className="ca-card"><div className="ca-label">Su porqué</div><div style={{ marginTop: 6 }}>{d.client.intake.why}</div></div>}
    </div>
  )
}

// ── Entrenos ───────────────────────────────────────────────────────────────
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Trainings({ d, reload, patch }: P) {
  const { store } = useCoach()
  const { toast } = useArea()
  const [edit, setEdit] = useState<Workout | null>(null)
  const [assign, setAssign] = useState(false)
  const [view, setView] = useState<WorkoutLog | null>(null)
  const [show, setShow] = useState<'next' | 'past' | 'review' | 'cal'>(() => (d.logs.some(needsReview) ? 'review' : 'next'))
  const today = ymd()
  const logBy = useMemo(() => new Map(d.logs.map(l => [l.workoutId, l])), [d.logs])
  const dated = d.workouts.filter(w => w.date)
  const toReview = d.logs.filter(needsReview).sort((a, b) => b.date.localeCompare(a.date))
  const list = show === 'review' ? d.workouts.filter(w => toReview.some(l => l.workoutId === w.id)).sort((a, b) => (logBy.get(b.id)?.date ?? '').localeCompare(logBy.get(a.id)?.date ?? ''))
    : show === 'next' ? dated.filter(w => w.date! >= today).sort((a, b) => a.date!.localeCompare(b.date!)) : dated.filter(w => w.date! < today).sort((a, b) => b.date!.localeCompare(a.date!))
  const anytime = d.workouts.filter(w => !w.date)

  async function save(w: Workout) {
    const row = { ...w, id: w.id || uid('wo-'), clientId: d.client.id }
    await store.put('workouts', row)
    setEdit(null); reload(); toast('Entreno guardado')
  }
  async function remove(w: Workout) {
    if (logBy.get(w.id)?.finishedAt && !window.confirm('Este entreno ya está hecho. Si lo borras, su registro sigue en el progreso. ¿Borrar?')) return
    await store.remove('workouts', w.id)
    setEdit(null); reload(); toast('Entreno borrado')
  }

  const status = (w: Workout) => {
    const l = logBy.get(w.id)
    if (l?.finishedAt && needsReview(l)) return <span className="ca-pill">Por revisar</span>
    if (l?.finishedAt) return <span className="ca-pill ca-pill-ok"><Check size={13} /> Revisado</span>
    if (l) return <span className="ca-pill ca-pill-warn">Empezado</span>
    if (w.date && w.date < today) return <span className="ca-pill" style={{ background: '#FCE4E2', color: 'var(--bad)' }}>No hecho</span>
    return <span className="ca-pill">Pendiente</span>
  }
  const Row = ({ w }: { w: Workout }) => {
    const l = logBy.get(w.id)
    return (
      <tr className="click" onClick={() => (l?.finishedAt ? setView(l) : setEdit(w))}>
        <td style={{ whiteSpace: 'nowrap' }}>{w.date ? day(w.date) : 'Cuando quiera'}</td>
        <td><b style={{ color: 'var(--ink)' }}>{w.name}</b><div className="ca-muted" style={{ fontSize: 13 }}>{w.blocks.reduce((n, b) => n + b.items.length, 0)} ejercicios</div></td>
        <td>{status(w)}</td>
        <td className="ca-muted" style={{ fontSize: 13.5 }}>{l?.finishedAt ? [l.rpe ? `RPE ${l.rpe}` : '', l.rating ? '★'.repeat(l.rating) : '', l.comment ? `“${l.comment.slice(0, 50)}”` : ''].filter(Boolean).join(' · ') : ''}</td>
      </tr>
    )
  }

  return (
    <div className="ca-stack">
      <div className="ca-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="ca-chips">
          <button className={`ca-chip${show === 'review' ? ' on' : ''}`} onClick={() => setShow('review')}>Por revisar{toReview.length ? ` (${toReview.length})` : ''}</button>
          <button className={`ca-chip${show === 'next' ? ' on' : ''}`} onClick={() => setShow('next')}><List size={14} style={{ verticalAlign: -2 }} /> Próximos</button>
          <button className={`ca-chip${show === 'past' ? ' on' : ''}`} onClick={() => setShow('past')}>Anteriores</button>
          <button className={`ca-chip${show === 'cal' ? ' on' : ''}`} onClick={() => setShow('cal')}><CalendarDays size={14} style={{ verticalAlign: -2 }} /> Calendario</button>
        </div>
        <div className="ca-row" style={{ flexWrap: 'wrap' }}>
          <button className="ca-btn ca-btn-ghost" onClick={() => setEdit(newWorkout(d.client.coachId, d.client.id, today))}><Plus size={17} /> Entreno suelto</button>
          <button className="ca-btn" onClick={() => setAssign(true)}><CalendarPlus size={17} /> Asignar plantilla</button>
        </div>
      </div>
      {show === 'cal' ? <Agenda d={d} onOpen={w => { const l = logBy.get(w.id); if (l?.finishedAt) setView(l); else setEdit(w) }} onAdd={date => setEdit(newWorkout(d.client.coachId, d.client.id, date))} />
      : list.length ? (
        <div className="ca-table-wrap"><table className="ca-table">
          <thead><tr><th>Fecha</th><th>Entreno</th><th>Estado</th><th>Cómo le fue</th></tr></thead>
          <tbody>{list.map(w => <Row key={w.id} w={w} />)}</tbody>
        </table></div>
      ) : show === 'review' ? <Empty icon="✅" title="Todo revisado" text="Cuando termine un entreno, aparece aquí para que lo revises y le des feedback." />
      : <Empty icon="📅" title={show === 'next' ? 'Nada programado' : 'Sin entrenos anteriores'} text={show === 'next' ? 'Asigna una plantilla en los días que entrena y la app se los enseña cada día.' : undefined}
        action={show === 'next' ? <button className="ca-btn" onClick={() => setAssign(true)}><CalendarPlus size={17} /> Asignar plantilla</button> : undefined} />}
      {anytime.length > 0 && <div className="ca-card ca-stack"><h3>Cuando quiera</h3><div className="ca-table-wrap" style={{ border: 0 }}><table className="ca-table"><tbody>{anytime.map(w => <Row key={w.id} w={w} />)}</tbody></table></div></div>}

      <WorkoutEditor open={!!edit} initial={edit} exercises={d.exercises} withDate onClose={() => setEdit(null)} onSave={save} onDelete={remove} />
      {assign && <AssignSheet d={d} onClose={() => setAssign(false)} onDone={n => { setAssign(false); reload(); toast(`${n} entrenos programados`) }} />}
      <Sheet open={!!view} onClose={() => setView(null)} title={view?.workoutName} wide>
        {view && <SessionReview key={view.id} d={d} log={view}
          onSaved={(l, msgs) => { setView(l); patch({ logs: d.logs.map(x => (x.id === l.id ? l : x)), messages: [...d.messages, ...msgs] }) }}
          onEdit={() => { const w = d.workouts.find(x => x.id === view.workoutId); setView(null); if (w) setEdit(w) }} />}
      </Sheet>
    </div>
  )
}

function AssignSheet({ d, onClose, onDone }: { d: ClientData; onClose: () => void; onDone: (n: number) => void }) {
  const { store } = useCoach()
  const [picked, setPicked] = useState<string[]>([])
  const [start, setStart] = useState(() => { const t = ymd(); return addDays(weekStart(t), 7) })
  const [days, setDays] = useState<number[]>([0, 2, 4])
  const [weeks, setWeeks] = useState(4)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const plan = useMemo(() => {
    if (!picked.length || !days.length) return []
    const out: { date: string; t: Workout }[] = []
    let k = 0
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(start, i)
      const dow = (parseYmd(date).getDay() + 6) % 7
      if (!days.includes(dow)) continue
      const t = d.templates.find(x => x.id === picked[k % picked.length])
      if (t) out.push({ date, t })
      k++
    }
    return out
  }, [picked, days, weeks, start, d.templates])

  async function go() {
    setSaving(true); setErr(null)
    try {
      for (const { date, t } of plan) {
        await store.put('workouts', { ...t, id: uid('wo-'), clientId: d.client.id, date, createdAt: new Date().toISOString(), blocks: t.blocks.map(b => ({ ...b, items: b.items.map(i => ({ ...i })) })) })
      }
      onDone(plan.length)
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  return (
    <Sheet open onClose={onClose} title="Asignar plantilla" wide
      footer={<><button className="ca-btn ca-btn-ghost" onClick={onClose}>Cancelar</button><button className="ca-btn" disabled={!plan.length || saving} onClick={go}>{saving ? 'Programando…' : `Programar ${plan.length} entrenos`}</button></>}>
      <div className="ca-stack">
        {!d.templates.length && <div className="ca-alert info">No tienes plantillas todavía. Créalas en Plantillas y vuelve aquí.</div>}
        <div className="ca-field"><span className="ca-label">Plantillas (se alternan en este orden)</span>
          <div className="ca-chips">{d.templates.map(t => {
            const i = picked.indexOf(t.id)
            return <button key={t.id} className={`ca-chip${i >= 0 ? ' on' : ''}`} onClick={() => setPicked(p => (i >= 0 ? p.filter(x => x !== t.id) : [...p, t.id]))}>{i >= 0 ? `${i + 1}. ` : ''}{t.name}</button>
          })}</div>
        </div>
        <div className="ca-field"><span className="ca-label">Días que entrena</span>
          <div className="ca-chips">{WEEKDAYS.map((w, i) => <button key={i} className={`ca-chip${days.includes(i) ? ' on' : ''}`} style={{ minWidth: 44 }} onClick={() => setDays(x => (x.includes(i) ? x.filter(y => y !== i) : [...x, i].sort()))}>{w}</button>)}</div>
          {d.client.intake && <span className="ca-muted" style={{ fontSize: 13 }}>En su ficha dijo {d.client.intake.daysPerWeek} días por semana.</span>}
        </div>
        <div className="ca-grid2">
          <label className="ca-field"><span className="ca-label">Empieza</span><input className="ca-input" type="date" value={start} onChange={e => setStart(e.target.value || ymd())} /></label>
          <label className="ca-field"><span className="ca-label">Semanas</span><input className="ca-input" type="number" min={1} max={16} value={weeks} onChange={e => setWeeks(Math.max(1, Math.min(16, Number(e.target.value) || 1)))} /></label>
        </div>
        {plan.length > 0 && <div className="ca-card ca-card-tight" style={{ background: 'var(--mist)', fontSize: 14 }}>
          {plan.slice(0, 8).map(p => <div key={p.date}>{day(p.date)} · <b style={{ color: 'var(--ink)' }}>{p.t.name}</b></div>)}
          {plan.length > 8 && <div className="ca-muted">y {plan.length - 8} más</div>}
        </div>}
        {err && <div className="ca-alert">{err}</div>}
      </div>
    </Sheet>
  )
}

// ── Progreso ───────────────────────────────────────────────────────────────
export function Progress({ d }: P) {
  const done = finished(d)
  const trained = useMemo(() => {
    const ids = new Set(done.flatMap(l => Object.keys(l.sets)))
    return d.exercises.filter(e => ids.has(e.id) && exerciseHistory(done, e.id).length).map(e => {
      const h = exerciseHistory(done, e.id)
      return { e, n: h.length, diff: Math.round((h[h.length - 1].maxKg - h[0].maxKg) * 10) / 10, last: h[h.length - 1].maxKg }
    }).sort((a, b) => b.n - a.n)
  }, [done, d.exercises])
  const [ex, setEx] = useState<string | null>(null)
  const sel = ex ?? trained[0]?.e.id ?? null
  const [metric, setMetric] = useState<MetricType>('weight')
  const m = d.metrics.filter(x => x.type === metric).sort((a, b) => a.date.localeCompare(b.date))
  const unit = METRICS.find(x => x.k === metric)?.u ?? ''

  return (
    <div className="ca-stack">
      <div className="ca-card ca-stack">
        <h3>Medidas</h3>
        <div className="ca-chips">{METRICS.map(x => <button key={x.k} className={`ca-chip${metric === x.k ? ' on' : ''}`} onClick={() => setMetric(x.k)}>{x.t}</button>)}</div>
        <LineChart points={m.map(x => ({ x: x.date, y: x.value }))} unit={` ${unit}`} />
        {m.length > 0 && <div className="ca-muted" style={{ fontSize: 14 }}>Inicio {m[0].value} {unit} ({day(m[0].date, { day: 'numeric', month: 'short' })}) · Ahora {m[m.length - 1].value} {unit}</div>}
      </div>
      <div className="ca-side">
        <div className="ca-card" style={{ padding: '6px 14px' }}>
          {!trained.length && <div className="ca-muted" style={{ fontSize: 14, padding: '12px 0' }}>Cuando registre series, aquí ves cada ejercicio.</div>}
          <div className="ca-list">{trained.map(t => (
            <button key={t.e.id} className="ca-li" onClick={() => setEx(t.e.id)} style={{ background: sel === t.e.id ? 'var(--mist)' : undefined, borderRadius: 10, padding: '10px 8px' }}>
              <div className="ca-li-main"><div className="ca-li-title" style={{ fontSize: 14.5 }}>{t.e.name}</div><div className="ca-li-sub">{t.n} sesiones · {t.last} kg</div></div>
              {t.diff !== 0 && <span className={`ca-pill ${t.diff > 0 ? 'ca-pill-ok' : ''}`}>{t.diff > 0 ? '+' : ''}{t.diff}</span>}
            </button>
          ))}</div>
        </div>
        <div className="ca-card">
          {sel ? <><h3 style={{ marginBottom: 12 }}>{d.exercises.find(e => e.id === sel)?.name}</h3><ExerciseProgress logs={done} exerciseId={sel} /></> : <div className="ca-muted">Sin datos todavía.</div>}
        </div>
      </div>
    </div>
  )
}

// ── Nutrición ──────────────────────────────────────────────────────────────
export function Nutrition({ d, reload, patch }: P) {
  const { store } = useCoach()
  const { toast } = useArea()
  const current = useMemo(() => [...d.nutrition].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null, [d.nutrition])
  const [plan, setPlan] = useState<NutritionPlan | null>(current)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setPlan(current); setDirty(false) }, [current])

  const start = (p: NutritionPlan) => { setPlan(p); setDirty(true) }
  const fromTemplate = (id: string) => {
    const t = d.foodTemplates.find(x => x.id === id)
    if (!t) return
    start({ ...t, meals: t.meals.map(m => ({ ...m, options: m.options.map(o => ({ ...o, foods: o.foods.map(f => ({ ...f })) })) })), id: plan?.id || '', clientId: d.client.id, name: t.name, createdAt: plan?.createdAt || new Date().toISOString() })
  }

  async function save() {
    if (!plan) return
    setSaving(true)
    try {
      const row = { ...plan, id: plan.id || uid('np-'), clientId: d.client.id, name: plan.name || 'Plan de nutrición' }
      await store.put('nutrition', row)
      const client = { ...d.client, targets: row.targets }
      await store.put('clients', client)
      patch({ client }); setDirty(false); reload(); toast('Plan guardado. Ya lo ve en su app.')
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  const templatePicker = d.foodTemplates.length > 0 && (
    <select className="ca-select" style={{ maxWidth: 280 }} value="" onChange={e => e.target.value && fromTemplate(e.target.value)} aria-label="Cargar plantilla">
      <option value="">Cargar una plantilla…</option>
      {d.foodTemplates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.targets.kcal} kcal</option>)}
    </select>
  )

  if (!plan) return (
    <Empty icon="🥗" title="Sin plan de nutrición" text={d.client.targets ? `Su ficha calcula ${d.client.targets.kcal} kcal y ${d.client.targets.protein} g de proteína al día.` : 'Empieza de cero o desde una plantilla.'}
      action={<div className="ca-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="ca-btn" onClick={() => start({ ...newPlan(d.client.coachId, d.client.id, d.client.targets), name: 'Plan de nutrición' })}><Plus size={17} /> Plan nuevo</button>
        {templatePicker}
      </div>} />
  )

  return (
    <div className="ca-stack">
      <div className="ca-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <input className="ca-input" style={{ maxWidth: 360, fontWeight: 800 }} value={plan.name} onChange={e => start({ ...plan, name: e.target.value })} aria-label="Nombre del plan" />
        <div className="ca-row" style={{ flexWrap: 'wrap' }}>
          {templatePicker}
          {d.client.targets && <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => start({ ...plan, targets: targetsFrom(d.client.intake!) })} disabled={!d.client.intake}>Recalcular desde su ficha</button>}
        </div>
      </div>
      <NutritionEditor value={plan} onChange={p => start(p)} />
      <div style={{ position: 'sticky', bottom: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {dirty && <button className="ca-btn ca-btn-ghost" onClick={() => { setPlan(current); setDirty(false) }}>Descartar</button>}
        <button className="ca-btn" onClick={save} disabled={!dirty || saving}>{saving ? 'Guardando…' : dirty ? 'Guardar plan' : 'Guardado'}</button>
      </div>
    </div>
  )
}

// ── Fotos ──────────────────────────────────────────────────────────────────
export function PhotosTab({ d, reload }: P) {
  const { store } = useCoach()
  if (!d.photos.length) return <Empty icon="📸" title="Sin fotos todavía" text="El cliente sube sus fotos de frente, perfil y espalda desde Progreso en su app. Aquí ves el antes y el ahora." />
  return (
    <div className="ca-split">
      <div className="ca-card ca-stack"><h3>Antes y ahora</h3><PhotoCompare store={store} photos={d.photos} />{new Set(d.photos.map(p => p.date)).size < 2 && <div className="ca-muted" style={{ fontSize: 14 }}>Con una segunda fecha aparece la comparación.</div>}</div>
      <div className="ca-card ca-stack"><h3>Todas las fotos</h3><PhotoTimeline store={store} photos={d.photos} onRemove={async p => { if (window.confirm('¿Borrar esta foto?')) { await store.remove('photos', p.id); reload() } }} /></div>
    </div>
  )
}

// ── Check-ins ──────────────────────────────────────────────────────────────
export function Checkins({ d }: P) {
  const list = [...d.checkins].sort((a, b) => b.date.localeCompare(a.date))
  const [k, setK] = useState<'energy' | 'sleep' | 'stress' | 'hunger' | 'adherence'>('energy')
  if (!list.length) return <Empty icon="📝" title="Sin check-ins" text="Cada semana la app le pide cómo va: energía, sueño, estrés, hambre y cumplimiento." />
  const L = { energy: 'Energía', sleep: 'Sueño', stress: 'Estrés', hunger: 'Hambre', adherence: 'Cumplimiento' }
  return (
    <div className="ca-stack">
      <div className="ca-card ca-stack">
        <div className="ca-chips">{(Object.keys(L) as (keyof typeof L)[]).map(x => <button key={x} className={`ca-chip${k === x ? ' on' : ''}`} onClick={() => setK(x)}>{L[x]}</button>)}</div>
        <LineChart points={[...list].reverse().map(c => ({ x: c.date, y: c[k] }))} unit="/5" height={140} />
      </div>
      {list.map(c => (
        <div key={c.id} className="ca-card ca-stack" style={{ gap: 10 }}>
          <div className="ca-between"><b style={{ color: 'var(--ink)' }}>{day(c.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b></div>
          <div className="ca-macro">{(Object.keys(L) as (keyof typeof L)[]).map(x => <div key={x}><b>{c[x]}/5</b><small>{L[x]}</small></div>)}</div>
          {c.wins && <div><span className="ca-label">Lo mejor</span><div>{c.wins}</div></div>}
          {c.struggles && <div><span className="ca-label">Lo que costó</span><div>{c.struggles}</div></div>}
        </div>
      ))}
    </div>
  )
}

// ── Chat ───────────────────────────────────────────────────────────────────
export function ChatTab({ d, patch }: P) {
  const { store } = useCoach()
  const { toast } = useArea()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const msgs = useMemo(() => [...d.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [d.messages])
  useEffect(() => {
    const unread = d.messages.filter(m => m.from === 'client' && !m.read)
    if (!unread.length) return
    Promise.all(unread.map(m => store.put('messages', { ...m, read: true })))
      .then(() => patch({ messages: d.messages.map(m => (m.from === 'client' ? { ...m, read: true } : m)) })).catch(() => {})
  }, [d.messages, store, patch])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length])

  async function send() {
    const t = text.trim()
    if (!t) return
    const m: Message = { id: uid('msg-'), coachId: d.client.coachId, clientId: d.client.id, from: 'coach', text: t, read: false, createdAt: new Date().toISOString() }
    setText('')
    patch({ messages: [...d.messages, m] })
    try { await store.put('messages', m) } catch { patch({ messages: d.messages }); setText(t); toast('No se pudo enviar.') }
  }

  return (
    <div className="ca-card ca-stack">
      <div className="ca-stack" style={{ gap: 8, maxHeight: 480, overflowY: 'auto', padding: 4 }}>
        {!msgs.length && <div className="ca-muted" style={{ textAlign: 'center', fontSize: 14 }}>Escríbele: le llega en su app.</div>}
        {msgs.map(m => (
          <div key={m.id} className={`ca-bubble ${m.from === 'coach' ? 'me' : 'them'}`}>
            {m.text}<small>{new Date(m.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{m.from === 'coach' ? (m.read ? ' · Leído' : ' · Enviado') : ''}</small>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="ca-row" onSubmit={e => { e.preventDefault(); send() }}>
        <input className="ca-input" value={text} onChange={e => setText(e.target.value)} placeholder={`Mensaje para ${d.client.name.split(' ')[0]}`} aria-label="Mensaje" />
        <button className="ca-btn" style={{ flex: 'none' }} disabled={!text.trim()} aria-label="Enviar"><Send size={18} /></button>
      </form>
    </div>
  )
}

// ── Ficha ──────────────────────────────────────────────────────────────────
export function Profile({ d, reload, patch }: P) {
  const { store } = useCoach()
  const { toast } = useArea()
  const [c, setC] = useState(d.client)
  useEffect(() => setC(d.client), [d.client])
  const i = c.intake
  const dirty = JSON.stringify(c) !== JSON.stringify(d.client)
  async function save() {
    try { await store.put('clients', c); patch({ client: c }); toast('Ficha guardada') } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo guardar.') }
  }
  async function remove() {
    if (!window.confirm(`¿Borrar a ${c.name}? Su historial queda guardado pero deja de aparecer y no podrá entrar.`)) return
    await store.remove('clients', c.id)
    window.location.href = '/admin/coaching'
  }
  const T = c.targets ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <div className="ca-stack">
      <div className="ca-split">
        <div className="ca-card ca-stack">
          <h3>Datos</h3>
          <label className="ca-field"><span className="ca-label">Nombre</span><input className="ca-input" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} /></label>
          <label className="ca-field"><span className="ca-label">Email</span><input className="ca-input" type="email" value={c.email} onChange={e => setC({ ...c, email: e.target.value.trim().toLowerCase() })} /></label>
          <div className="ca-grid2">
            <label className="ca-field"><span className="ca-label">WhatsApp</span><input className="ca-input" value={c.phone ?? ''} onChange={e => setC({ ...c, phone: e.target.value || undefined })} /></label>
            <label className="ca-field"><span className="ca-label">Plan</span><input className="ca-input" value={c.plan ?? ''} onChange={e => setC({ ...c, plan: e.target.value || undefined })} /></label>
          </div>
          <label className="ca-field"><span className="ca-label">Estado</span>
            <select className="ca-select" value={c.status} onChange={e => setC({ ...c, status: e.target.value as Client['status'] })}>
              <option value="invited">Invitado</option><option value="active">Activo</option><option value="paused">En pausa</option>
            </select></label>
          <label className="ca-field"><span className="ca-label">Notas privadas (el cliente no las ve)</span><textarea className="ca-textarea" value={c.coachNotes ?? ''} onChange={e => setC({ ...c, coachNotes: e.target.value })} /></label>
        </div>
        <div className="ca-card ca-stack">
          <div className="ca-between"><h3>Objetivos diarios</h3>{i && <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => setC({ ...c, targets: targetsFrom(i) })}>Recalcular</button>}</div>
          <div className="ca-grid2">
            {([['kcal', 'Calorías'], ['protein', 'Proteína (g)'], ['carbs', 'Carbos (g)'], ['fat', 'Grasa (g)']] as const).map(([k, l]) => (
              <label key={k} className="ca-field"><span className="ca-label">{l}</span><input className="ca-input" type="number" min={0} value={T[k]} onChange={e => setC({ ...c, targets: { ...T, [k]: Number(e.target.value) || 0 } })} /></label>
            ))}
          </div>
          <div className="ca-row" style={{ gap: 12 }}>
            <Ring value={T.kcal ? (T.protein * 4) / T.kcal : 0} size={54}><b style={{ fontSize: 12, color: 'var(--ink)' }}>{T.kcal ? Math.round((T.protein * 4 / T.kcal) * 100) : 0}%</b></Ring>
            <span className="ca-muted" style={{ fontSize: 14 }}>de las calorías vienen de la proteína</span>
          </div>
          <h3 style={{ marginTop: 6 }}>Su ficha inicial</h3>
          {i ? <div className="ca-list">{([
            ['Objetivo', GOAL[i.goal]], ['Sexo', i.sex === 'male' ? 'Hombre' : 'Mujer'], ['Edad', ageFrom(i.birthDate) ? `${ageFrom(i.birthDate)} años` : '–'],
            ['Altura / peso', `${i.heightCm} cm · ${i.weightKg} kg (IMC ${bmi(i)})`], ['Peso objetivo', `${i.targetWeightKg} kg`],
            ['Entrena', `${i.daysPerWeek} días · ${i.experience === 'beginner' ? 'Principiante' : i.experience === 'intermediate' ? 'Intermedio' : 'Avanzado'} · ${i.equipment === 'gym' ? 'Gimnasio' : i.equipment === 'home' ? 'Casa' : 'Gimnasio y casa'}`],
            ['Lesiones', i.injuries || 'Ninguna'], ['Alimentación', `${i.diet} · ${i.mealsPerDay} comidas · alergias: ${i.allergies || 'ninguna'}`],
          ] as [string, string][]).map(([k, v]) => <div key={k} className="ca-li" style={{ cursor: 'default', padding: '8px 0', alignItems: 'flex-start' }}><span className="ca-muted" style={{ width: 120, flex: 'none' }}>{k}</span><span style={{ color: 'var(--ink)' }}>{v}</span></div>)}</div>
            : <div className="ca-muted" style={{ fontSize: 14 }}>Aún no la ha rellenado. La app se la pide al entrar por primera vez.</div>}
        </div>
      </div>
      <div className="ca-between">
        <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={remove}><Trash2 size={15} /> Borrar cliente</button>
        <div className="ca-row">{dirty && <button className="ca-btn ca-btn-ghost" onClick={() => setC(d.client)}>Descartar</button>}<button className="ca-btn" disabled={!dirty} onClick={() => save().then(reload)}>{dirty ? 'Guardar' : 'Guardado'}</button></div>
      </div>
    </div>
  )
}
