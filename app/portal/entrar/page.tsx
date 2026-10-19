'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import '../portal.css'

// Where the emailed link lands. It signs in with a POST from the page, so
// email scanners that only open the link can't use it up.
export default function PortalEnter() {
  const [state, setState] = useState<'working' | 'error'>('working')
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const t = new URLSearchParams(window.location.search).get('t') ?? ''
    fetch('/api/portal/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t }) })
      .then(r => r.json()).catch(() => null)
      .then(r => {
        if (r?.ok) { window.location.replace('/portal'); return }
        setError(r?.error || 'No hay conexión. Inténtalo otra vez.')
        setState('error')
      })
  }, [])

  return (
    <div className="pt pt-auth">
      <div className="pt-blob a" /><div className="pt-blob b" /><div className="pt-blob c" />
      <div className="pt-grid" />
      <div className="pt-card" style={{ textAlign: 'center' }}>
        <div className="pt-logo" style={{ justifyContent: 'center' }}><img src="/icon.png" alt="" width={34} height={34} />JOSÉ UNSTOPPABLE · PORTAL</div>
        {state === 'working' ? (
          <>
            <h1>Entrando en tu <span>portal</span>…</h1>
            <p className="sub" style={{ marginTop: 8 }}>Un segundo.</p>
          </>
        ) : (
          <>
            <h1>Enlace <span>caducado</span></h1>
            <p className="sub" style={{ marginTop: 8 }}>{error}</p>
            <Link className="pt-go" href="/portal" style={{ textDecoration: 'none' }}>Pedir un enlace nuevo</Link>
          </>
        )}
      </div>
    </div>
  )
}
