import type { Metric, Photo, WorkoutLog, Checkin } from './types'
import { exerciseHistory } from './fitness'
import { addDays, weekStart, ymd } from './util'

export interface Achievement { id: string; title: string; detail: string; icon: string; earned: boolean; progress?: number }

/** Computed from what the client did, never stored, so it can never drift. */
export function achievements(logs: WorkoutLog[], metrics: Metric[], photos: Photo[], checkins: Checkin[], exerciseIds: string[]): Achievement[] {
  const done = logs.filter(l => l.finishedAt)
  const weeks = new Set(done.map(l => weekStart(l.date)))
  // Weeks in a row with at least one session, ending this week or last.
  let streak = 0
  for (let w = weekStart(ymd()); weeks.has(w) || (streak === 0 && weeks.has(addDays(w, -7))); w = addDays(w, -7)) {
    if (weeks.has(w)) streak++
    else if (streak > 0) break
  }
  const prs = exerciseIds.reduce((n, id) => {
    const h = exerciseHistory(done, id)
    let best = 0, count = 0
    for (const p of h) { if (best && p.e1rm > best) count++; best = Math.max(best, p.e1rm) }
    return n + count
  }, 0)
  const weights = metrics.filter(m => m.type === 'weight').sort((a, b) => a.date.localeCompare(b.date))
  const lost = weights.length > 1 ? weights[0].value - weights[weights.length - 1].value : 0
  const tiers = (n: number, steps: number[]) => steps.find(s => n < s) ?? steps[steps.length - 1]

  const out: Achievement[] = [
    { id: 'first', title: 'Primer entreno', detail: 'Terminaste tu primera sesión', icon: '🏁', earned: done.length >= 1 },
    { id: 'sessions', title: `${tiers(done.length, [10, 25, 50, 100])} sesiones`, detail: `${done.length} terminadas`, icon: '💪', earned: done.length >= 10, progress: Math.min(1, done.length / tiers(done.length, [10, 25, 50, 100])) },
    { id: 'streak', title: 'Constancia', detail: streak ? `${streak} semanas seguidas entrenando` : 'Entrena cada semana para empezar tu racha', icon: '🔥', earned: streak >= 4, progress: Math.min(1, streak / 4) },
    { id: 'pr', title: 'Récord personal', detail: prs ? `${prs} récords batidos` : 'Supera tu mejor marca en un ejercicio', icon: '🏆', earned: prs >= 1 },
    { id: 'photos', title: 'Antes y después', detail: 'Sube tus fotos de progreso', icon: '📸', earned: new Set(photos.map(p => p.date)).size >= 2, progress: Math.min(1, new Set(photos.map(p => p.date)).size / 2) },
    { id: 'checkin', title: 'Check-in semanal', detail: `${checkins.length} enviados`, icon: '📝', earned: checkins.length >= 1 },
  ]
  if (lost > 0) out.push({ id: 'weight', title: `${Math.round(lost * 10) / 10} kg menos`, detail: 'Desde tu primera medida', icon: '⚖️', earned: lost >= 2, progress: Math.min(1, lost / 2) })
  return out
}
