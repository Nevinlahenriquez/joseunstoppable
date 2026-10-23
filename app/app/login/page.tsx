'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'

const ERR: Record<string, string> = {
  link: 'Ese enlace ya no funciona. Pide uno nuevo aquí abajo.',
  unknown: 'No encontramos una cuenta con ese email. Pregunta a tu entrenador por tu invitación.',
}

export default function Login() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(ERR[params.get('e') ?? ''] ?? null)
  const [demo, setDemo] = useState(false)
  useEffect(() => { fetch('/api/coach/me', { cache: 'no-store' }).then(r => r.json()).then(m => setDemo(!m.live)).catch(() => setDemo(true)) }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setState('sending'); setMsg(null)
    try {
      const r = await fetch('/api/coach/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setState('error'); setMsg(j.error ?? 'No se pudo enviar. Inténtalo otra vez.'); return }
      setState('sent')
    } catch { setState('error'); setMsg('Sin conexión. Inténtalo otra vez.') }
  }

  return (
    <main className="ca-main" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', paddingBottom: 24 }}>
      <div className="ca-stack" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="ca-brand-big">José Unstoppable</div>
          <p className="ca-muted" style={{ marginTop: 6 }}>Tu entreno, tu nutrición y tu progreso en un sitio.</p>
        </div>
        <div className="ca-card ca-stack">
          {state === 'sent' ? (
            <div style={{ textAlign: 'center' }} className="ca-stack">
              <Mail size={36} style={{ color: 'var(--brand)', margin: '0 auto' }} />
              <h2 style={{ fontSize: 20 }}>Revisa tu email</h2>
              <p className="ca-muted">Si {email} tiene una cuenta, te llega un enlace para entrar. Mira también en spam.</p>
              <button className="ca-btn ca-btn-ghost" onClick={() => setState('idle')}>Usar otro email</button>
            </div>
          ) : (
            <form className="ca-stack" onSubmit={send}>
              <h2 style={{ fontSize: 20 }}>Entrar</h2>
              <label className="ca-field"><span className="ca-label">Tu email</span>
                <input className="ca-input" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
              </label>
              {msg && <div role="alert" style={{ color: '#B42318', fontSize: 14 }}>{msg}</div>}
              <button className="ca-btn ca-btn-block" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviarme el enlace'}</button>
              <p className="ca-muted" style={{ fontSize: 13, textAlign: 'center' }}>Sin contraseñas. Te mandamos un enlace seguro.</p>
            </form>
          )}
        </div>
        {demo && <Link href="/app" className="ca-btn ca-btn-ghost ca-btn-block">Ver la demo</Link>}
      </div>
    </main>
  )
}
