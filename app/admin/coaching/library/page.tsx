'use client'

import { useMemo, useRef, useState } from 'react'
import { FileText, Link2, Plus, Search, Trash2, UploadCloud, Video } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Empty, Sheet, Spinner } from '@/components/coach/ui'
import VideoPlayer from '@/components/coach/VideoPlayer'
import { useArea } from '@/components/coach/admin/CoachArea'
import { uid } from '@/lib/coach/util'
import type { Exercise, Resource } from '@/lib/coach/types'

const MUSCLES = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Piernas', 'Glúteos', 'Core', 'Cardio', 'Movilidad']

export default function Library() {
  const [tab, setTab] = useState<'ex' | 'res'>('ex')
  return (
    <div>
      <div className="ca-page-head">
        <div><h1>Biblioteca</h1><p className="ca-muted">Tus ejercicios con su vídeo, y los recursos que ven tus clientes en su perfil.</p></div>
      </div>
      <div className="ca-tabbar-inline" style={{ marginBottom: 16 }}>
        <button className={tab === 'ex' ? 'on' : ''} onClick={() => setTab('ex')}>Ejercicios</button>
        <button className={tab === 'res' ? 'on' : ''} onClick={() => setTab('res')}>Recursos</button>
      </div>
      {tab === 'ex' ? <Exercises /> : <Resources />}
    </div>
  )
}

