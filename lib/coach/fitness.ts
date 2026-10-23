import type { Activity, Goal, Intake, Targets, WorkoutLog, Workout, SetLog } from './types'
import { ageFrom, e1rm } from './util'

const ACTIVITY: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
}

const GOAL_KCAL: Record<Goal, number> = {
  lose_fat: -0.2, recomp: -0.1, gain_muscle: 0.1, strength: 0.05, health: 0, performance: 0.05,
}

/** Mifflin-St Jeor. */
export function bmr(i: Pick<Intake, 'sex' | 'weightKg' | 'heightCm' | 'birthDate'>): number {
  const age = ageFrom(i.birthDate) ?? 30
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * age
  return Math.round(i.sex === 'male' ? base + 5 : base - 161)
}

/**
 * Starting targets from the intake. The coach can change them at any time;
 * this only means a new client never opens an empty nutrition screen.
 */
export function targetsFrom(i: Intake): Targets {
  const tdee = bmr(i) * ACTIVITY[i.activity]
  const kcal = Math.round((tdee * (1 + GOAL_KCAL[i.goal])) / 10) * 10
  const proteinPerKg = i.goal === 'lose_fat' || i.goal === 'recomp' || i.goal === 'gain_muscle' ? 2 : 1.6
  const protein = Math.round(i.weightKg * proteinPerKg)
  const fat = Math.round((kcal * 0.27) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

export function bmi(i: Pick<Intake, 'weightKg' | 'heightCm'>): number {
  const m = i.heightCm / 100
  return m ? Math.round((i.weightKg / (m * m)) * 10) / 10 : 0
}

/** Best set of one exercise in one log. */
export function bestSet(sets: SetLog[] | undefined): { kg: number; reps: number; e1rm: number } | null {
  let best: { kg: number; reps: number; e1rm: number } | null = null
  for (const s of sets ?? []) {
    if (!s.done || !s.kg || !s.reps) continue
    const est = e1rm(s.kg, s.reps)
    if (!best || est > best.e1rm) best = { kg: s.kg, reps: s.reps, e1rm: est }
  }
  return best
}

export function volume(sets: SetLog[] | undefined): number {
  return (sets ?? []).reduce((n, s) => n + (s.done && s.kg && s.reps ? s.kg * s.reps : 0), 0)
}

export interface ExercisePoint { date: string; maxKg: number; e1rm: number; volume: number; sets: SetLog[] }

/** One point per finished session, oldest first. */
export function exerciseHistory(logs: WorkoutLog[], exerciseId: string): ExercisePoint[] {
  return logs
    .filter(l => l.finishedAt && l.sets[exerciseId]?.some(s => s.done && s.kg))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(l => {
      const sets = l.sets[exerciseId]
      const best = bestSet(sets)
      return {
        date: l.date,
        maxKg: Math.max(0, ...sets.filter(s => s.done).map(s => s.kg ?? 0)),
        e1rm: best?.e1rm ?? 0,
        volume: volume(sets),
        sets,
      }
    })
}

/** What the client did on this exercise last time, to show beside each set. */
export function lastSets(logs: WorkoutLog[], exerciseId: string, beforeLogId?: string): SetLog[] | null {
  const sorted = logs
    .filter(l => l.id !== beforeLogId && l.finishedAt && l.sets[exerciseId]?.some(s => s.done))
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
  return sorted[0]?.sets[exerciseId] ?? null
}

/** Share of scheduled workouts in a date range that were finished. */
export function adherence(workouts: Workout[], logs: WorkoutLog[], from: string, to: string): { planned: number; done: number; pct: number } {
  const planned = workouts.filter(w => w.date && w.date >= from && w.date <= to)
  const doneIds = new Set(logs.filter(l => l.finishedAt).map(l => l.workoutId))
  const done = planned.filter(w => doneIds.has(w.id)).length
  return { planned: planned.length, done, pct: planned.length ? Math.round((done / planned.length) * 100) : 0 }
}

export function mealTotals(foods: { kcal: number; p: number; c: number; f: number }[]) {
  return foods.reduce((t, f) => ({ kcal: t.kcal + f.kcal, p: t.p + f.p, c: t.c + f.c, f: t.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 })
}

export interface ShoppingItem { name: string; unit: string; qty: number; meals: string[] }

/**
 * A weekly shopping list from the plan: the first option of every meal (or the
 * option the client picked), times the days. Same food + unit are added up.
 */
export function shoppingList(plan: { meals: { name: string; options: { foods: { name: string; qty: number; unit: string }[] }[] }[] }, picks: Record<number, number> = {}, days = 7): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  plan.meals.forEach((m, mi) => {
    const opt = m.options[picks[mi] ?? 0] ?? m.options[0]
    for (const f of opt?.foods ?? []) {
      const key = `${f.name.trim().toLowerCase()}|${f.unit}`
      const cur = map.get(key) ?? { name: f.name.trim(), unit: f.unit, qty: 0, meals: [] }
      cur.qty += f.qty * days
      if (!cur.meals.includes(m.name)) cur.meals.push(m.name)
      map.set(key, cur)
    }
  })
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function fmtQty(qty: number, unit: string): string {
  if (unit === 'g' && qty >= 1000) return `${Math.round(qty / 100) / 10} kg`
  if (unit === 'ml' && qty >= 1000) return `${Math.round(qty / 100) / 10} l`
  return `${Math.round(qty * 10) / 10} ${unit}`
}
