'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { uid } from '@/lib/coach/util'
import type { Message } from '@/lib/coach/types'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { Empty, Spinner } from '@/components/coach/ui'
import VideoPlayer from '@/components/coach/VideoPlayer'
import ExerciseProgress from '@/components/coach/ExerciseProgress'

export default function ExercisePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { clientId, coach, store, viewingAs } = useCoach()
  const [note, setNote] = useState('')
  const [sent, setSent] = useState<'idle' | 'ok' | 'err'>('idle')
  const { data } = useData(async s => {
    const [e, logs] = await Promise.all([s.get('exercises', id), s.list('logs', { clientId })])
    return { e, logs }
  }, [id, clientId])
  if (!data) return <main className="ca-main"><Spinner /></main>
  const e = data.e
  return (
    <main className="ca-main ca-stack">
      <div className="ca-top"><button className="ca-icon-btn" onClick={() => router.back()} aria-label="Volver"><ArrowLeft /></button></div>
      {!e ? <div className="ca-card"><Empty title="Ejercicio no encontrado" /></div> : <>
        <div>
          <div className="ca-eyebrow">{e.muscle} · {e.equipment}</div>
          <h1 style={{ marginTop: 4 }}>{e.name}</h1>
        </div>
        {e.videoUrl
          ? <VideoPlayer url={e.videoUrl} poster={e.thumbUrl} portrait={e.portrait} />
          : <div className="ca-card ca-muted" style={{ textAlign: 'center', fontSize: 14 }}>El vídeo de este ejercicio llega pronto.</div>}
        {e.cues && (
          <div className="ca-card">
            <h3>Técnica</h3>
            <ol style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {e.cues.split('\n').filter(Boolean).map((c, i) => <li key={i}>{c}</li>)}
            </ol>
          </div>
        )}
        {!viewingAs && clientId && <form className="ca-card ca-stack" style={{ gap: 10 }} onSubmit={async ev => {
          ev.preventDefault()
          const t = note.trim()
          if (!t) return
          const m: Message = { id: uid('msg-'), coachId: coach.id, clientId, from: 'client', text: `${e.name}: ${t}`, exerciseId: e.id, read: false, createdAt: new Date().toISOString() }
          try { await store.put('messages', m); setNote(''); setSent('ok') } catch { setSent('err') }
        }}>
          <h3>Comentar a {coach.name.split(' ')[0]}</h3>
          <textarea className="ca-input" rows={2} maxLength={600} value={note} onChange={ev => { setNote(ev.target.value); setSent('idle') }} placeholder="Ej.: me molesta la rodilla en la bajada" aria-label="Comentario sobre este ejercicio" />
          <div className="ca-between">
            <span className="ca-muted" style={{ fontSize: 13 }}>{sent === 'ok' ? 'Enviado. Lo ves también en el chat.' : sent === 'err' ? 'No se pudo enviar. Prueba otra vez.' : 'Le llega con este ejercicio.'}</span>
            <button className="ca-btn" style={{ flex: 'none' }} disabled={!note.trim()}><Send size={17} /> Enviar</button>
          </div>
        </form>}
        <div className="ca-card"><h3 style={{ marginBottom: 12 }}>Tu progreso</h3><ExerciseProgress logs={data.logs} exerciseId={e.id} /></div>
      </>}
    </main>
  )
}
