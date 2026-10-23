'use client'

import Link from 'next/link'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Empty, Spinner } from '@/components/coach/ui'
import { BrandMark } from '../AppShell'
import { daysBetween, fmtDuration, parseYmd, ymd } from '@/lib/coach/util'
import type { Workout, WorkoutLog } from '@/lib/coach/types'

function when(d: string) {
  const n = daysBetween(ymd(), d)
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  if (n === -1) return 'Ayer'
  return parseYmd(d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function Train() {
  const { clientId } = useCoach()
  const { data } = useData(async s => {
    const [workouts, logs] = await Promise.all([s.list('workouts', { clientId }), s.list('logs', { clientId })])
    return { workouts, logs }
  }, [clientId])
  if (!data) return <main className="ca-main"><Spinner /></main>

  const today = ymd()
  const logOf = new Map<string, WorkoutLog>()
  for (const l of data.logs) if (l.finishedAt) logOf.set(l.workoutId, l)
  const dated = data.workouts.filter(w => w.date).sort((a, b) => a.date!.localeCompare(b.date!))
  const next = dated.filter(w => w.date! >= today && !logOf.has(w.id))
  const missed = dated.filter(w => w.date! < today && !logOf.has(w.id)).slice(-3)
  const done = [...data.logs].filter(l => l.finishedAt).sort((a, b) => b.date.localeCompare(a.date))
  const anytime = data.workouts.filter(w => !w.date)

  const Row = ({ w, sub }: { w: Workout; sub: string }) => (
    <Link href={`/app/train/${w.id}`} className="ca-li">
      <div className="ca-thumb">🏋️</div>
      <div className="ca-li-main"><div className="ca-li-title">{w.name}</div><div className="ca-li-sub">{sub}</div></div>
      <ChevronRight className="ca-chev" />
    </Link>
  )

  return (
    <main className="ca-main ca-stack">
      <div className="ca-top"><BrandMark /></div>
      <h1>Entrenamientos</h1>
      {!data.workouts.length && <div className="ca-card"><Empty icon="🗓️" title="Tu plan está en camino" text="Tu entrenador te asignará los entrenos aquí. Te avisamos en el chat." /></div>}

      {next.length > 0 && <>
        <div className="ca-section-title"><h2>Próximos</h2></div>
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {next.slice(0, 10).map(w => <Row key={w.id} w={w} sub={`${when(w.date!)} · ${w.blocks.reduce((n, b) => n + b.items.length, 0)} ejercicios`} />)}
        </div>
      </>}

      {missed.length > 0 && <>
        <div className="ca-section-title"><h2>Pendientes</h2></div>
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {missed.map(w => <Row key={w.id} w={w} sub={`${when(w.date!)} · aún puedes hacerlo`} />)}
        </div>
      </>}

      {anytime.length > 0 && <>
        <div className="ca-section-title"><h2>Cuando quieras</h2></div>
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {anytime.map(w => <Row key={w.id} w={w} sub="Sin fecha fija" />)}
        </div>
      </>}

      {done.length > 0 && <>
        <div className="ca-section-title"><h2>Historial</h2><span className="ca-muted" style={{ fontSize: 14 }}>{done.length} sesiones</span></div>
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {done.slice(0, 20).map(l => (
            <Link key={l.id} href={`/app/train/${l.workoutId}`} className="ca-li">
              <div className="ca-thumb" style={{ background: '#DDF3E6', color: 'var(--ok)' }}><CheckCircle2 /></div>
              <div className="ca-li-main"><div className="ca-li-title">{l.workoutName}</div><div className="ca-li-sub">{when(l.date)}{l.durationSec ? ` · ${fmtDuration(l.durationSec)}` : ''}{l.rpe ? ` · RPE ${l.rpe}` : ''}</div></div>
              <ChevronRight className="ca-chev" />
            </Link>
          ))}
        </div>
      </>}
    </main>
  )
}
