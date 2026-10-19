'use client'

import { useCallback, useEffect, useState } from 'react'
import { confirmAction } from '@/app/admin/ConfirmHost'

type AdminRow = { email: string; name: string | null; hasPassword: boolean; lastLoginAt: string | null }

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : 'Nunca'

// /admin/access: who can sign in to this panel, with an email and password
// or an emailed link. Owner only.
export default function AccessPage() {
  const [users, setUsers] = useState<AdminRow[]>([])
  const [envEmails, setEnvEmails] = useState<string[]>([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ email: '', name: '', password: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => fetch('/api/admin/access').then(r => r.json()).catch(() => null).then(d => {
    if (!d) { setError('No hay conexión con el servidor.'); return }
    if (d.ok === false && !d.error) { setError('Solo el dueño de la cuenta puede gestionar los accesos.'); return }
    setUsers(d.users ?? []); setEnvEmails(d.envEmails ?? []); setError(d.error || '')
  }), [])
  useEffect(() => { void load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const r = await fetch('/api/admin/access', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).catch(() => null)
    setBusy(false)
    if (!r?.ok) { setMsg(r?.error || 'No se pudo guardar.'); return }
    setMsg(form.password ? `Listo. ${form.email} ya puede entrar con su email y contraseña.` : `Listo. ${form.email} puede entrar con un enlace por email.`)
    setForm({ email: '', name: '', password: '' })
    void load()
  }

  async function remove(u: AdminRow) {
    const ok = await confirmAction({ message: `¿Quitar el acceso de ${u.email}?`, detail: 'No podrá volver a entrar con su email y contraseña.', confirmLabel: 'Quitar', destructive: true })
    if (!ok) return
    await fetch(`/api/admin/access?email=${encodeURIComponent(u.email)}`, { method: 'DELETE' })
    void load()
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Accesos al panel</h1>
          <p className="os-page-sub">Quién puede entrar en /admin. Con email y contraseña, o pidiendo un enlace a su email desde la pantalla de entrada. Tu código de dueño de Vercel (OS_ADMIN_PASSWORD) sigue funcionando.</p>
        </div>
      </div>

      {error && <div className="os-card" style={{ padding: '14px 20px', marginBottom: 16, color: 'var(--os-bad)', fontSize: 13.5 }}>{error}</div>}

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Añadir o cambiar contraseña</div>
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Email
            <input className="os-crm-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Nombre
            <input className="os-crm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="José" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Contraseña (8+)
            <input className="os-crm-input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Opcional" style={{ marginTop: 4 }} />
          </label>
          <button className="os-btn os-btn-primary" disabled={busy || !form.email}><i className="ti ti-shield-check" /> {busy ? 'Guardando…' : 'Guardar'}</button>
        </form>
        {msg && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--os-text-muted)' }}>{msg}</div>}
      </div>

      <div className="os-card" style={{ padding: '20px 24px' }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Con acceso</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {envEmails.map(e => (
            <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderBottom: '1px solid var(--os-line)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--os-text)' }}>{e}</span>
                <span style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>Dueño · código de Vercel o enlace por email</span>
              </span>
            </div>
          ))}
          {users.filter(u => !envEmails.includes(u.email) || u.hasPassword).map(u => (
            <div key={u.email} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderBottom: '1px solid var(--os-line)' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--os-text)' }}>{u.name ? `${u.name} · ` : ''}{u.email}</span>
                <span style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>{u.hasPassword ? 'Email y contraseña' : 'Solo enlace por email'} · Último acceso: {fmt(u.lastLoginAt)}</span>
              </span>
              <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void remove(u)} style={{ color: 'var(--os-bad)' }}><i className="ti ti-trash" /> Quitar</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
