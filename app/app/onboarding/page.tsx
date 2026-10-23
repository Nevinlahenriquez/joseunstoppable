'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoach } from '@/lib/coach/store'
import { useApp, BrandMark } from '../AppShell'
import type { Activity, Experience, Goal, Intake, Sex } from '@/lib/coach/types'
import { bmi, targetsFrom } from '@/lib/coach/fitness'
import { ageFrom, uid, ymd } from '@/lib/coach/util'

const GOALS: { v: Goal; ico: string; t: string; d: string }[] = [
  { v: 'lose_fat', ico: '🔥', t: 'Perder grasa', d: 'Bajar de peso sin perder músculo' },
  { v: 'gain_muscle', ico: '💪', t: 'Ganar músculo', d: 'Más masa y más fuerza' },
  { v: 'recomp', ico: '⚖️', t: 'Recomposición', d: 'Menos grasa y más músculo a la vez' },
  { v: 'strength', ico: '🏋️', t: 'Fuerza', d: 'Levantar más en los básicos' },
  { v: 'health', ico: '❤️', t: 'Salud y energía', d: 'Sentirme bien y moverme mejor' },
  { v: 'performance', ico: '⚡', t: 'Rendimiento', d: 'Para mi deporte' },
]
const ACTIVITY: { v: Activity; t: string; d: string }[] = [
  { v: 'sedentary', t: 'Sentado casi todo el día', d: 'Oficina, poco movimiento' },
  { v: 'light', t: 'Algo activo', d: 'Camino un poco cada día' },
  { v: 'moderate', t: 'Activo', d: 'De pie a menudo, 7-10 mil pasos' },
  { v: 'active', t: 'Muy activo', d: 'Trabajo físico o muchos pasos' },
  { v: 'very_active', t: 'Atleta', d: 'Entreno duro y trabajo físico' },
]
const EXP: { v: Experience; t: string }[] = [
  { v: 'beginner', t: 'Empiezo ahora' }, { v: 'intermediate', t: 'Ya entreno' }, { v: 'advanced', t: 'Años entrenando' },
]

type Draft = Omit<Intake, 'completedAt'>
const START: Draft = {
  goal: 'lose_fat', sex: 'male', birthDate: '', heightCm: 0, weightKg: 0, targetWeightKg: 0, activity: 'light',
  daysPerWeek: 3, experience: 'beginner', equipment: 'gym', injuries: '', allergies: '', diet: 'anything', mealsPerDay: 4, why: '',
}

