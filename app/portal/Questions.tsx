'use client'

import { useEffect, useRef, useState } from 'react'
import type { PortalMessage } from '@/lib/portal'

const when = (iso: string) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })

// The client's questions to José and his answers, newest at the bottom.
export default function Questions({ initial }: { initial: PortalMessage[] }) {
  const [messages, setMessages] = useState(initial)
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || state === 'sending') return
    setState('sending'); setError('')
    const r = await fetch('/api/portal/messages', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) })
      .then(r => r.json()).catch(() => null)
    if (r?.ok) {
      setMessages(m => [...m, r.message])
      setBody('')
      setState('sent')
      return
    }
    setError(r?.error || 'No se pudo enviar. Inténtalo otra vez.')
    setState('error')
  }

  return (
    <>
      {messages.length > 0 && (
        <div className="pt-thread">
          {messages.map(m => (
            <div key={m.id} className={`pt-bubble ${m.sender === 'client' ? 'me' : 'them'}`}>
              {m.body}
              <small>{m.sender === 'client' ? 'Tú' : 'José'} · {when(m.created_at)}</small>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
      <form className="pt-ask" onSubmit={send}>
        <textarea value={body} onChange={e => { setBody(e.target.value); if (state !== 'sending') setState('idle') }} placeholder="Escribe tu pregunta para José: entrenamiento, comidas, horarios…" maxLength={4000} />
        <div className="row">
          <span className="note">{state === 'sent' ? 'Enviado. José te responde aquí y por email.' : state === 'error' ? error : 'José recibe tu pregunta por email.'}</span>
          <button className="pt-btn sky" type="submit" disabled={!body.trim() || state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar pregunta'}</button>
        </div>
      </form>
    </>
  )
}
