'use client'

import { useState } from 'react'
import type { WorkoutLog } from '@/lib/coach/types'
import { exerciseHistory } from '@/lib/coach/fitness'
import { parseYmd } from '@/lib/coach/util'
import { LineChart } from './ui'

type Mode = 'e1rm' | 'maxKg' | 'volume'
const MODES: { k: Mode; t: string }[] = [{ k: 'maxKg', t: 'Peso máx.' }, { k: 'e1rm', t: '1RM estimado' }, { k: 'volume', t: 'Volumen' }]

/** Progress on one exercise, shared by the client app and the coach panel. */
export default function ExerciseProgress({ logs, exerciseId, compact }: { logs: WorkoutLog[]; exerciseId: string; compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('maxKg')
  const h = exerciseHistory(logs, exerciseId)
  if (!h.length) return <div className="ca-muted" style={{ fontSize: 14, padding: '6px 0' }}>Aún no hay series registradas de este ejercicio.</div>
  const first = h[0], last = h[h.length - 1]
  const best = h.reduce((a, b) => (b.e1rm > a.e1rm ? b : a))
  const diff = last.maxKg - first.maxKg
  return (
    <div className="ca-stack" style={{ gap: 12 }}>
      <div className="ca-macro">
        <div><b>{last.maxKg} kg</b><small>Último</small></div>
        <div><b>{best.e1rm} kg</b><small>Mejor 1RM</small></div>
        <div><b style={{ color: diff > 0 ? 'var(--ok)' : undefined }}>{diff > 0 ? '+' : ''}{Math.round(diff * 10) / 10} kg</b><small>Desde el inicio</small></div>
        <div><b>{h.length}</b><small>Sesiones</small></div>
      </div>
      <div className="ca-tabbar-inline">
        {MODES.map(m => <button key={m.k} className={mode === m.k ? 'on' : ''} onClick={() => setMode(m.k)}>{m.t}</button>)}
      </div>
      <LineChart points={h.map(p => ({ x: p.date, y: p[mode] }))} unit=" kg" height={compact ? 130 : 170} />
      {!compact && (
        <div className="ca-list">
          {[...h].reverse().slice(0, 12).map((p, i) => (
            <div key={i} className="ca-li" style={{ cursor: 'default' }}>
              <div className="ca-li-main">
                <div className="ca-li-title" style={{ fontSize: 14 }}>{parseYmd(p.date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                <div className="ca-li-sub">{p.sets.filter(s => s.done).map(s => `${s.kg ?? 0}×${s.reps ?? 0}`).join('  ·  ')}</div>
              </div>
              {p.date === best.date && <span className="ca-pill ca-pill-ok">🏆 Récord</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
