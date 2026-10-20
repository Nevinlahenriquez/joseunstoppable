'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

// The sign-in screen: the client types their email and gets a one-time link.
export default function PortalLogin({ name, email: preset }: { name?: string | null; email?: string }) {
  const [email, setEmail] = useState(preset ?? '')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'notClient'>('idle')
  // Bot guard: a hidden field people never fill, and the time on the page.
  const [hp, setHp] = useState('')
  const startedAt = useRef(Date.now())
  const [error, setError] = useState('')
  const first = (name ?? '').trim().split(/\s+/)[0]

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!email || state === 'sending') return
    setState('sending'); setError('')
    const r = await fetch('/api/portal/link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, hp, elapsedMs: Date.now() - startedAt.current }) })
      .then(r => r.json()).catch(() => null)
    if (r?.ok) { setState('sent'); return }
    if (r?.notClient) { setState('notClient'); return }
    setError(r?.error || 'No hay conexión. Inténtalo otra vez.')
    setState('error')
  }

  return (
    <div className="pt pt-auth">
      <div className="pt-blob a" /><div className="pt-blob b" /><div className="pt-blob c" />
      <div className="pt-grid" />
      <div className="pt-card">
        <div className="pt-logo"><img src="/icon.png" alt="" width={34} height={34} />JOSÉ UNSTOPPABLE · PORTAL</div>
        {state === 'notClient' ? (
          <div className="pt-sent">
            <div className="ring">🔒</div>
            <h1>El portal es para <span>clientes</span></h1>
            <p className="sub" style={{ marginTop: 8 }}><b>{email}</b> todavía no tiene una cuenta. El portal se abre cuando te unes al programa de José.</p>
            <div className="pt-choices">
              <Link className="pt-go" href="/reserva">Reservar una llamada con José →</Link>
              <Link className="pt-alt" href="/#offer">Ver cómo unirme</Link>
              <button className="pt-link" type="button" onClick={() => setState('idle')}>Ya soy cliente, probar otro email</button>
            </div>
          </div>
        ) : state === 'sent' ? (
          <div className="pt-sent">
            <div className="ring">✉️</div>
            <h1>Revisa tu <span>email</span></h1>
            <p className="sub" style={{ marginTop: 8 }}>Te acabamos de mandar un enlace a <b>{email}</b> para entrar. Caduca en 2 horas.</p>
            <button className="pt-go" type="button" onClick={() => setState('idle')}>Usar otro email</button>
          </div>
        ) : (
          <>
            <h1>{first ? <>Hola {first},<br /></> : null}tu <span>portal de cliente</span></h1>
            <p className="sub">Tu plan, tu contrato y línea directa con José. Escribe tu email y te mandamos un enlace para entrar, sin contraseñas.</p>
            <form onSubmit={send}>
              <input name="hp_vfy_2k" tabIndex={-1} aria-hidden="true" autoComplete="off" value={hp} onChange={e => setHp(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
              <label className="pt-field">Email
                <input type="email" required autoComplete="email" inputMode="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              <button className="pt-go" type="submit" disabled={!email || state === 'sending'}>
                {state === 'sending' ? 'Enviando…' : 'Enviarme el enlace →'}
              </button>
            </form>
            {state === 'error' && <div className="pt-msg err">{error}</div>}
          </>
        )}
        <div className="pt-fine">
          <span>Seguirás dentro 60 días en este dispositivo.</span>
          <Link href="/">joseunstoppable.com</Link>
        </div>
      </div>
    </div>
  )
}
