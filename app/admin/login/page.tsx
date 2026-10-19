'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

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

type Mode = 'link' | 'passcode'
type Status = 'idle' | 'busy' | 'sent' | 'denied' | 'throttled' | 'expired' | 'error'

export default function OsLoginPage() {
  return <Suspense><LoginGate /></Suspense>
}

function LoginGate() {
  const btnRef = useRef<HTMLDivElement>(null)
  const linkExpired = useSearchParams().get('link') === 'expired'
  const [mode, setMode] = useState<Mode>('link')
  const [status, setStatus] = useState<Status>(linkExpired ? 'expired' : 'idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function switchMode(m: Mode) {
    setMode(m)
    setStatus('idle')
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'busy') return
    setStatus('busy')
    try {
      const res = await fetch('/api/auth/login-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setStatus(res.ok ? 'sent' : res.status === 429 ? 'throttled' : 'error')
    } catch { setStatus('error') }
  }

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password || status === 'busy') return
    setStatus('busy')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        window.location.href = data.redirect || '/admin'
        return
      }
      setStatus(res.status === 401 ? 'denied' : res.status === 429 ? 'throttled' : 'error')
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
          setStatus('busy')
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
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 300 })
    }
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [])

  const busy = status === 'busy'

  return (
    <main className="jl-root">
      <style>{CSS}</style>
      <div className="jl-orb jl-orb-a" />
      <div className="jl-orb jl-orb-b" />
      <div className="jl-orb jl-orb-c" />
      <div className="jl-grid" />

      <section className="jl-card">
        <div className="jl-brand">
          <img src="/icon.png" alt="José Unstoppable" width={44} height={44} />
          <div>
            <div className="jl-brand-name">José Unstoppable</div>
            <div className="jl-brand-sub">Command center</div>
          </div>
        </div>

        <h1 className="jl-title">Welcome back.</h1>
        <p className="jl-lead">Sign in to run your clients, bookings and payments.</p>

        <div className="jl-tabs" role="tablist">
          <span className="jl-tab-glow" style={{ transform: mode === 'link' ? 'translateX(0)' : 'translateX(100%)' }} />
          <button type="button" role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'on' : ''} onClick={() => switchMode('link')}>Email link</button>
          <button type="button" role="tab" aria-selected={mode === 'passcode'} className={mode === 'passcode' ? 'on' : ''} onClick={() => switchMode('passcode')}>Password</button>
        </div>

        {mode === 'link' ? (
          status === 'sent' ? (
            <div className="jl-sent">
              <div className="jl-sent-icon">✓</div>
              <p className="jl-sent-title">Check your inbox</p>
              <p className="jl-sent-text">If {email.trim()} is an admin account, a sign-in link is on its way. It works for 15 minutes.</p>
              <button type="button" className="jl-ghost" onClick={() => setStatus('idle')}>Use another email</button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="jl-form">
              <label className="jl-label" htmlFor="jl-email">Email</label>
              <input
                id="jl-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="info@joseunstoppable.com" autoComplete="email" inputMode="email" className="jl-input" autoFocus
              />
              <button type="submit" disabled={!email.trim() || busy} className="jl-cta">
                {busy ? 'Sending…' : 'Send me a sign-in link'}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={loginWithPassword} className="jl-form">
            <label className="jl-label" htmlFor="jl-user">Email</label>
            <input
              id="jl-user" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" autoComplete="username" inputMode="email" className="jl-input"
            />
            <label className="jl-label" htmlFor="jl-pass">Password</label>
            <input
              id="jl-pass" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Your password or owner passcode" autoComplete="current-password" className="jl-input" autoFocus
            />
            <button type="submit" disabled={!password || busy} className="jl-cta">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {CLIENT_ID && (
          <>
            <div className="jl-or"><span />or<span /></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}><div ref={btnRef} /></div>
          </>
        )}

        {status === 'denied' && <p className="jl-msg bad">That email and password don&apos;t match. Try the email link instead.</p>}
        {status === 'throttled' && <p className="jl-msg bad">Too many tries. Wait 15 minutes and try again.</p>}
        {status === 'expired' && <p className="jl-msg bad">That sign-in link has expired. Send yourself a new one.</p>}
        {status === 'error' && <p className="jl-msg bad">Something went wrong. Please try again.</p>}

        <div className="jl-foot">
          <span>Are you a client?</span>
          <Link href="/portal">Go to my portal →</Link>
        </div>
      </section>
    </main>
  )
}

