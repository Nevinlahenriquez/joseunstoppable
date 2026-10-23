'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import type { Exercise, Workout, WorkoutBlock, WorkoutItem } from '@/lib/coach/types'
import { Sheet } from '@/components/coach/ui'

const blankItem = (exerciseId = ''): WorkoutItem => ({ exerciseId, sets: 3, reps: '10', restSec: 90 })

/** Edits a template or an assigned workout. Nothing is saved until "Guardar". */
export default function WorkoutEditor({ open, initial, exercises, onClose, onSave, onDelete, withDate }: {
  open: boolean
  initial: Workout | null
  exercises: Exercise[]
  onClose: () => void
  onSave: (w: Workout) => Promise<void> | void
  onDelete?: (w: Workout) => void
  withDate?: boolean
}) {
  const [w, setW] = useState<Workout | null>(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { setW(initial); setErr(null) }, [initial])
  const byMuscle = useMemo(() => {
    const m = new Map<string, Exercise[]>()
    for (const e of [...exercises].sort((a, b) => a.name.localeCompare(b.name))) m.set(e.muscle || 'Otros', [...(m.get(e.muscle || 'Otros') ?? []), e])
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [exercises])
  if (!w) return null

  const setBlock = (bi: number, patch: Partial<WorkoutBlock>) => setW({ ...w, blocks: w.blocks.map((b, i) => (i === bi ? { ...b, ...patch } : b)) })
  const setItem = (bi: number, ii: number, patch: Partial<WorkoutItem>) => setBlock(bi, { items: w.blocks[bi].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) })
  const moveItem = (bi: number, ii: number, d: -1 | 1) => {
    const items = [...w.blocks[bi].items]
    const j = ii + d
    if (j < 0 || j >= items.length) return
    ;[items[ii], items[j]] = [items[j], items[ii]]
    setBlock(bi, { items })
  }

  async function save() {
    if (!w) return
    if (!w.name.trim()) { setErr('Ponle un nombre.'); return }
    const clean = { ...w, blocks: w.blocks.map(b => ({ ...b, items: b.items.filter(i => i.exerciseId) })).filter(b => b.items.length || b.title) }
    if (!clean.blocks.some(b => b.items.length)) { setErr('Añade al menos un ejercicio.'); return }
    setSaving(true); setErr(null)
    try { await onSave(clean) } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title={initial?.name ? 'Editar entreno' : 'Nuevo entreno'} wide
      footer={<div className="ca-between" style={{ width: '100%' }}>
        {onDelete && initial?.name ? <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => onDelete(w)}><Trash2 size={16} /> Borrar</button> : <span />}
        <div className="ca-row"><button className="ca-btn ca-btn-ghost" onClick={onClose}>Cancelar</button><button className="ca-btn" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </div>}>
      <div className="ca-stack">
        <div className={withDate ? 'ca-grid2' : ''}>
          <label className="ca-field"><span className="ca-label">Nombre</span><input className="ca-input" value={w.name} onChange={e => setW({ ...w, name: e.target.value })} placeholder="Ej. Pierna A" /></label>
          {withDate && <label className="ca-field"><span className="ca-label">Fecha</span><input className="ca-input" type="date" value={w.date ?? ''} onChange={e => setW({ ...w, date: e.target.value || undefined })} /></label>}
        </div>
        <label className="ca-field"><span className="ca-label">Notas para el cliente</span><textarea className="ca-textarea" style={{ minHeight: 70 }} value={w.notes ?? ''} onChange={e => setW({ ...w, notes: e.target.value })} placeholder="Calentamiento, intensidad, en qué fijarse" /></label>

        {w.blocks.map((b, bi) => (
          <div key={bi} className="ca-card ca-stack" style={{ background: '#FAFBFE' }}>
            <div className="ca-row">
              <input className="ca-input" style={{ fontWeight: 800 }} value={b.title} onChange={e => setBlock(bi, { title: e.target.value })} placeholder="Bloque (ej. Calentamiento, Principal)" aria-label="Nombre del bloque" />
              {w.blocks.length > 1 && <button className="ca-x" onClick={() => setW({ ...w, blocks: w.blocks.filter((_, i) => i !== bi) })} aria-label="Quitar bloque"><X size={16} /></button>}
            </div>
            <div className="ca-ed-item ca-ed-head"><span>Ejercicio</span><span>Series</span><span>Reps</span><span>Descanso</span><span>Kg</span><span /></div>
            {b.items.map((it, ii) => (
              <div key={ii} className="ca-stack" style={{ gap: 6 }}>
                <div className="ca-ed-item">
                  <select className="ca-select" value={it.exerciseId} onChange={e => setItem(bi, ii, { exerciseId: e.target.value })} aria-label="Ejercicio">
                    <option value="">Elige un ejercicio</option>
                    {byMuscle.map(([m, list]) => <optgroup key={m} label={m}>{list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup>)}
                  </select>
                  <input className="ca-input" type="number" min={1} max={20} value={it.sets} onChange={e => setItem(bi, ii, { sets: Math.max(1, Number(e.target.value) || 1) })} aria-label="Series" />
                  <input className="ca-input" value={it.reps} onChange={e => setItem(bi, ii, { reps: e.target.value })} placeholder="12-10-8" aria-label="Repeticiones" />
                  <input className="ca-input" type="number" min={0} step={15} value={it.restSec} onChange={e => setItem(bi, ii, { restSec: Math.max(0, Number(e.target.value) || 0) })} aria-label="Descanso en segundos" title="segundos" />
                  <input className="ca-input" value={it.load ?? ''} onChange={e => setItem(bi, ii, { load: e.target.value || undefined })} placeholder="opcional" aria-label="Carga sugerida en kg" />
                  <button className="ca-x" onClick={() => setBlock(bi, { items: b.items.filter((_, i) => i !== ii) })} aria-label="Quitar ejercicio"><Trash2 size={15} /></button>
                </div>
                <div className="ca-row" style={{ gap: 6 }}>
                  <input className="ca-input" style={{ minHeight: 38, fontSize: 14, padding: '6px 10px' }} value={it.notes ?? ''} onChange={e => setItem(bi, ii, { notes: e.target.value || undefined })} placeholder="Nota (tempo, técnica, superserie…)" aria-label="Nota del ejercicio" />
                  <button className="ca-x" onClick={() => moveItem(bi, ii, -1)} aria-label="Subir"><ArrowUp size={15} /></button>
                  <button className="ca-x" onClick={() => moveItem(bi, ii, 1)} aria-label="Bajar"><ArrowDown size={15} /></button>
                </div>
              </div>
            ))}
            <button className="ca-btn ca-btn-soft ca-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setBlock(bi, { items: [...b.items, blankItem()] })}><Plus size={16} /> Ejercicio</button>
          </div>
        ))}
        <button className="ca-btn ca-btn-ghost ca-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setW({ ...w, blocks: [...w.blocks, { title: '', items: [blankItem()] }] })}><Plus size={16} /> Bloque</button>
        {!exercises.length && <div className="ca-alert info">Tu biblioteca de ejercicios está vacía. Añade ejercicios en Ejercicios primero.</div>}
        {err && <div className="ca-alert" role="alert">{err}</div>}
      </div>
    </Sheet>
  )
}

export function newWorkout(coachId: string, clientId: string | null, date?: string): Workout {
  return { id: '', coachId, clientId, name: '', date, blocks: [{ title: 'Principal', items: [blankItem()] }], createdAt: new Date().toISOString() }
}
