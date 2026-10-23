'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Info, Timer, X } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp } from '../../AppShell'
import { Sheet, Spinner, Stars, Empty } from '@/components/coach/ui'
import type { Exercise, SetLog, WorkoutLog } from '@/lib/coach/types'
import { lastSets, bestSet, volume } from '@/lib/coach/fitness'
import { fmtDuration, repsPerSet, uid, ymd } from '@/lib/coach/util'

const RPE: Record<number, string> = {
  1: 'Muy fácil', 2: 'Fácil', 3: 'Suave', 4: 'Cómodo', 5: 'Moderado', 6: 'Algo duro', 7: 'Duro', 8: 'Muy duro', 9: 'Casi al límite', 10: 'Al límite',
}

export default function Session() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { store, clientId, coach, viewingAs } = useCoach()
  const { toast } = useApp()
  const { data } = useData(async s => {
    const [w, exercises, logs] = await Promise.all([s.get('workouts', id), s.list('exercises'), s.list('logs', { clientId })])
    return { w, ex: new Map(exercises.map(e => [e.id, e])), logs }
  }, [id, clientId])

  const [log, setLog] = useState<WorkoutLog | null>(null)
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [finishing, setFinishing] = useState(false)
  const [rpe, setRpe] = useState(7)
  const [rating, setRating] = useState(4)
  const [comment, setComment] = useState('')
  const saveTimer = useRef<number | undefined>(undefined)

  const finished = data?.logs.find(l => l.workoutId === id && l.finishedAt) ?? null
  const draft = data?.logs.find(l => l.workoutId === id && !l.finishedAt) ?? null

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(t) }, [])
  useEffect(() => { if (rest && now >= rest.until) { setRest(null); try { navigator.vibrate?.(300) } catch {} } }, [now, rest])

  const persist = useCallback((l: WorkoutLog) => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => { store.put('logs', l).catch(() => toast('No se pudo guardar, lo intentamos al terminar.')) }, 600)
  }, [store, toast])

  const start = () => {
    if (!data?.w || !clientId || viewingAs) return
    const sets: Record<string, SetLog[]> = {}
    for (const b of data.w.blocks) for (const it of b.items) {
      const prev = lastSets(data.logs, it.exerciseId)
      const reps = repsPerSet(it.reps, it.sets)
      const loads = it.load ? repsPerSet(it.load, it.sets) : []
      sets[it.exerciseId] = reps.map((r, i) => ({ reps: r || null, kg: prev?.[i]?.kg ?? (loads[i] || null), done: false }))
    }
    const l: WorkoutLog = { id: uid('log-'), coachId: data.w.coachId, clientId, workoutId: data.w.id, workoutName: data.w.name, date: ymd(), startedAt: new Date().toISOString(), sets, createdAt: new Date().toISOString() }
    setLog(l)
    store.put('logs', l).catch(() => {})
  }

  useEffect(() => { if (draft && !log) setLog(draft) }, [draft, log])

  const update = (exId: string, i: number, patch: Partial<SetLog>, restSec?: number) => {
    setLog(l => {
      if (!l) return l
      const arr = [...(l.sets[exId] ?? [])]
      arr[i] = { ...arr[i], ...patch }
      const next = { ...l, sets: { ...l.sets, [exId]: arr } }
      persist(next)
      return next
    })
    if (patch.done && restSec) setRest({ until: Date.now() + restSec * 1000, total: restSec })
  }

  const elapsed = log ? Math.floor((now - new Date(log.startedAt).getTime()) / 1000) : 0
  const progress = useMemo(() => {
    if (!log) return { done: 0, total: 0 }
    const all = Object.values(log.sets).flat()
    return { done: all.filter(s => s.done).length, total: all.length }
  }, [log])

  async function finish() {
    if (!log) return
    window.clearTimeout(saveTimer.current)
    const done: WorkoutLog = { ...log, finishedAt: new Date().toISOString(), durationSec: elapsed, rpe, rating, comment: comment.trim() || undefined }
    try {
      await store.put('logs', done)
      toast('¡Entreno guardado! 💪')
      router.push('/app')
    } catch { toast('No se pudo guardar. Revisa tu conexión y vuelve a pulsar.') }
  }

  if (!data) return <main className="ca-main"><Spinner /></main>
  const w = data.w
  if (!w) return <main className="ca-main"><div className="ca-card"><Empty title="Este entreno ya no existe" action={<Link className="ca-btn" href="/app/train">Ver mis entrenos</Link>} /></div></main>

  const ExHead = ({ e, sub }: { e?: Exercise; sub: string }) => (
    <div className="ca-ex-head">
      <Link href={`/app/exercise/${e?.id ?? ''}`} className="ca-thumb" aria-label="Ver ejercicio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e?.thumbUrl ? <img src={e.thumbUrl} alt="" /> : '🏋️'}
      </Link>
      <div className="ca-li-main">
        <div className="ca-li-title" style={{ whiteSpace: 'normal' }}>{e?.name ?? 'Ejercicio'}</div>
        <div className="ca-li-sub">{sub}</div>
      </div>
      <Link href={`/app/exercise/${e?.id ?? ''}`} className="ca-icon-btn" aria-label="Técnica y vídeo"><Info size={20} /></Link>
    </div>
  )

  // Finished: a read-only summary.
  if (finished && !log) {
    return (
      <main className="ca-main ca-stack">
        <div className="ca-top"><button className="ca-icon-btn" onClick={() => router.back()} aria-label="Volver"><ArrowLeft /></button><span className="ca-pill ca-pill-ok">Completado</span></div>
        <h1>{w.name}</h1>
        <div className="ca-card ca-macro">
          <div><b>{finished.durationSec ? fmtDuration(finished.durationSec) : '–'}</b><small>Duración</small></div>
          <div><b>{finished.rpe ?? '–'}</b><small>RPE</small></div>
          <div><b>{'★'.repeat(finished.rating ?? 0) || '–'}</b><small>Valoración</small></div>
          <div><b>{Math.round(Object.values(finished.sets).reduce((n, s) => n + volume(s), 0))}</b><small>kg totales</small></div>
        </div>
        {finished.coachFeedback && <div className="ca-card" style={{ borderLeft: '4px solid var(--brand)' }}><div className="ca-label">{coach?.name?.split(' ')[0] ?? 'Tu coach'} dice</div><div style={{ marginTop: 4 }}>{finished.coachFeedback}</div></div>}
        {finished.comment && <div className="ca-card"><div className="ca-label">Tu comentario</div><div style={{ marginTop: 4 }}>{finished.comment}</div></div>}
        {w.blocks.flatMap(b => b.items).map(it => {
          const e = data.ex.get(it.exerciseId)
          const sets = finished.sets[it.exerciseId] ?? []
          const b = bestSet(sets)
          return (
            <div key={it.exerciseId} className="ca-ex">
              <ExHead e={e} sub={b ? `Mejor serie: ${b.kg} kg × ${b.reps}` : 'Sin registrar'} />
              <div style={{ padding: '0 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sets.map((s, i) => <span key={i} className={`ca-pill${s.done ? ' ca-pill-ok' : ''}`}>{s.kg ?? 0} kg × {s.reps ?? 0}</span>)}
              </div>
            </div>
          )
        })}
      </main>
    )
  }

  return (
    <main className="ca-main ca-stack" style={{ paddingBottom: rest ? 180 : undefined }}>
      <div className="ca-top">
        <button className="ca-icon-btn" onClick={() => router.back()} aria-label="Volver"><ArrowLeft /></button>
        {log ? <span className="ca-pill"><Timer size={13} /> {fmtDuration(elapsed)}</span> : <span />}
      </div>
      <div>
        <div className="ca-eyebrow">{log ? `${progress.done} de ${progress.total} series` : 'Entreno'}</div>
        <h1 style={{ marginTop: 4 }}>{w.name}</h1>
        {w.notes && <p className="ca-muted" style={{ margin: '6px 0 0' }}>{w.notes}</p>}
      </div>
      {log && <div className="ca-progress"><i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>}

      {!log && (
        <div className="ca-card ca-stack">
          <div className="ca-list">
            {w.blocks.flatMap(b => b.items).map((it, i) => {
              const e = data.ex.get(it.exerciseId)
              return (
                <Link key={i} href={`/app/exercise/${it.exerciseId}`} className="ca-li">
                  <div className="ca-thumb" style={{ width: 48, height: 48 }}>{/* eslint-disable-next-line @next/next/no-img-element */}{e?.thumbUrl ? <img src={e.thumbUrl} alt="" /> : '🏋️'}</div>
                  <div className="ca-li-main"><div className="ca-li-title">{e?.name}</div><div className="ca-li-sub">{it.sets} × {it.reps}{it.restSec ? ` · descanso ${it.restSec}s` : ''}</div></div>
                </Link>
              )
            })}
          </div>
          {viewingAs ? <div className="ca-muted" style={{ fontSize: 14 }}>Vista del cliente: el registro lo hace él desde su móvil.</div>
            : <button className="ca-btn ca-btn-block" onClick={start}>Empezar entreno</button>}
        </div>
      )}

      {log && w.blocks.map((b, bi) => (
        <div key={bi} className="ca-stack" style={{ gap: 10 }}>
          {b.title && <div className="ca-eyebrow" style={{ marginTop: 6 }}>{b.title}</div>}
          {b.items.map(it => {
            const e = data.ex.get(it.exerciseId)
            const sets = log.sets[it.exerciseId] ?? []
            const prev = lastSets(data.logs, it.exerciseId, log.id)
            return (
              <div key={it.exerciseId} className="ca-ex">
                <ExHead e={e} sub={`${it.sets} × ${it.reps}${it.restSec ? ` · ${it.restSec}s descanso` : ''}`} />
                {it.notes && <div style={{ padding: '0 14px 10px', fontSize: 14 }} className="ca-muted">📝 {it.notes}</div>}
                <table className="ca-sets">
                  <thead><tr><th style={{ width: 34 }}>#</th><th>Anterior</th><th>kg</th><th>Reps</th><th style={{ width: 52 }}>✓</th></tr></thead>
                  <tbody>
                    {sets.map((s, i) => (
                      <tr key={i} className={s.done ? 'done' : ''}>
                        <td style={{ fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</td>
                        <td className="ca-prev">{prev?.[i] ? `${prev[i].kg ?? 0}×${prev[i].reps ?? 0}` : '–'}</td>
                        <td><input className="ca-set-in" inputMode="decimal" type="number" step="0.5" value={s.kg ?? ''} onChange={ev => update(it.exerciseId, i, { kg: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label={`Kilos serie ${i + 1}`} /></td>
                        <td><input className="ca-set-in" inputMode="numeric" type="number" value={s.reps ?? ''} onChange={ev => update(it.exerciseId, i, { reps: ev.target.value === '' ? null : Number(ev.target.value) })} aria-label={`Repeticiones serie ${i + 1}`} /></td>
                        <td><button className={`ca-tick${s.done ? ' on' : ''}`} onClick={() => update(it.exerciseId, i, { done: !s.done }, !s.done ? it.restSec : undefined)} aria-pressed={s.done} aria-label={`Serie ${i + 1} hecha`}><Check size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: 10 }}>
                  <button className="ca-link" onClick={() => setLog(l => { if (!l) return l; const arr = [...(l.sets[it.exerciseId] ?? [])]; const last = arr[arr.length - 1]; arr.push({ reps: last?.reps ?? null, kg: last?.kg ?? null, done: false }); const n = { ...l, sets: { ...l.sets, [it.exerciseId]: arr } }; persist(n); return n })}>+ Añadir serie</button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {log && !viewingAs && <button className="ca-btn ca-btn-block" onClick={() => setFinishing(true)} style={{ marginTop: 6 }}>Terminar entreno</button>}

      {rest && (
        <div className="ca-timer" role="timer">
          <Timer />
          <div style={{ flex: 1 }}><div style={{ fontSize: 12, opacity: .7, fontWeight: 700 }}>DESCANSO</div><b>{fmtDuration(Math.max(0, Math.ceil((rest.until - now) / 1000)))}</b></div>
          <button className="ca-btn ca-btn-sm ca-btn-white" onClick={() => setRest(r => r && { ...r, until: r.until + 15000 })}>+15s</button>
          <button className="ca-icon-btn" style={{ color: '#fff' }} onClick={() => setRest(null)} aria-label="Saltar descanso"><X /></button>
        </div>
      )}

      <Sheet open={finishing} onClose={() => setFinishing(false)} title="¿Cómo ha ido?"
        footer={<><button className="ca-btn ca-btn-ghost" onClick={() => setFinishing(false)}>Seguir</button><button className="ca-btn" onClick={finish}>Guardar</button></>}>
        <div className="ca-stack">
          <div className="ca-card ca-macro" style={{ background: 'var(--mist)' }}>
            <div><b>{fmtDuration(elapsed)}</b><small>Duración</small></div>
            <div><b>{progress.done}</b><small>Series</small></div>
            <div><b>{Math.round(log ? Object.values(log.sets).reduce((n, s) => n + volume(s), 0) : 0)}</b><small>kg totales</small></div>
            <div><b>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</b><small>Hecho</small></div>
          </div>
          <div className="ca-field">
            <span className="ca-label">Esfuerzo (RPE): <b style={{ color: 'var(--brand)' }}>{rpe}, {RPE[rpe]}</b></span>
            <input type="range" min={1} max={10} value={rpe} onChange={e => setRpe(Number(e.target.value))} style={{ width: '100%', accentColor: coach.primary, minHeight: 44 }} />
          </div>
          <div className="ca-field"><span className="ca-label">Valora el entreno</span><Stars value={rating} onChange={setRating} /></div>
          <label className="ca-field"><span className="ca-label">Comentario para {coach.name.split(' ')[0]} (opcional)</span>
            <textarea className="ca-textarea" placeholder="Cómo te has sentido, alguna molestia..." value={comment} onChange={e => setComment(e.target.value)} /></label>
        </div>
      </Sheet>
    </main>
  )
}