function Exercises() {
  const { coach, store } = useCoach()
  const { toast } = useArea()
  const { data, reload } = useData(s => s.list('exercises'))
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [edit, setEdit] = useState<Exercise | null>(null)
  const list = useMemo(() => (data ?? [])
    .filter(e => (!muscle || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name)), [data, q, muscle])
  const muscles = useMemo(() => [...new Set([...MUSCLES, ...(data ?? []).map(e => e.muscle).filter(Boolean)])], [data])
  if (!data) return <Spinner />
  const blank = (): Exercise => ({ id: '', coachId: coach.id, name: '', muscle: muscle ?? 'Piernas', equipment: '', cues: '' })

  return (
    <div className="ca-stack">
      <div className="ca-row" style={{ flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={17} style={{ position: 'absolute', left: 12, top: 15, color: 'var(--muted)' }} />
          <input className="ca-input" style={{ paddingLeft: 38 }} placeholder="Buscar ejercicio" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
        </div>
        <button className="ca-btn" onClick={() => setEdit(blank())}><Plus size={18} /> Ejercicio</button>
      </div>
      <div className="ca-chips">
        <button className={`ca-chip${!muscle ? ' on' : ''}`} onClick={() => setMuscle(null)}>Todos ({data.length})</button>
        {muscles.filter(m => data.some(e => e.muscle === m)).map(m => <button key={m} className={`ca-chip${muscle === m ? ' on' : ''}`} onClick={() => setMuscle(m)}>{m}</button>)}
      </div>
      {!data.length ? <Empty icon="🎬" title="Tu biblioteca está vacía" text="Graba cada ejercicio con el móvil y súbelo aquí. Tus clientes lo ven al entrenar." action={<button className="ca-btn" onClick={() => setEdit(blank())}><Plus size={18} /> Primer ejercicio</button>} />
        : (
          <div className="ca-table-wrap"><table className="ca-table">
            <thead><tr><th>Ejercicio</th><th>Músculo</th><th>Material</th><th>Vídeo</th></tr></thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id} className="click" onClick={() => setEdit(e)}>
                  <td><b style={{ color: 'var(--ink)' }}>{e.name}</b>{e.cues && <div className="ca-muted" style={{ fontSize: 13, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.cues}</div>}</td>
                  <td>{e.muscle}</td>
                  <td className="ca-muted">{e.equipment || '–'}</td>
                  <td>{e.videoUrl ? <span className="ca-pill ca-pill-ok"><Video size={13} /> Sí</span> : <span className="ca-pill ca-pill-warn">Falta</span>}</td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={4} className="ca-muted" style={{ textAlign: 'center', padding: 28 }}>Nada coincide.</td></tr>}
            </tbody>
          </table></div>
        )}
      {edit && <ExerciseSheet ex={edit} muscles={muscles} onClose={() => setEdit(null)}
        onSave={async e => { await store.put('exercises', { ...e, id: e.id || uid('ex-') }); setEdit(null); reload(); toast('Ejercicio guardado') }}
        onDelete={async e => { if (!window.confirm(`¿Borrar ${e.name}? Los entrenos que lo usan lo mostrarán como "Ejercicio".`)) return; await store.remove('exercises', e.id); setEdit(null); reload(); toast('Ejercicio borrado') }} />}
    </div>
  )
}

function ExerciseSheet({ ex, muscles, onClose, onSave, onDelete }: { ex: Exercise; muscles: string[]; onClose: () => void; onSave: (e: Exercise) => Promise<void>; onDelete: (e: Exercise) => void }) {
  const { store } = useCoach()
  const [e, setE] = useState(ex)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [up, setUp] = useState<{ pct: number; label: string } | null>(null)
  const file = useRef<HTMLInputElement>(null)

  async function upload(f: File) {
    setErr(null)
    // Demo: keep a small file in the browser so the player can be tried.
    if (store.mode === 'demo') {
      if (f.size > 4 * 1024 * 1024) { setErr('En la demo solo caben vídeos de menos de 4 MB. Con Bunny conectado no hay límite.'); return }
      setUp({ pct: 50, label: 'Guardando en la demo…' })
      const url = await store.upload(f, `videos/${uid()}`)
      setE(x => ({ ...x, videoUrl: url, portrait: undefined })); setUp(null); return
    }
    try {
      setUp({ pct: 0, label: 'Preparando…' })
      const portrait = await isPortrait(f)
      const r = await fetch('/api/coach/video', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: e.name || f.name }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'No se pudo preparar la subida.')
      const t = j.ticket as { videoId: string; hls: string; thumb: string; libraryId: string; signature: string; expire: number; endpoint: string }
      const { Upload } = await import('tus-js-client')
      await new Promise<void>((res, rej) => {
        const u = new Upload(f, {
          endpoint: t.endpoint,
          retryDelays: [0, 3000, 10000, 30000],
          headers: { AuthorizationSignature: t.signature, AuthorizationExpire: String(t.expire), VideoId: t.videoId, LibraryId: t.libraryId },
          metadata: { filetype: f.type, title: e.name || f.name },
          onProgress: (a, b) => setUp({ pct: Math.round((a / b) * 100), label: 'Subiendo a Bunny…' }),
          onError: err => rej(err),
          onSuccess: () => res(),
        })
        u.start()
      })
      setE(x => ({ ...x, videoUrl: t.hls, thumbUrl: t.thumb, portrait }))
      setUp({ pct: 100, label: 'Subido. Bunny lo prepara en unos minutos; ya puedes guardar.' })
    } catch (x) { setUp(null); setErr(x instanceof Error ? x.message : 'La subida falló.') }
  }

  async function save() {
    if (!e.name.trim()) { setErr('Ponle nombre.'); return }
    if (up && up.pct < 100) { setErr('Espera a que termine la subida.'); return }
    setSaving(true)
    try { await onSave({ ...e, name: e.name.trim() }) } catch (x) { setErr(x instanceof Error ? x.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }

  return (
    <Sheet open onClose={onClose} title={ex.id ? 'Editar ejercicio' : 'Nuevo ejercicio'} wide
      footer={<>{ex.id && <button className="ca-btn ca-btn-ghost" style={{ marginRight: 'auto' }} onClick={() => onDelete(ex)}><Trash2 size={16} /> Borrar</button>}<button className="ca-btn ca-btn-ghost" onClick={onClose}>Cancelar</button><button className="ca-btn" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></>}>
      <div className="ca-split">
        <div className="ca-stack">
          <label className="ca-field"><span className="ca-label">Nombre</span><input className="ca-input" value={e.name} onChange={x => setE({ ...e, name: x.target.value })} placeholder="Ej. Sentadilla búlgara" autoFocus={!ex.id} /></label>
          <div className="ca-grid2">
            <label className="ca-field"><span className="ca-label">Músculo</span>
              <select className="ca-select" value={e.muscle} onChange={x => setE({ ...e, muscle: x.target.value })}>{muscles.map(m => <option key={m}>{m}</option>)}</select></label>
            <label className="ca-field"><span className="ca-label">Material</span><input className="ca-input" value={e.equipment} onChange={x => setE({ ...e, equipment: x.target.value })} placeholder="Mancuernas, barra…" /></label>
          </div>
          <label className="ca-field"><span className="ca-label">Claves de técnica</span><textarea className="ca-textarea" value={e.cues} onChange={x => setE({ ...e, cues: x.target.value })} placeholder="Una por línea: pecho arriba, rodilla sigue la punta…" /></label>
          <label className="ca-field"><span className="ca-label">O pega un enlace (YouTube, Vimeo, mp4)</span><input className="ca-input" value={e.videoUrl?.startsWith('data:') ? '' : e.videoUrl ?? ''} onChange={x => setE({ ...e, videoUrl: x.target.value.trim() || undefined, thumbUrl: undefined })} placeholder="https://" /></label>
        </div>
        <div className="ca-stack">
          {e.videoUrl ? <VideoPlayer url={e.videoUrl} poster={e.thumbUrl} portrait={e.portrait} /> : (
            <button className="ca-card" style={{ border: '2px dashed var(--line)', minHeight: 220, display: 'grid', placeItems: 'center', cursor: 'pointer', background: 'var(--mist)', textAlign: 'center' }} onClick={() => file.current?.click()}>
              <div><UploadCloud size={32} color="var(--brand)" /><div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>Sube el vídeo</div><div className="ca-muted" style={{ fontSize: 13.5 }}>Grábalo con el móvil, vertical u horizontal.</div></div>
            </button>
          )}
          {e.videoUrl && <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => file.current?.click()}><UploadCloud size={15} /> Cambiar vídeo</button>}
          <input ref={file} type="file" accept="video/*" hidden onChange={x => { const f = x.target.files?.[0]; x.target.value = ''; if (f) upload(f) }} />
          {up && <div className="ca-stack" style={{ gap: 6 }}><div className="ca-progressbar"><i style={{ width: `${up.pct}%`, background: 'var(--brand)' }} /></div><span className="ca-muted" style={{ fontSize: 13 }}>{up.label}{up.pct < 100 ? ` ${up.pct}%` : ''}</span></div>}
        </div>
      </div>
      {err && <div className="ca-alert" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Sheet>
  )
}

function isPortrait(f: File): Promise<boolean | undefined> {
  return new Promise(res => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(f)
    v.preload = 'metadata'
    v.onloadedmetadata = () => { res(v.videoHeight > v.videoWidth); URL.revokeObjectURL(url) }
    v.onerror = () => { res(undefined); URL.revokeObjectURL(url) }
    v.src = url
  })
}

const KIND: Record<Resource['kind'], [string, typeof Video]> = { video: ['Vídeo', Video], link: ['Enlace', Link2], text: ['Texto', FileText] }

function Resources() {
  const { coach, store } = useCoach()
  const { toast } = useArea()
  const { data, reload } = useData(s => s.list('resources', { clientId: null }))
  const [edit, setEdit] = useState<Resource | null>(null)
  if (!data) return <Spinner />
  const blank = (): Resource => ({ id: '', coachId: coach.id, clientId: null, title: '', kind: 'text', createdAt: new Date().toISOString() })
  async function save() {
    if (!edit) return
    if (!edit.title.trim()) { toast('Ponle un título'); return }
    await store.put('resources', { ...edit, id: edit.id || uid('rs-'), title: edit.title.trim() })
    setEdit(null); reload(); toast('Recurso guardado')
  }
  return (
    <div className="ca-stack">
      <div className="ca-between"><p className="ca-muted" style={{ margin: 0 }}>Guías, recetas, vídeos de bienvenida. Todos tus clientes los ven en su perfil.</p><button className="ca-btn" onClick={() => setEdit(blank())}><Plus size={18} /> Recurso</button></div>
      {!data.length ? <Empty icon="📚" title="Sin recursos" text="Ej. 'Cómo pesar la comida', tu guía de suplementos o el vídeo de bienvenida." />
        : <div className="ca-list ca-card" style={{ padding: '4px 16px' }}>{data.map(r => { const [l, I] = KIND[r.kind]; return (
          <button key={r.id} className="ca-li" onClick={() => setEdit(r)}><I size={20} color="var(--brand)" /><div className="ca-li-main"><div className="ca-li-title">{r.title}</div><div className="ca-li-sub">{l}</div></div></button>
        ) })}</div>}
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar recurso' : 'Nuevo recurso'}
        footer={edit && <>{edit.id && <button className="ca-btn ca-btn-ghost" style={{ marginRight: 'auto' }} onClick={async () => { if (!window.confirm('¿Borrar este recurso?')) return; await store.remove('resources', edit.id); setEdit(null); reload() }}><Trash2 size={16} /></button>}<button className="ca-btn ca-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="ca-btn" onClick={save}>Guardar</button></>}>
        {edit && <div className="ca-stack">
          <label className="ca-field"><span className="ca-label">Título</span><input className="ca-input" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></label>
          <div className="ca-chips">{(Object.keys(KIND) as Resource['kind'][]).map(k => <button key={k} className={`ca-chip${edit.kind === k ? ' on' : ''}`} onClick={() => setEdit({ ...edit, kind: k })}>{KIND[k][0]}</button>)}</div>
          {edit.kind !== 'text' && <label className="ca-field"><span className="ca-label">Enlace</span><input className="ca-input" value={edit.url ?? ''} onChange={e => setEdit({ ...edit, url: e.target.value.trim() || undefined })} placeholder="https://" /></label>}
          <label className="ca-field"><span className="ca-label">{edit.kind === 'text' ? 'Texto' : 'Descripción (opcional)'}</span><textarea className="ca-textarea" style={{ minHeight: 160 }} value={edit.body ?? ''} onChange={e => setEdit({ ...edit, body: e.target.value })} /></label>
        </div>}
      </Sheet>
    </div>
  )
}
