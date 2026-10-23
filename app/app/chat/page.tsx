'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp } from '../AppShell'
import { Avatar, Spinner } from '@/components/coach/ui'
import type { Message } from '@/lib/coach/types'
import { uid } from '@/lib/coach/util'

export default function Chat() {
  const { store, clientId, coach, viewingAs } = useCoach()
  const { client, toast, refreshUnread } = useApp()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const { data, reload, setData } = useData(async s => (await s.list('messages', { clientId })).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [clientId])

  // Mark the coach's messages read once the client has seen them.
  useEffect(() => {
    if (!data || viewingAs) return
    const unread = data.filter(m => m.from === 'coach' && !m.read)
    if (!unread.length) return
    Promise.all(unread.map(m => store.put('messages', { ...m, read: true }))).then(refreshUnread).catch(() => {})
  }, [data, store, viewingAs, refreshUnread])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [data?.length])
  useEffect(() => { const t = window.setInterval(() => { if (document.visibilityState === 'visible') reload() }, 15000); return () => window.clearInterval(t) }, [reload])

  async function send() {
    const t = text.trim()
    if (!t || !client || viewingAs) return
    const m: Message = { id: uid('msg-'), coachId: client.coachId, clientId: client.id, from: 'client', text: t, read: false, createdAt: new Date().toISOString() }
    setSending(true)
    setData(d => [...(d ?? []), m])
    setText('')
    try { await store.put('messages', m) }
    catch { setData(d => (d ?? []).filter(x => x.id !== m.id)); setText(t); toast('No se pudo enviar. Inténtalo otra vez.') }
    finally { setSending(false) }
  }

  return (
    <main className="ca-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', paddingBottom: 'calc(150px + env(safe-area-inset-bottom))' }}>
      <div className="ca-row" style={{ marginBottom: 14 }}>
        <Avatar name={coach.name} url={coach.photoUrl} size={44} />
        <div><b style={{ color: 'var(--ink)', fontSize: 17 }}>{coach.name}</b><div className="ca-muted" style={{ fontSize: 13 }}>Tu entrenador</div></div>
      </div>
      {!data ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!data.length && <div className="ca-card ca-muted" style={{ textAlign: 'center', fontSize: 14 }}>Escríbele lo que necesites: dudas de técnica, cambios en el plan, cómo te sientes.</div>}
          {data.map(m => (
            <div key={m.id} className={`ca-bubble ${m.from === 'client' ? 'me' : 'them'}`}>
              {m.text}
              <small>{new Date(m.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
      {!viewingAs && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(62px + env(safe-area-inset-bottom))', background: 'var(--mist)', padding: '10px 16px', borderTop: '1px solid var(--line)', zIndex: 40 }}>
          <form style={{ maxWidth: 608, margin: '0 auto', display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); send() }}>
            <input className="ca-input" placeholder="Escribe un mensaje" value={text} onChange={e => setText(e.target.value)} aria-label="Mensaje" />
            <button className="ca-btn" style={{ width: 52, padding: 0, flex: 'none' }} disabled={!text.trim() || sending} aria-label="Enviar"><Send size={20} /></button>
          </form>
        </div>
      )}
    </main>
  )
}
