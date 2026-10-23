'use client'

import { useState } from 'react'
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Empty, Spinner } from '@/components/coach/ui'
import NutritionEditor, { newPlan } from '@/components/coach/admin/NutritionEditor'
import { useArea } from '@/components/coach/admin/CoachArea'
import { mealTotals } from '@/lib/coach/fitness'
import { uid } from '@/lib/coach/util'
import type { NutritionPlan } from '@/lib/coach/types'

export default function NutritionTemplates() {
  const { coach, store } = useCoach()
  const { toast } = useArea()
  const { data, reload } = useData(s => s.list('nutrition', { clientId: null }))
  const [edit, setEdit] = useState<NutritionPlan | null>(null)
  const [saving, setSaving] = useState(false)
  if (!data) return <Spinner />

  async function save() {
    if (!edit) return
    setSaving(true)
    try {
      await store.put('nutrition', { ...edit, id: edit.id || uid('nt-'), clientId: null, name: edit.name.trim() || 'Plan' })
      setEdit(null); reload(); toast('Plantilla guardada')
    } finally { setSaving(false) }
  }

  if (edit) return (
    <div className="ca-stack">
      <div className="ca-page-head">
        <div className="ca-row"><button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => setEdit(null)} aria-label="Volver"><ArrowLeft size={16} /></button>
          <input className="ca-input" style={{ fontWeight: 800, fontSize: 18, maxWidth: 420 }} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} placeholder="Nombre de la plantilla" aria-label="Nombre" /></div>
        <div className="ca-row">
          {edit.id && <button className="ca-btn ca-btn-ghost" onClick={async () => { if (!window.confirm('¿Borrar esta plantilla?')) return; await store.remove('nutrition', edit.id); setEdit(null); reload() }}><Trash2 size={16} /></button>}
          <button className="ca-btn" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
      <NutritionEditor value={edit} onChange={setEdit} />
    </div>
  )

  return (
    <div>
      <div className="ca-page-head">
        <div><h1>Plantillas de nutrición</h1><p className="ca-muted">Planes base que cargas en la ficha de cada cliente y ajustas a sus macros.</p></div>
        <button className="ca-btn" onClick={() => setEdit({ ...newPlan(coach.id, null), name: '' })}><Plus size={18} /> Plantilla</button>
      </div>
      {!data.length ? <Empty icon="🥗" title="Sin plantillas" text="Ej. Definición 2.000 kcal, Volumen 2.800 kcal, Vegetariano." />
        : <div className="ca-grid2" style={{ gap: 14 }}>{data.map(p => {
          const kcal = Math.round(p.meals.reduce((n, m) => n + mealTotals(m.options[0]?.foods ?? []).kcal, 0))
          return (
            <div key={p.id} className="ca-card ca-stack" style={{ gap: 8, cursor: 'pointer' }} onClick={() => setEdit(p)}>
              <div className="ca-between"><h3>{p.name}</h3>
                <button className="ca-btn ca-btn-ghost ca-btn-sm" aria-label="Duplicar" onClick={async e => { e.stopPropagation(); await store.put('nutrition', { ...p, id: uid('nt-'), name: `${p.name} (copia)`, createdAt: new Date().toISOString() }); reload() }}><Copy size={15} /></button></div>
              <div className="ca-muted" style={{ fontSize: 14 }}>Objetivo {p.targets.kcal} kcal · P {p.targets.protein} · C {p.targets.carbs} · G {p.targets.fat}</div>
              <div style={{ fontSize: 14 }}>{p.meals.length} comidas · menú {kcal} kcal</div>
            </div>
          )
        })}</div>}
    </div>
  )
}