const CSS = `
.jl-root{position:relative;min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow:hidden;
  background:radial-gradient(120% 90% at 10% 0%,#2a0f5c 0%,transparent 55%),radial-gradient(100% 80% at 100% 100%,#0b3f6b 0%,transparent 60%),#07040f;
  color:#fff;font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif}
.jl-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:.75;pointer-events:none;will-change:transform}
.jl-orb-a{width:520px;height:520px;left:-140px;top:-160px;background:conic-gradient(from 90deg,#7b2ff7,#f107a3,#7b2ff7);animation:jl-float 16s ease-in-out infinite}
.jl-orb-b{width:460px;height:460px;right:-120px;bottom:-140px;background:conic-gradient(from 200deg,#0E71AC,#5BBCEE,#00e0c6,#0E71AC);animation:jl-float 19s ease-in-out infinite reverse}
.jl-orb-c{width:300px;height:300px;right:18%;top:8%;background:radial-gradient(circle,#ff8a3d,#f107a3 70%);opacity:.35;animation:jl-float 23s ease-in-out infinite}
@keyframes jl-float{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,30px) scale(1.08)}66%{transform:translate(-30px,20px) scale(.95)}}
.jl-grid{position:absolute;inset:0;pointer-events:none;opacity:.18;
  background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);
  background-size:48px 48px;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%)}
.jl-card{position:relative;width:420px;max-width:100%;padding:36px 32px 28px;border-radius:26px;
  background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.04));backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);
  box-shadow:0 30px 90px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.18);animation:jl-in .6s cubic-bezier(.2,.8,.2,1) both}
.jl-card::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
  background:linear-gradient(135deg,rgba(241,7,163,.7),rgba(123,47,247,.4),rgba(91,188,238,.7));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
@keyframes jl-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.jl-brand{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.jl-brand img{border-radius:12px;display:block;box-shadow:0 6px 24px rgba(123,47,247,.45)}
.jl-brand-name{font-weight:800;font-size:15px;letter-spacing:.01em}
.jl-brand-sub{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.jl-title{font-size:34px;line-height:1.05;font-weight:800;margin:0 0 8px;letter-spacing:-.02em;
  background:linear-gradient(90deg,#fff 0%,#f6c6ff 45%,#9fe3ff 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.jl-lead{margin:0 0 24px;font-size:14.5px;line-height:1.5;color:rgba(255,255,255,.68)}
.jl-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:14px;background:rgba(0,0,0,.3);margin-bottom:20px}
.jl-tab-glow{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:10px;transition:transform .35s cubic-bezier(.2,.8,.2,1);
  background:linear-gradient(135deg,#7b2ff7,#f107a3);box-shadow:0 6px 20px rgba(241,7,163,.4)}
.jl-tabs button{position:relative;z-index:1;border:0;background:none;color:rgba(255,255,255,.6);font:inherit;font-weight:700;font-size:14px;padding:10px 0;cursor:pointer;transition:color .2s}
.jl-tabs button.on{color:#fff}
.jl-form{display:flex;flex-direction:column;gap:10px}
.jl-label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.jl-input{width:100%;box-sizing:border-box;padding:15px 16px;border-radius:13px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.32);
  color:#fff;font:inherit;font-size:16px;outline:none;transition:border-color .2s,box-shadow .2s}
.jl-input::placeholder{color:rgba(255,255,255,.35)}
.jl-input:focus{border-color:rgba(241,7,163,.75);box-shadow:0 0 0 4px rgba(241,7,163,.18)}
.jl-cta{margin-top:6px;width:100%;padding:15px 16px;border:0;border-radius:13px;color:#fff;font:inherit;font-weight:800;font-size:15.5px;cursor:pointer;
  background:linear-gradient(110deg,#7b2ff7 0%,#f107a3 50%,#ff8a3d 100%);background-size:200% 100%;animation:jl-sheen 6s linear infinite;
  box-shadow:0 12px 32px rgba(241,7,163,.35);transition:transform .15s,opacity .2s}
.jl-cta:hover:not(:disabled){transform:translateY(-1px)}
.jl-cta:disabled{opacity:.5;cursor:default}
@keyframes jl-sheen{0%{background-position:0% 0}50%{background-position:100% 0}100%{background-position:0% 0}}
.jl-sent{text-align:center;padding:8px 0 4px}
.jl-sent-icon{width:52px;height:52px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:800;
  background:linear-gradient(135deg,#00e0c6,#0E71AC);box-shadow:0 10px 30px rgba(0,224,198,.35)}
.jl-sent-title{font-weight:800;font-size:18px;margin:0 0 6px}
.jl-sent-text{font-size:14px;line-height:1.5;color:rgba(255,255,255,.7);margin:0 0 16px;word-break:break-word}
.jl-ghost{border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:inherit;font-weight:700;font-size:13.5px;padding:10px 16px;border-radius:11px;cursor:pointer}
.jl-or{display:flex;align-items:center;gap:12px;margin:20px 0;font-size:12px;color:rgba(255,255,255,.45)}
.jl-or span{flex:1;height:1px;background:rgba(255,255,255,.14)}
.jl-msg{font-size:13.5px;margin:16px 0 0;text-align:center}
.jl-msg.bad{color:#ff9db8}
.jl-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:13px;color:rgba(255,255,255,.5)}
.jl-foot a{color:#9fe3ff;font-weight:700;text-decoration:none}
@media (max-width:480px){.jl-card{padding:28px 20px 22px;border-radius:22px}.jl-title{font-size:29px}}
@media (prefers-reduced-motion:reduce){.jl-orb,.jl-cta,.jl-card{animation:none}}
`
