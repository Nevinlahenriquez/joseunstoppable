'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import '../../portal/portal.css'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
        }
      }
    }
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

type Status = 'idle' | 'signing' | 'denied' | 'error' | 'throttled' | 'sent' | 'link-bad'

// Admin sign-in: email + password (or the owner passcode), or a one-time
// link emailed to an admin address. Shares the portal's sign-in look.
export default function OsLoginPage() {
  const btnRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const ran = useRef(false)

  const fail = (res: Response, data: { error?: string }) => {
    if (res.status === 429) { setStatus('throttled'); setMessage(data.error || ''); return }
    setStatus(res.status === 401 ? 'denied' : 'error')
  }

  // Arriving from an emailed admin link (?t=…): sign in with it.
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const t = new URLSearchParams(window.location.search).get('t')
    if (!t) return
    void Promise.resolve().then(() => setStatus('signing'))
    fetch('/api/auth/admin-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t }) })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) { window.location.replace(data.redirect || '/admin'); return }
        window.history.replaceState(null, '', '/admin/login')
        setStatus('link-bad'); setMessage(data.error || '')
      })
      .catch(() => setStatus('error'))
  }, [])

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password || status === 'signing') return
    setStatus('signing')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { window.location.href = data.redirect || '/admin'; return }
      fail(res, data)
    } catch { setStatus('error') }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'signing') return
    setStatus('signing')
    try {
      const res = await fetch('/api/auth/admin-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setStatus('sent'); return }
      if (res.status === 400) { setStatus('error'); setMessage(data.error || ''); return }
      fail(res, data)
    } catch { setStatus('error') }
  }

  useEffect(() => {
    if (!CLIENT_ID) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      if (!window.google || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          setStatus('signing')
          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            })
            if (res.ok) {
              const data = await res.json().catch(() => ({}))
              window.location.href = data.redirect || '/admin'
              return
            }
            setStatus(res.status === 401 ? 'denied' : 'error')
          } catch { setStatus('error') }
        },
      })
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 280 })
    }
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  const switchTo = (m: 'password' | 'link') => { setMode(m); setStatus('idle'); setMessage('') }

  return (
    <div className="pt pt-auth">
      <div className="pt-blob a" /><div className="pt-blob b" /><div className="pt-blob c" />
      <div className="pt-grid" />
      <div className="pt-card">
        <div className="pt-logo"><img src="/icon.png" alt="" width={34} height={34} />JOSÉ UNSTOPPABLE · OS</div>

        {status === 'sent' ? (
          <div className="pt-sent">
            <div className="ring">✉️</div>
            <h1>Revisa tu <span>email</span></h1>
            <p className="sub" style={{ marginTop: 8 }}>Si <b>{email}</b> tiene acceso al panel, te acaba de llegar un enlace. Caduca en 30 minutos.</p>
            <button className="pt-go" type="button" onClick={() => switchTo('password')}>Volver</button>
          </div>
        ) : (
          <>
            <h1>Tu <span>centro de control</span></h1>
            <p className="sub">Leads, clientes, pagos y portal. Acceso privado.</p>

            <div role="tablist" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 14, background: 'rgba(7,23,38,.45)', border: '1px solid rgba(255,255,255,.1)', marginBottom: 18 }}>
              {(['password', 'link'] as const).map(m => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchTo(m)}
                  style={{ font: 'inherit', fontSize: 13.5, fontWeight: 800, padding: '9px 10px', borderRadius: 10, border: 0, cursor: 'pointer', color: mode === m ? '#071726' : 'rgba(255,255,255,.7)', background: mode === m ? 'linear-gradient(90deg,#8FD3F5,#5BBCEE)' : 'transparent', transition: 'background .2s,color .2s' }}>
                  {m === 'password' ? 'Contraseña' : 'Enlace por email'}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <form onSubmit={loginWithPassword}>
                <label className="pt-field">Email
                  <input type="email" autoComplete="username" inputMode="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
                <label className="pt-field">Contraseña
                  <span style={{ position: 'relative', display: 'block' }}>
                    <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña o código de dueño" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 64 }} />
                    <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 8, bottom: 8, font: 'inherit', fontSize: 12, fontWeight: 800, letterSpacing: '.04em', color: '#8FD3F5', background: 'rgba(91,188,238,.12)', border: 0, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', textTransform: 'none' }}>
                      {show ? 'Ocultar' : 'Ver'}
                    </button>
                  </span>
                </label>
                <button className="pt-go" type="submit" disabled={!password || status === 'signing'}>
                  {status === 'signing' ? 'Entrando…' : 'Entrar →'}
                </button>
              </form>
            ) : (
              <form onSubmit={sendLink}>
                <label className="pt-field">Email de administrador
                  <input type="email" required autoComplete="username" inputMode="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
                <button className="pt-go" type="submit" disabled={!email || status === 'signing'}>
                  {status === 'signing' ? 'Enviando…' : 'Enviarme el enlace →'}
                </button>
              </form>
            )}

            {CLIENT_ID && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>o</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.12)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}><div ref={btnRef} /></div>
              </>
            )}

            {status === 'signing' && mode === 'password' && <div className="pt-msg">Comprobando…</div>}
            {status === 'denied' && <div className="pt-msg err">Email o contraseña incorrectos. Si no la recuerdas, usa &quot;Enlace por email&quot;.</div>}
            {status === 'throttled' && <div className="pt-msg err">{message || 'Demasiados intentos. Espera unos minutos.'}</div>}
            {status === 'link-bad' && <div className="pt-msg err">{message || 'Este enlace ya se usó o ha caducado.'} Pide uno nuevo.</div>}
            {status === 'error' && <div className="pt-msg err">{message || 'Algo ha fallado. Inténtalo otra vez.'}</div>}
          </>
        )}

        <div className="pt-fine">
          <span>¿Eres cliente?</span>
          <Link href="/portal">Ir a mi portal →</Link>
        </div>
      </div>
    </div>
  )
}
