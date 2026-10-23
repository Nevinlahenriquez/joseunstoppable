'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, MessageCircle, Send, Trophy } from 'lucide-react'
import type { Message, SetLog, Workout, WorkoutItem, WorkoutLog } from '@/lib/coach/types'
import { useCoach } from '@/lib/coach/store'
import { useArea } from '../CoachArea'
import { bestSet, lastSets, volume } from '@/lib/coach/fitness'
import { addDays, daysBetween, fmtDuration, parseYmd, repsPerSet, uid, weekStart, ymd } from '@/lib/coach/util'
import type { ClientData } from './Tabs'

const RPE: Record<number, string> = {
  1: 'Muy fácil', 2: 'Fácil', 3: 'Suave', 4: 'Cómodo', 5: 'Moderado', 6: 'Algo duro', 7: 'Duro', 8: 'Muy duro', 9: 'Casi al límite', 10: 'Al límite',
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const long = (s: string) => parseYmd(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

/** A finished session nobody on the coach side has looked at yet. */
export const needsReview = (l: WorkoutLog) => !!l.finishedAt && !l.reviewedAt

// ─────────────────────────────────────────────────────────────────────────────
// SESSION REVIEW. Everything the client did in one workout, set by set, against
// what was prescribed and against last time, plus the coach's answer.
// ─────────────────────────────────────────────────────────────────────────────
export function SessionReview({ d, log, onSaved, onEdit }: { d: ClientData; log: WorkoutLog; onSaved: (l: WorkoutLog, msgs: Message[]) => void; onEdit: () => void }) {
  const { store } = useCoach()
  const { toast } = useArea()
  const first = d.client.name.split(' ')[0]
  const w = d.workouts.find(x => x.id === log.workoutId)
  const ex = useMemo(() => new Map(d.exercises.map(e => [e.id, e])), [d.exercises])
  const [feedback, setFeedback] = useState(log.coachFeedback ?? '')
  const [saving, setSaving] = useState(false)
  const [reply, setReply] = useState<Record<string, string>>({})

  // The prescription, in workout order. Exercises logged that are no longer in
  // the workout (it was edited later) still show, at the end.
  const items: WorkoutItem[] = useMemo(() => {
    const list = w?.blocks.flatMap(b => b.items) ?? []
    const seen = new Set(list.map(i => i.exerciseId))
    for (const id of Object.keys(log.sets)) if (!seen.has(id)) list.push({ exerciseId: id, sets: log.sets[id].length, reps: '', restSec: 0 })
    return list
  }, [w, log.sets])

  const totalSets = items.reduce((n, it) => n + (log.sets[it.exerciseId]?.length ?? it.sets), 0)
  const doneSets = items.reduce((n, it) => n + (log.sets[it.exerciseId]?.filter(s => s.done).length ?? 0), 0)
  const kg = Math.round(Object.values(log.sets).reduce((n, s) => n + volume(s), 0))
  const late = w?.date ? daysBetween(w.date, log.date) : 0

  async function send(text: string, exerciseId?: string): Promise<Message | null> {
    const m: Message = { id: uid('msg-'), coachId: d.client.coachId, clientId: d.client.id, from: 'coach', text, exerciseId, read: false, createdAt: new Date().toISOString() }
    try { await store.put('messages', m); return m } catch { toast('No se pudo enviar.'); return null }
  }

  async function sendReply(exId: string) {
    const t = (reply[exId] ?? '').trim()
    if (!t) return
    const m = await send(`${ex.get(exId)?.name ?? 'Ejercicio'}: ${t}`, exId)
    if (m) { setReply(r => ({ ...r, [exId]: '' })); onSaved(log, [m]); toast('Enviado a su chat') }
  }

  async function review() {
    setSaving(true)
    const text = feedback.trim()
    const row: WorkoutLog = { ...log, reviewedAt: new Date().toISOString(), coachFeedback: text || undefined }
    try {
      await store.put('logs', row)
      const msgs: Message[] = []
      if (text && text !== (log.coachFeedback ?? '')) {
        const m = await send(`Sobre tu entreno "${log.workoutName}": ${text}`)
        if (m) msgs.push(m)
      }
      onSaved(row, msgs)
      toast(text ? 'Revisado y enviado' : 'Marcado como revisado')
    } catch { toast('No se pudo guardar.') }
    setSaving(false)
  }

  return (
    <div className="ca-stack">
      <div className="ca-kpis">
        <div className="ca-kpi"><b>{doneSets}/{totalSets}</b><small>Series hechas</small></div>
        <div className="ca-kpi"><b>{log.durationSec ? fmtDuration(log.durationSec) : '–'}</b><small>Duración</small></div>
        <div className="ca-kpi"><b>{log.rpe ?? '–'}</b><small>{log.rpe ? RPE[log.rpe] : 'Esfuerzo (RPE)'}</small></div>
        <div className="ca-kpi"><b>{kg.toLocaleString('es')}</b><small>kg totales</small></div>
      </div>

      <div className="ca-card ca-card-tight ca-stack" style={{ gap: 6, background: 'var(--mist)' }}>
        <div style={{ fontSize: 14 }}><b style={{ color: 'var(--ink)' }}>Hecho:</b> {long(log.date)}
          {w?.date && <> · <span style={{ color: late > 0 ? 'var(--warn)' : late < 0 ? 'var(--brand-deep)' : 'var(--ok)', fontWeight: 700 }}>
            {late === 0 ? 'el día previsto' : late > 0 ? `${late} día${late > 1 ? 's' : ''} tarde` : `${-late} día${late < -1 ? 's' : ''} antes`}</span></>}
        </div>
        {log.rating ? <div style={{ fontSize: 14 }}><b style={{ color: 'var(--ink)' }}>Le gustó:</b> <span style={{ color: '#E0A100' }}>{'★'.repeat(log.rating)}</span><span style={{ color: 'var(--line)' }}>{'★'.repeat(5 - log.rating)}</span></div> : null}
        {log.comment && <div style={{ fontSize: 14.5 }}><b style={{ color: 'var(--ink)' }}>{first} dice:</b> “{log.comment}”</div>}
      </div>

      {items.map(it => {
        const e = ex.get(it.exerciseId)
        const sets: SetLog[] = log.sets[it.exerciseId] ?? []
        const plan = it.reps ? repsPerSet(it.reps, it.sets) : []
        const prev = lastSets(d.logs.filter(l => l.date < log.date || (l.date === log.date && (l.finishedAt ?? '') < (log.finishedAt ?? ''))), it.exerciseId, log.id)
        const n = sets.filter(s => s.done).length
        const status = n === 0 ? ['No completado', 'bad'] : n < Math.max(sets.length, it.sets) ? [`Parcial ${n}/${Math.max(sets.length, it.sets)}`, 'warn'] : ['Completado', 'ok']
        const best = bestSet(sets)
        const prevBest = d.logs.filter(l => l.id !== log.id && l.finishedAt && l.date <= log.date).reduce((m, l) => Math.max(m, bestSet(l.sets[it.exerciseId])?.e1rm ?? 0), 0)
        const pr = !!best && prevBest > 0 && best.e1rm > prevBest
        const notes = d.messages.filter(m => m.exerciseId === it.exerciseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-4)
        return (
          <div key={it.exerciseId} className="ca-card ca-stack" style={{ gap: 10 }}>
            <div className="ca-between" style={{ gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ color: 'var(--ink)', fontSize: 16 }}>{e?.name ?? 'Ejercicio borrado'}</b>
                {it.reps && <div className="ca-muted" style={{ fontSize: 13.5 }}>Pautado: {it.sets} series · {it.reps} reps{it.restSec ? ` · ${it.restSec}'' descanso` : ''}{it.load ? ` · ${it.load} kg` : ''}</div>}
              </div>
              <div className="ca-row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {pr && <span className="ca-pill ca-pill-ok"><Trophy size={13} /> Récord</span>}
                <span className={`ca-pill${status[1] === 'ok' ? ' ca-pill-ok' : status[1] === 'warn' ? ' ca-pill-warn' : ''}`} style={status[1] === 'bad' ? { background: '#FCE4E2', color: 'var(--bad)' } : undefined}>{status[0]}</span>
              </div>
            </div>
            <div className="ca-table-wrap" style={{ border: 0 }}>
              <table className="ca-table">
                <thead><tr><th>Serie</th><th>Objetivo</th><th>Hecho</th><th>Última vez</th></tr></thead>
                <tbody>{Array.from({ length: Math.max(sets.length, it.sets) }).map((_, i) => {
                  const s = sets[i]
                  const p = prev?.[i]
                  const up = s?.done && p?.done && s.kg != null && p.kg != null ? (s.kg - p.kg) || ((s.reps ?? 0) - (p.reps ?? 0)) : 0
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td className="ca-muted">{plan[i] ? `${plan[i]} reps` : '–'}</td>
                      <td>{s?.done
                        ? <span style={{ fontWeight: 800, color: 'var(--ink)' }}><Check size={14} style={{ color: 'var(--ok)', verticalAlign: -2 }} /> {s.kg ?? 0} kg × {s.reps ?? 0}</span>
                        : <span style={{ color: 'var(--bad)', fontWeight: 700 }}>Sin hacer</span>}</td>
                      <td className="ca-muted">{p?.done ? `${p.kg ?? 0} kg × ${p.reps ?? 0}` : '–'}
                        {up !== 0 && <span style={{ marginLeft: 6, fontWeight: 800, color: up > 0 ? 'var(--ok)' : 'var(--bad)' }}>{up > 0 ? '▲' : '▼'}</span>}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
            {notes.length > 0 && <div className="ca-stack" style={{ gap: 6 }}>{notes.map(m => (
              <div key={m.id} className={`ca-bubble ${m.from === 'coach' ? 'me' : 'them'}`} style={{ maxWidth: '100%' }}>{m.text}<small>{new Date(m.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</small></div>
            ))}</div>}
            <form className="ca-row" onSubmit={ev => { ev.preventDefault(); sendReply(it.exerciseId) }}>
              <input className="ca-input" value={reply[it.exerciseId] ?? ''} onChange={ev => setReply(r => ({ ...r, [it.exerciseId]: ev.target.value }))}
                placeholder={`Nota sobre este ejercicio para ${first}`} aria-label={`Nota sobre ${e?.name ?? 'el ejercicio'}`} />
              <button className="ca-btn ca-btn-ghost" style={{ flex: 'none' }} disabled={!(reply[it.exerciseId] ?? '').trim()} aria-label="Enviar nota"><MessageCircle size={18} /></button>
            </form>
          </div>
        )
      })}

      <div className="ca-card ca-stack">
        <div className="ca-between"><h3>Tu feedback</h3>{log.reviewedAt && <span className="ca-pill ca-pill-ok"><Check size={13} /> Revisado {new Date(log.reviewedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>}</div>
        <textarea className="ca-input" rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder={`Ej.: Muy bien ${first}, la próxima sube 2,5 kg en sentadilla.`} />
        <div className="ca-muted" style={{ fontSize: 13 }}>Lo ve en el resultado de este entreno y le llega a su chat.</div>
        <div className="ca-row" style={{ flexWrap: 'wrap' }}>
          <button className="ca-btn" disabled={saving} onClick={review}><Send size={17} /> {log.reviewedAt ? 'Guardar feedback' : feedback.trim() ? 'Enviar y marcar revisado' : 'Marcar como revisado'}</button>
          <button className="ca-btn ca-btn-ghost" onClick={onEdit}>Editar el entreno</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENDA. Month grid of the client's plan: what was done, missed, pending.
// ─────────────────────────────────────────────────────────────────────────────
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Agenda({ d, onOpen, onAdd }: { d: ClientData; onOpen: (w: Workout) => void; onAdd: (date: string) => void }) {
  const today = ymd()
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const logBy = useMemo(() => new Map(d.logs.map(l => [l.workoutId, l])), [d.logs])
  const byDate = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of d.workouts) if (w.date) m.set(w.date, [...(m.get(w.date) ?? []), w])
    return m
  }, [d.workouts])
  const first = `${month}-01`
  const gridStart = weekStart(first)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const rows = days[35].slice(0, 7) === month ? 6 : 5
  const shift = (n: number) => { const dt = parseYmd(first); dt.setMonth(dt.getMonth() + n); setMonth(ymd(dt).slice(0, 7)) }
  const state = (w: Workout) => {
    const l = logBy.get(w.id)
    if (l?.finishedAt) return needsReview(l) ? 'review' : 'done'
    if (l) return 'started'
    return w.date! < today ? 'missed' : 'planned'
  }
  const COLOR: Record<string, string> = { done: 'var(--ok)', review: 'var(--brand)', started: 'var(--warn)', missed: 'var(--bad)', planned: '#9AA8BF' }

  return (
    <div className="ca-card ca-stack" style={{ gap: 12 }}>
      <div className="ca-between">
        <h3>{cap(parseYmd(first).toLocaleDateString('es', { month: 'long', year: 'numeric' }))}</h3>
        <div className="ca-row" style={{ gap: 6 }}>
          <button className="ca-icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <button className="ca-chip" onClick={() => setMonth(today.slice(0, 7))}>Hoy</button>
          <button className="ca-icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="ca-cal">
        {DOW.map(x => <div key={x} className="ca-cal-h">{x}</div>)}
        {days.slice(0, rows * 7).map(date => {
          const list = byDate.get(date) ?? []
          return (
            <div key={date} className={`ca-cal-d${date.slice(0, 7) !== month ? ' out' : ''}${date === today ? ' today' : ''}`}>
              <button className="ca-cal-n" onClick={() => onAdd(date)} aria-label={`Añadir entreno el ${long(date)}`}>{Number(date.slice(8))}</button>
              {list.map(w => (
                <button key={w.id} className="ca-cal-w" onClick={() => onOpen(w)} title={w.name}>
                  <span style={{ background: COLOR[state(w)] }} /><em>{w.name}</em>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div className="ca-row ca-muted" style={{ flexWrap: 'wrap', gap: 14, fontSize: 13 }}>
        {[['done', 'Hecho'], ['review', 'Por revisar'], ['started', 'Empezado'], ['missed', 'No hecho'], ['planned', 'Pendiente']].map(([k, t]) => (
          <span key={k} className="ca-row" style={{ gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 5, background: COLOR[k] }} />{t}</span>
        ))}
        <span>Toca un día para añadir un entreno.</span>
      </div>
    </div>
  )
}
