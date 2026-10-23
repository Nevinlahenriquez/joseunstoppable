'use client'

import { useEffect, useState } from 'react'
import { Copy, Plus, Trash2, X } from 'lucide-react'
import type { Food, Meal, MealOption, NutritionPlan, Targets } from '@/lib/coach/types'
import { mealTotals } from '@/lib/coach/fitness'

const blankFood = (): Food => ({ name: '', qty: 100, unit: 'g', kcal: 0, p: 0, c: 0, f: 0 })
const blankOption = (n = 1): MealOption => ({ name: `Opción ${n}`, foods: [blankFood()] })
export const blankMeal = (name = 'Comida', time = '13:00'): Meal => ({ name, time, options: [blankOption()] })

export function newPlan(coachId: string, clientId: string | null, targets?: Targets): NutritionPlan {
  return {
    id: '', coachId, clientId, name: '', notes: '', createdAt: new Date().toISOString(),
    targets: targets ?? { kcal: 2200, protein: 160, carbs: 220, fat: 70 },
    meals: [blankMeal('Desayuno', '08:00'), blankMeal('Comida', '13:30'), blankMeal('Merienda', '17:00'), blankMeal('Cena', '20:30')],
  }
}

const num = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : 0 }

/** The whole plan on one screen: targets, meals, options per meal, foods per option. */
export default function NutritionEditor({ value, onChange }: { value: NutritionPlan; onChange: (p: NutritionPlan) => void }) {
  const [openMeal, setOpenMeal] = useState(0)
  const [openOpt, setOpenOpt] = useState<Record<number, number>>({})
  const p = value
  useEffect(() => { if (openMeal >= p.meals.length) setOpenMeal(Math.max(0, p.meals.length - 1)) }, [p.meals.length, openMeal])

  const setMeal = (mi: number, patch: Partial<Meal>) => onChange({ ...p, meals: p.meals.map((m, i) => (i === mi ? { ...m, ...patch } : m)) })
  const setOpt = (mi: number, oi: number, patch: Partial<MealOption>) => setMeal(mi, { options: p.meals[mi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) })
  const setFood = (mi: number, oi: number, fi: number, patch: Partial<Food>) => setOpt(mi, oi, { foods: p.meals[mi].options[oi].foods.map((f, i) => (i === fi ? { ...f, ...patch } : f)) })

  const dayTotal = p.meals.reduce((t, m, mi) => {
    const o = m.options[Math.min(openOpt[mi] ?? 0, m.options.length - 1)]
    const x = mealTotals(o?.foods ?? [])
    return { kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f }
  }, { kcal: 0, p: 0, c: 0, f: 0 })

  return (
    <div className="ca-stack">
      <div className="ca-card ca-stack">
        <h3>Objetivos diarios</h3>
        <div className="ca-kpis">
          {([['kcal', 'Calorías'], ['protein', 'Proteína (g)'], ['carbs', 'Carbos (g)'], ['fat', 'Grasa (g)']] as [keyof Targets, string][]).map(([k, l]) => (
            <label key={k} className="ca-field"><span className="ca-label">{l}</span>
              <input className="ca-input" type="number" min={0} value={p.targets[k]} onChange={e => onChange({ ...p, targets: { ...p.targets, [k]: num(e.target.value) } })} /></label>
          ))}
        </div>
        <div className="ca-muted" style={{ fontSize: 14 }}>
          Con la primera opción de cada comida (o la que tengas abierta): <b style={{ color: 'var(--ink)' }}>{Math.round(dayTotal.kcal)} kcal</b> · P {Math.round(dayTotal.p)} g · C {Math.round(dayTotal.c)} g · G {Math.round(dayTotal.f)} g
          {p.targets.kcal > 0 && <> ({Math.round((dayTotal.kcal / p.targets.kcal) * 100)}% del objetivo)</>}
        </div>
      </div>

      {p.meals.map((m, mi) => {
        const oi = Math.min(openOpt[mi] ?? 0, m.options.length - 1)
        const o = m.options[oi]
        const t = mealTotals(o?.foods ?? [])
        const open = openMeal === mi
        return (
          <div key={mi} className="ca-card ca-stack">
            <div className="ca-row" style={{ flexWrap: 'wrap' }}>
              <input className="ca-input" style={{ flex: '2 1 180px', fontWeight: 800 }} value={m.name} onChange={e => setMeal(mi, { name: e.target.value })} aria-label="Nombre de la comida" />
              <input className="ca-input" style={{ flex: '0 0 120px' }} type="time" value={m.time} onChange={e => setMeal(mi, { time: e.target.value })} aria-label="Hora" />
              <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => setOpenMeal(open ? -1 : mi)}>{open ? 'Cerrar' : `Editar (${m.options.length} ${m.options.length === 1 ? 'opción' : 'opciones'})`}</button>
              <button className="ca-x" onClick={() => onChange({ ...p, meals: p.meals.filter((_, i) => i !== mi) })} aria-label="Quitar comida"><Trash2 size={15} /></button>
            </div>
            {open && o && (
              <>
                <div className="ca-tabbar-inline">
                  {m.options.map((op, i) => <button key={i} className={i === oi ? 'on' : ''} onClick={() => setOpenOpt(s => ({ ...s, [mi]: i }))}>{op.name || `Opción ${i + 1}`}</button>)}
                  <button onClick={() => { setMeal(mi, { options: [...m.options, blankOption(m.options.length + 1)] }); setOpenOpt(s => ({ ...s, [mi]: m.options.length })) }}><Plus size={14} /> Opción</button>
                </div>
                <div className="ca-row">
                  <input className="ca-input" value={o.name} onChange={e => setOpt(mi, oi, { name: e.target.value })} aria-label="Nombre de la opción" />
                  <button className="ca-x" title="Duplicar opción" onClick={() => { setMeal(mi, { options: [...m.options, { ...o, name: `${o.name} (copia)`, foods: o.foods.map(f => ({ ...f })) }] }); setOpenOpt(s => ({ ...s, [mi]: m.options.length })) }} aria-label="Duplicar opción"><Copy size={15} /></button>
                  {m.options.length > 1 && <button className="ca-x" onClick={() => { setMeal(mi, { options: m.options.filter((_, i) => i !== oi) }); setOpenOpt(s => ({ ...s, [mi]: 0 })) }} aria-label="Quitar opción"><X size={15} /></button>}
                </div>
                <div className="ca-food-row ca-ed-head"><span>Alimento</span><span>Cant.</span><span>Unidad</span><span>kcal</span><span>P</span><span>C</span><span>G</span><span /></div>
                {o.foods.map((f, fi) => (
                  <div key={fi} className="ca-food-row">
                    <input className="ca-input" value={f.name} onChange={e => setFood(mi, oi, fi, { name: e.target.value })} placeholder="Ej. Avena" aria-label="Alimento" />
                    <input className="ca-input" inputMode="decimal" value={f.qty} onChange={e => setFood(mi, oi, fi, { qty: num(e.target.value) })} aria-label="Cantidad" />
                    <input className="ca-input" value={f.unit} onChange={e => setFood(mi, oi, fi, { unit: e.target.value })} aria-label="Unidad" />
                    <input className="ca-input" inputMode="decimal" value={f.kcal} onChange={e => setFood(mi, oi, fi, { kcal: num(e.target.value) })} aria-label="Calorías" />
                    <input className="ca-input" inputMode="decimal" value={f.p} onChange={e => setFood(mi, oi, fi, { p: num(e.target.value) })} aria-label="Proteína" />
                    <input className="ca-input" inputMode="decimal" value={f.c} onChange={e => setFood(mi, oi, fi, { c: num(e.target.value) })} aria-label="Carbohidratos" />
                    <input className="ca-input" inputMode="decimal" value={f.f} onChange={e => setFood(mi, oi, fi, { f: num(e.target.value) })} aria-label="Grasa" />
                    <button className="ca-x" onClick={() => setOpt(mi, oi, { foods: o.foods.filter((_, i) => i !== fi) })} aria-label="Quitar alimento"><Trash2 size={15} /></button>
                  </div>
                ))}
                <div className="ca-between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button className="ca-btn ca-btn-soft ca-btn-sm" onClick={() => setOpt(mi, oi, { foods: [...o.foods, blankFood()] })}><Plus size={16} /> Alimento</button>
                  <span className="ca-muted" style={{ fontSize: 14 }}>{Math.round(t.kcal)} kcal · P {Math.round(t.p)} · C {Math.round(t.c)} · G {Math.round(t.f)}</span>
                </div>
                <label className="ca-field"><span className="ca-label">Receta o preparación (opcional)</span><textarea className="ca-textarea" style={{ minHeight: 70 }} value={o.recipe ?? ''} onChange={e => setOpt(mi, oi, { recipe: e.target.value || undefined })} /></label>
              </>
            )}
            {!open && <div className="ca-muted" style={{ fontSize: 14 }}>{m.options.map(op => op.name).join(' · ')} · {Math.round(t.kcal)} kcal</div>}
          </div>
        )
      })}
      <button className="ca-btn ca-btn-ghost ca-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { onChange({ ...p, meals: [...p.meals, blankMeal(`Comida ${p.meals.length + 1}`)] }); setOpenMeal(p.meals.length) }}><Plus size={16} /> Comida</button>
      <label className="ca-field"><span className="ca-label">Notas del plan</span><textarea className="ca-textarea" value={p.notes ?? ''} onChange={e => onChange({ ...p, notes: e.target.value })} placeholder="Agua, suplementos, comidas libres, cómo sustituir alimentos" /></label>
    </div>
  )
}
