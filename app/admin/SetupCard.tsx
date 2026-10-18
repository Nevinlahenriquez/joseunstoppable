'use client'

import { useEffect, useState } from 'react'

// Shows only while the database is not ready. One press creates every table.
export default function SetupCard() {
  const [s, setS] = useState<{ ready: boolean; reason?: string; missing?: string[]; canRun?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const check = () => fetch('/api/admin/setup').then(r => r.json()).then(setS).catch(() => {})
  useEffect(() => { void check() }, [])

  if (!s || s.ready) return null
  async function run() {
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/setup', { method: 'POST' }).then(x => x.json()).catch(() => null)
    setBusy(false)
    if (r?.ok) { setMsg('Base de datos lista.'); void check() } else setMsg(r?.error || 'No se pudo preparar.')
  }
  return (
    <div className="os-card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid var(--os-warn)' }}>
      <div className="os-card-title">Prepara la base de datos</div>
      <p className="os-page-sub" style={{ margin: '6px 0 12px' }}>
        {s.reason ?? `Faltan ${s.missing?.length ?? 0} tablas. Un clic las crea; es seguro pulsarlo otra vez.`}
      </p>
      {s.canRun
        ? <button className="os-btn os-btn-primary" disabled={busy} onClick={() => void run()}>{busy ? 'Preparando…' : 'Preparar base de datos'}</button>
        : <p className="os-page-sub">Añade DATABASE_URL en Vercel (Supabase, Project Settings, Database, connection string) y vuelve aquí.</p>}
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  )
}
