'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, Plus } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp, BrandMark } from '../AppShell'
import { Empty, LineChart, Scale, Sheet, Spinner } from '@/components/coach/ui'
import { POSES, PhotoCompare, PhotoTimeline } from '@/components/coach/Photos'
import { achievements } from '@/lib/coach/achievements'
import { METRICS } from '@/lib/coach/metrics'
import type { MetricType, Pose } from '@/lib/coach/types'
import { parseYmd, round1, shrinkImage, uid, weekStart, ymd } from '@/lib/coach/util'

type Tab = 'body' | 'photos' | 'wins' | 'checkin'

export default function Progress() {
  const params = useSearchParams()
  const { store, clientId, coach, viewingAs } = useCoach()
  const { client, toast } = useApp()
  const [tab, setTab] = useState<Tab>(params.get('checkin') ? 'checkin' : 'body')
  const [metric, setMetric] = useState<MetricType>('weight')
  const [adding, setAdding] = useState(false)
  const [vals, setVals] = useState<Partial<Record<MetricType, string>>>({})
  const [date, setDate] = useState(ymd())
  const [uploading, setUploading] = useState<Pose | null>(null)
  const [photoDate, setPhotoDate] = useState(ymd())
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingPose = useRef<Pose>('front')
  const [ci, setCi] = useState({ energy: 3, sleep: 3, stress: 3, hunger: 3, adherence: 3, wins: '', struggles: '' })

  const { data, reload } = useData(async s => {
    const [metrics, photos, logs, checkins, exercises] = await Promise.all([
      s.list('metrics', { clientId }), s.list('photos', { clientId }), s.list('logs', { clientId }), s.list('checkins', { clientId }), s.list('exercises'),
    ])
    return { metrics, photos, logs, checkins, exIds: exercises.map(e => e.id) }
  }, [clientId])
  useEffect(() => { if (params.get('checkin')) setTab('checkin') }, [params])

  if (!data || !client) return <main className="ca-main"><Spinner /></main>
  const def = METRICS.find(m => m.k === metric)!
  const series = data.metrics.filter(m => m.type === metric).sort((a, b) => a.date.localeCompare(b.date))
  const latest = (t: MetricType) => data.metrics.filter(m => m.type === t).sort((a, b) => b.date.localeCompare(a.date))[0]
  const firstW = data.metrics.filter(m => m.type === 'weight').sort((a, b) => a.date.localeCompare(b.date))[0]
  const lastW = latest('weight')
  const goal = client.intake?.targetWeightKg
  const thisWeek = data.checkins.find(c => c.date >= weekStart(ymd()))

  async function saveMetrics() {
    if (!client) return
    const rows = METRICS.filter(m => vals[m.k] && Number(vals[m.k]) > 0).map(m => ({ id: uid('m-'), coachId: client.coachId, clientId: client.id, date, type: m.k, value: Number(vals[m.k]), createdAt: new Date().toISOString() }))
    if (!rows.length) return
    try { for (const r of rows) await store.put('metrics', r); setAdding(false); setVals({}); toast('Medidas guardadas'); reload() }
    catch { toast('No se pudo guardar. Inténtalo otra vez.') }
  }

  async function onFile(f: File | undefined) {
    if (!f || !client) return
    const pose = pendingPose.current
    setUploading(pose)
    try {
      const blob = await shrinkImage(f)
      const path = await store.upload(blob, client.id)
      const old = data!.photos.find(p => p.date === photoDate && p.pose === pose)
      if (old) await store.remove('photos', old.id).catch(() => {})
      await store.put('photos', { id: uid('ph-'), coachId: client.coachId, clientId: client.id, date: photoDate, pose, path, createdAt: new Date().toISOString() })
      toast('Foto guardada. Solo la veis tú y tu entrenador.')
      reload()
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo subir la foto.') }
    finally { setUploading(null); if (fileRef.current) fileRef.current.value = '' }
  }

  async function sendCheckin() {
    if (!client) return
    try {
      await store.put('checkins', { id: thisWeek?.id ?? uid('ci-'), coachId: client.coachId, clientId: client.id, date: ymd(), ...ci, createdAt: new Date().toISOString() })
      toast(`Check-in enviado a ${coach.name.split(' ')[0]}`); reload()
    } catch { toast('No se pudo enviar. Inténtalo otra vez.') }
  }

  const wins = achievements(data.logs, data.metrics, data.photos, data.checkins, data.exIds)

  return (
    <main className="ca-main ca-stack">
      <div className="ca-top"><BrandMark /></div>
      <h1>Tu progreso</h1>
      <div className="ca-tabbar-inline">
        {([['body', 'Medidas'], ['photos', 'Fotos'], ['wins', 'Logros'], ['checkin', 'Check-in']] as [Tab, string][]).map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}
      </div>

      {tab === 'body' && <>
        {lastW && (
          <div className="ca-card ca-hero">
            <div className="ca-eyebrow">Peso actual</div>
            <div className="ca-between" style={{ alignItems: 'flex-end', marginTop: 4 }}>
              <div className="ca-display" style={{ fontSize: 40, fontWeight: 800, color: '#fff' }}>{lastW.value} <span style={{ fontSize: 18 }}>kg</span></div>
              {firstW && firstW.id !== lastW.id && <div style={{ textAlign: 'right' }}><b style={{ fontSize: 18 }}>{lastW.value - firstW.value > 0 ? '+' : ''}{round1(lastW.value - firstW.value)} kg</b><div style={{ opacity: .8, fontSize: 13 }}>desde el inicio</div></div>}
            </div>
            {goal && goal !== firstW?.value && firstW && (
              <div style={{ marginTop: 12 }}>
                <div className="ca-progress" style={{ background: 'rgba(255,255,255,.25)' }}><i style={{ background: '#fff', width: `${Math.max(0, Math.min(100, ((firstW.value - lastW.value) / (firstW.value - goal)) * 100))}%` }} /></div>
                <div style={{ fontSize: 13, opacity: .85, marginTop: 6 }}>Objetivo: {goal} kg</div>
              </div>
            )}
          </div>
        )}
        <div className="ca-chips">{METRICS.map(m => <button key={m.k} className={`ca-chip${metric === m.k ? ' on' : ''}`} onClick={() => setMetric(m.k)}>{m.t}</button>)}</div>
        <div className="ca-card">
          <div className="ca-between" style={{ marginBottom: 10 }}><h3>{def.t}</h3>{series.length > 0 && <b>{series[series.length - 1].value} {def.u}</b>}</div>
          <LineChart points={series.map(m => ({ x: m.date, y: m.value }))} unit={` ${def.u}`} />
        </div>
        {!viewingAs && <button className="ca-btn ca-btn-block" onClick={() => setAdding(true)}><Plus size={18} /> Añadir medidas</button>}
      </>}

      {tab === 'photos' && <>
        <div className="ca-card ca-stack">
          <h3>Fotos de progreso</h3>
          <p className="ca-muted" style={{ margin: 0, fontSize: 14 }}>Misma luz, misma ropa, cada 2-4 semanas. Privadas: solo las veis tú y {coach.name.split(' ')[0]}.</p>
          {!viewingAs && <>
            <label className="ca-field"><span className="ca-label">Fecha</span><input className="ca-input" type="date" max={ymd()} value={photoDate} onChange={e => setPhotoDate(e.target.value)} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {POSES.map(p => (
                <button key={p.k} className="ca-btn ca-btn-soft" style={{ flexDirection: 'column', minHeight: 76, gap: 4, padding: 6 }} disabled={!!uploading}
                  onClick={() => { pendingPose.current = p.k; fileRef.current?.click() }}>
                  <Camera size={20} /><span style={{ fontSize: 13 }}>{uploading === p.k ? 'Subiendo…' : p.t}</span>
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0])} />
          </>}
        </div>
        {data.photos.length ? <>
          {new Set(data.photos.map(p => p.date)).size > 1 && <div className="ca-card"><h3 style={{ marginBottom: 10 }}>Antes y después</h3><PhotoCompare store={store} photos={data.photos} /></div>}
          <div className="ca-card"><PhotoTimeline store={store} photos={data.photos} onRemove={viewingAs ? undefined : async p => { await store.remove('photos', p.id); reload() }} /></div>
        </> : <div className="ca-card"><Empty icon="📸" title="Tu primera foto de antes" text="Dentro de unas semanas te alegrarás de tenerla." /></div>}
      </>}

      {tab === 'wins' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {wins.map(w => (
            <div key={w.id} className="ca-card ca-stack" style={{ gap: 6, opacity: w.earned ? 1 : .6, textAlign: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 34, filter: w.earned ? undefined : 'grayscale(1)' }}>{w.icon}</div>
              <b style={{ color: 'var(--ink)' }}>{w.title}</b>
              <div className="ca-muted" style={{ fontSize: 13 }}>{w.detail}</div>
              {!w.earned && w.progress !== undefined && <div className="ca-progress" style={{ width: '100%', height: 6 }}><i style={{ width: `${w.progress * 100}%` }} /></div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'checkin' && <>
        {thisWeek && <div className="ca-card ca-row"><span className="ca-pill ca-pill-ok">✓</span><span>Ya enviaste el check-in de esta semana. Puedes actualizarlo.</span></div>}
        {!viewingAs && <div className="ca-card ca-stack">
          <h3>Check-in semanal</h3>
          {([['energy', 'Energía', 'Baja', 'Alta'], ['sleep', 'Sueño', 'Mal', 'Genial'], ['stress', 'Estrés', 'Nada', 'Mucho'], ['hunger', 'Hambre', 'Nada', 'Mucha'], ['adherence', 'Cumplí el plan', 'Poco', 'Todo']] as const).map(([k, t, lo, hi]) => (
            <div key={k} className="ca-field"><span className="ca-label">{t}</span><Scale value={ci[k]} onChange={n => setCi(c => ({ ...c, [k]: n }))} low={lo} high={hi} /></div>
          ))}
          <label className="ca-field"><span className="ca-label">Lo mejor de la semana</span><textarea className="ca-textarea" value={ci.wins} onChange={e => setCi(c => ({ ...c, wins: e.target.value }))} placeholder="Subí peso en sentadilla..." /></label>
          <label className="ca-field"><span className="ca-label">Lo que más te costó</span><textarea className="ca-textarea" value={ci.struggles} onChange={e => setCi(c => ({ ...c, struggles: e.target.value }))} placeholder="Los fines de semana con la comida..." /></label>
          <button className="ca-btn ca-btn-block" onClick={sendCheckin}>Enviar check-in</button>
        </div>}
        {data.checkins.length > 0 && <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {[...data.checkins].sort((a, b) => b.date.localeCompare(a.date)).map(c => (
            <div key={c.id} className="ca-li" style={{ cursor: 'default' }}>
              <div className="ca-li-main"><div className="ca-li-title">{parseYmd(c.date).toLocaleDateString('es', { day: 'numeric', month: 'long' })}</div>
                <div className="ca-li-sub">Energía {c.energy} · Sueño {c.sleep} · Estrés {c.stress} · Plan {c.adherence}</div></div>
            </div>
          ))}
        </div>}
      </>}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Nuevas medidas"
        footer={<><button className="ca-btn ca-btn-ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="ca-btn" onClick={saveMetrics}>Guardar</button></>}>
        <div className="ca-stack">
          <label className="ca-field"><span className="ca-label">Fecha</span><input className="ca-input" type="date" max={ymd()} value={date} onChange={e => setDate(e.target.value)} /></label>
          <div className="ca-grid2">
            {METRICS.map(m => (
              <label key={m.k} className="ca-field"><span className="ca-label">{m.t} ({m.u})</span>
                <input className="ca-input" inputMode="decimal" type="number" step="0.1" placeholder={latest(m.k) ? String(latest(m.k)!.value) : ''} value={vals[m.k] ?? ''} onChange={e => setVals(v => ({ ...v, [m.k]: e.target.value }))} /></label>
            ))}
          </div>
          <div className="ca-muted" style={{ fontSize: 13 }}>Rellena solo lo que hayas medido.</div>
        </div>
      </Sheet>
    </main>
  )
}