export default function Onboarding() {
  const { store, coach } = useCoach()
  const { client, setClient, toast } = useApp()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(() => client?.intake ? { ...client.intake } : START)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }))
  const first = (client?.name ?? '').split(' ')[0]

  const STEPS = ['hola', 'goal', 'you', 'body', 'activity', 'training', 'food', 'why', 'done'] as const
  const age = ageFrom(d.birthDate)
  const valid: Record<string, boolean> = {
    hola: true, goal: !!d.goal, you: !!age && age >= 14,
    body: d.heightCm >= 120 && d.heightCm <= 230 && d.weightKg >= 35 && d.weightKg <= 250,
    activity: true, training: true, food: true, why: true, done: true,
  }
  const key = STEPS[step]
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))
  const back = () => setStep(s => Math.max(0, s - 1))
  const targets = valid.body && valid.you ? targetsFrom({ ...d, completedAt: '' }) : null

  async function finish() {
    if (!client) return
    setSaving(true)
    try {
      const intake: Intake = { ...d, targetWeightKg: d.targetWeightKg || d.weightKg, completedAt: new Date().toISOString() }
      const next = { ...client, intake, targets: client.targets ?? targetsFrom(intake), status: 'active' as const }
      await store.put('clients', next)
      await store.put('metrics', { id: uid('m-'), coachId: client.coachId, clientId: client.id, date: ymd(), type: 'weight', value: d.weightKg, createdAt: new Date().toISOString() })
      setClient(next)
      router.replace('/app')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar. Inténtalo otra vez.')
      setSaving(false)
    }
  }

  return (
    <main className="ca-main" style={{ paddingBottom: 40 }}>
      <div className="ca-top">
        <BrandMark />
        <span className="ca-muted" style={{ fontSize: 13, fontWeight: 700 }}>{step + 1} / {STEPS.length}</span>
      </div>
      <div className="ca-progress" style={{ marginBottom: 22 }}><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      <div className="ca-stack" style={{ minHeight: '58dvh' }}>
        {key === 'hola' && <>
          <div className="ca-eyebrow">Bienvenido</div>
          <h1>Hola{first ? ` ${first}` : ''}, vamos a montar tu plan</h1>
          <p className="ca-muted">Son 2 minutos. Con tus respuestas {coach.name.split(' ')[0]} prepara tus entrenos y tu plan de comidas, y calculamos tus calorías de partida.</p>
          <div className="ca-card ca-stack" style={{ gap: 10 }}>
            {['Tus objetivos y tu punto de partida', 'Cuántos días puedes entrenar', 'Lo que comes y lo que no'].map(t => <div key={t} className="ca-row"><span className="ca-pill ca-pill-ok">✓</span>{t}</div>)}
          </div>
        </>}

        {key === 'goal' && <>
          <h1>¿Qué quieres conseguir?</h1>
          {GOALS.map(g => (
            <button key={g.v} className={`ca-choice${d.goal === g.v ? ' on' : ''}`} onClick={() => { set('goal', g.v); setTimeout(next, 180) }}>
              <span className="ca-choice-ico">{g.ico}</span><span><b>{g.t}</b><small>{g.d}</small></span>
            </button>
          ))}
        </>}

        {key === 'you' && <>
          <h1>Sobre ti</h1>
          <div className="ca-field"><span className="ca-label">Sexo</span>
            <div className="ca-grid2">
              {([['male', 'Hombre'], ['female', 'Mujer']] as [Sex, string][]).map(([v, t]) => (
                <button key={v} className={`ca-choice${d.sex === v ? ' on' : ''}`} onClick={() => set('sex', v)} style={{ justifyContent: 'center' }}><b>{t}</b></button>
              ))}
            </div>
            <small className="ca-muted">Solo para calcular tus calorías.</small>
          </div>
          <label className="ca-field"><span className="ca-label">Fecha de nacimiento</span>
            <input className="ca-input" type="date" value={d.birthDate} max={ymd()} onChange={e => set('birthDate', e.target.value)} />
            {age && <small className="ca-muted">{age} años</small>}
          </label>
        </>}

        {key === 'body' && <>
          <h1>Tu punto de partida</h1>
          <div className="ca-grid2">
            <label className="ca-field"><span className="ca-label">Altura (cm)</span>
              <input className="ca-input" inputMode="numeric" type="number" placeholder="178" value={d.heightCm || ''} onChange={e => set('heightCm', Number(e.target.value))} /></label>
            <label className="ca-field"><span className="ca-label">Peso hoy (kg)</span>
              <input className="ca-input" inputMode="decimal" type="number" step="0.1" placeholder="82" value={d.weightKg || ''} onChange={e => set('weightKg', Number(e.target.value))} /></label>
          </div>
          <label className="ca-field"><span className="ca-label">Peso objetivo (kg), opcional</span>
            <input className="ca-input" inputMode="decimal" type="number" step="0.1" placeholder={d.weightKg ? String(d.weightKg) : '76'} value={d.targetWeightKg || ''} onChange={e => set('targetWeightKg', Number(e.target.value))} /></label>
          {valid.body && <div className="ca-card ca-card-tight ca-between"><span className="ca-muted">Tu IMC</span><b>{bmi(d)}</b></div>}
        </>}

        {key === 'activity' && <>
          <h1>¿Cómo es tu día a día?</h1>
          <p className="ca-muted">Sin contar el entrenamiento.</p>
          {ACTIVITY.map(a => (
            <button key={a.v} className={`ca-choice${d.activity === a.v ? ' on' : ''}`} onClick={() => { set('activity', a.v); setTimeout(next, 180) }}>
              <span><b>{a.t}</b><small>{a.d}</small></span>
            </button>
          ))}
        </>}

        {key === 'training' && <>
          <h1>Tu entrenamiento</h1>
          <div className="ca-field"><span className="ca-label">Días por semana que puedes entrenar</span>
            <div className="ca-chips">{[2, 3, 4, 5, 6].map(n => <button key={n} className={`ca-chip${d.daysPerWeek === n ? ' on' : ''}`} onClick={() => set('daysPerWeek', n)}>{n} días</button>)}</div></div>
          <div className="ca-field"><span className="ca-label">Experiencia</span>
            <div className="ca-chips">{EXP.map(e => <button key={e.v} className={`ca-chip${d.experience === e.v ? ' on' : ''}`} onClick={() => set('experience', e.v)}>{e.t}</button>)}</div></div>
          <div className="ca-field"><span className="ca-label">Dónde entrenas</span>
            <div className="ca-chips">{([['gym', 'Gimnasio'], ['home', 'En casa'], ['both', 'Los dos']] as const).map(([v, t]) => <button key={v} className={`ca-chip${d.equipment === v ? ' on' : ''}`} onClick={() => set('equipment', v)}>{t}</button>)}</div></div>
          <label className="ca-field"><span className="ca-label">Lesiones o molestias</span>
            <textarea className="ca-textarea" placeholder="Ej: rodilla derecha, hombro... o nada" value={d.injuries} onChange={e => set('injuries', e.target.value)} /></label>
        </>}

        {key === 'food' && <>
          <h1>Tu alimentación</h1>
          <div className="ca-field"><span className="ca-label">¿Cómo comes?</span>
            <div className="ca-chips">{([['anything', 'De todo'], ['vegetarian', 'Vegetariano'], ['vegan', 'Vegano'], ['pescatarian', 'Pescetariano'], ['other', 'Otro']] as const).map(([v, t]) => <button key={v} className={`ca-chip${d.diet === v ? ' on' : ''}`} onClick={() => set('diet', v)}>{t}</button>)}</div></div>
          <div className="ca-field"><span className="ca-label">Comidas al día</span>
            <div className="ca-chips">{[2, 3, 4, 5, 6].map(n => <button key={n} className={`ca-chip${d.mealsPerDay === n ? ' on' : ''}`} onClick={() => set('mealsPerDay', n)}>{n}</button>)}</div></div>
          <label className="ca-field"><span className="ca-label">Alergias o alimentos que no comes</span>
            <textarea className="ca-textarea" placeholder="Ej: lactosa, marisco... o nada" value={d.allergies} onChange={e => set('allergies', e.target.value)} /></label>
        </>}

        {key === 'why' && <>
          <h1>¿Por qué ahora?</h1>
          <p className="ca-muted">Lo que te ha hecho empezar. Te lo recordaremos los días que cueste.</p>
          <textarea className="ca-textarea" style={{ minHeight: 140 }} placeholder="Quiero verme y sentirme fuerte otra vez..." value={d.why} onChange={e => set('why', e.target.value)} />
        </>}

        {key === 'done' && targets && <>
          <div className="ca-eyebrow">Tu plan de partida</div>
          <h1>Listo{first ? `, ${first}` : ''}</h1>
          <div className="ca-card ca-hero ca-stack">
            <div className="ca-eyebrow">Calorías al día</div>
            <div className="ca-display" style={{ fontSize: 44, fontWeight: 800, color: '#fff' }}>{targets.kcal} <span style={{ fontSize: 18 }}>kcal</span></div>
            <div className="ca-macro" style={{ color: '#fff' }}>
              {[['Proteína', targets.protein], ['Carbos', targets.carbs], ['Grasa', targets.fat]].map(([l, v]) => <div key={l as string}><b style={{ color: '#fff' }}>{v} g</b><small style={{ color: 'rgba(255,255,255,.8)' }}>{l}</small></div>)}
            </div>
          </div>
          <p className="ca-muted" style={{ fontSize: 14 }}>Es tu punto de partida. {coach.name.split(' ')[0]} lo revisa y lo ajusta contigo.</p>
        </>}
      </div>

      <div className="ca-row" style={{ marginTop: 22 }}>
        {step > 0 && <button className="ca-btn ca-btn-ghost" onClick={back}>Atrás</button>}
        {key === 'done'
          ? <button className="ca-btn" style={{ flex: 1 }} onClick={finish} disabled={saving}>{saving ? 'Guardando…' : 'Empezar'}</button>
          : <button className="ca-btn" style={{ flex: 1 }} onClick={next} disabled={!valid[key]}>{key === 'hola' ? 'Vamos' : 'Siguiente'}</button>}
      </div>
    </main>
  )
}
