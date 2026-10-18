'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function OsLoginPage() {
  const btnRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'idle' | 'signing' | 'denied' | 'error'>('idle')
  const [password, setPassword] = useState('')

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password || status === 'signing') return
    setStatus('signing')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        window.location.href = data.redirect || '/admin'
        return
      }
      setStatus(res.status === 401 ? 'denied' : 'error')
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--os-panel-deep)', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ background: 'var(--os-card)', borderRadius: 20, padding: '40px 36px', width: 380, maxWidth: '100%', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.4)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, overflow: 'hidden', margin: '0 auto 18px' }}>

          <img src="/icon.png" alt="José Unstoppable" width={52} height={52} style={{ display: 'block' }} />
        </div>
        {}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--os-text)', margin: '0 0 6px' }}>Admin sign in</h1>
        <p style={{ fontSize: 14, color: 'var(--os-text-faint)', margin: '0 0 26px' }}>Private. Staff only.</p>

        {CLIENT_ID && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center' }}><div ref={btnRef} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--os-line)' }} />
              <span style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--os-line)' }} />
            </div>
          </>
        )}

        <form onSubmit={loginWithPassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Owner passphrase"
            autoComplete="current-password"
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 11, border: '1px solid #e3dcf5', fontSize: 15, outline: 'none', color: 'var(--os-text)' }}
          />
          <button
            type="submit"
            disabled={!password || status === 'signing'}
            style={{ width: '100%', padding: '13px 15px', borderRadius: 11, border: 'none', background: 'linear-gradient(180deg,var(--os-accent),var(--os-accent))', color: '#fff', fontWeight: 700, fontSize: 15, cursor: !password || status === 'signing' ? 'default' : 'pointer', opacity: !password || status === 'signing' ? 0.6 : 1 }}
          >
            {status === 'signing' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {status === 'signing' && <p style={{ fontSize: 13, color: '#0E71AC', marginTop: 18 }}>Signing you in…</p>}
        {status === 'denied' && <p style={{ fontSize: 13, color: 'var(--os-bad)', marginTop: 18 }}>That account is not authorized for this OS.</p>}
        {status === 'error' && <p style={{ fontSize: 13, color: 'var(--os-bad)', marginTop: 18 }}>Something went wrong. Please try again.</p>}

        {}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--os-line)' }}>
          <p style={{ fontSize: 13, color: 'var(--os-text-faint)', margin: '0 0 10px' }}>Looking for the member portal?</p>
          <a
            href="/login"
            style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, border: '1px solid var(--os-line)', color: 'var(--os-accent)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            Ir al panel →
          </a>
        </div>
      </div>
    </div>
  )
}
