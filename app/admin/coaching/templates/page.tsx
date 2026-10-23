'use client'

import { useState } from 'react'
import { Copy, Plus } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Empty, Spinner } from '@/components/coach/ui'
import WorkoutEditor, { newWorkout } from '@/components/coach/admin/WorkoutEditor'
import { useArea } from '@/components/coach/admin/CoachArea'
import { uid } from '@/lib/coach/util'
import type { Workout } from '@/lib/coach/types'

export default function Templates() {
  const { coach, store } = useCoach()
  const { toast } = useArea()
  const { data, reload } = useData(async s => {
    const [templates, exercises] = await Promise.all([s.list('workouts', { clientId: null }), s.list('exercises')])
    return { templates: templates.sort((a, b) => a.name.localeCompare(b.name)), exercises }
  })
  const [edit, setEdit] = useState<Workout | null>(null)
  if (!data) return <Spinner />
  const exName = new Map(data.exercises.map(e => [e.id, e.name]))

  async function save(w: Workout) {
    await store.put('workouts', { ...w, id: w.id || uid('tp-'), clientId: null, date: undefined })
    setEdit(null); reload(); toast('Plantilla guardada')
  }
  async function dup(w: Workout) {
    await store.put('workouts', { ...w, id: uid('tp-'), name: `${w.name} (copia)`, createdAt: new Date().toISOString() })
    reload(); toast('Plantilla duplicada')
  }

  return (
    <div>
      <div className="ca-page-head">
        <div><h1>Plantillas de entreno</h1><p className="ca-muted">Créalas una vez y asígnalas a cada cliente en los días que entrena, desde su ficha.</p></div>
        <button className="ca-btn" onClick={() => setEdit(newWorkout(coach.id, null))}><Plus size={18} /> Plantilla</button>
      </div>
      {!data.templates.length ? <Empty icon="🗂️" title="Sin plantillas" text="Ej. Torso A, Pierna B, Full body 45 min." action={<button className="ca-btn" onClick={() => setEdit(newWorkout(coach.id, null))}><Plus size={18} /> Primera plantilla</button>} />
        : <div className="ca-grid2" style={{ gap: 14 }}>{data.templates.map(t => {
          const items = t.blocks.flatMap(b => b.items)
          return (
            <div key={t.id} className="ca-card ca-stack" style={{ gap: 10, cursor: 'pointer' }} onClick={() => setEdit(t)}>
              <div className="ca-between"><h3>{t.name}</h3><button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={e => { e.stopPropagation(); dup(t) }} aria-label="Duplicar"><Copy size={15} /></button></div>
              <div className="ca-muted" style={{ fontSize: 14 }}>{items.length} ejercicios · {items.reduce((n, i) => n + i.sets, 0)} series</div>
              <div style={{ fontSize: 14, color: 'var(--text)' }}>{items.slice(0, 5).map(i => exName.get(i.exerciseId) ?? 'Ejercicio').join(' · ')}{items.length > 5 ? ' …' : ''}</div>
            </div>
          )
        })}</div>}
      <WorkoutEditor open={!!edit} initial={edit} exercises={data.exercises} onClose={() => setEdit(null)} onSave={save}
        onDelete={async w => { if (!window.confirm(`¿Borrar la plantilla ${w.name}? Los entrenos ya asignados se quedan.`)) return; await store.remove('workouts', w.id); setEdit(null); reload(); toast('Plantilla borrada') }} />
    </div>
  )
}
