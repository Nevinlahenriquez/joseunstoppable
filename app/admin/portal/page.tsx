'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { copyText } from '@/lib/clipboard'
import { DEFAULT_PORTAL, portalPath, type PortalAccess, type PortalMessage, type PortalSettings } from '@/lib/portal'

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }) : ''

async function call(method: string, body: unknown) {
  return fetch('/api/admin/portal', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'No hay conexión con el servidor.' }))
}

// /admin/portal: every client's personal portal link, their questions and the
// app link the portal shows.
export default function PortalAdminPage() {
  const [clients, setClients] = useState<PortalAccess[]>([])
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_PORTAL)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '' })
  const [note, setNote] = useState<Record<string, string>>({})
  const [reply, setReply] = useState('')
  const [settingsMsg, setSettingsMsg] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(() => fetch('/api/admin/portal').then(r => r.json()).catch(() => null).then(d => {
    setClients(d?.clients ?? [])
    setMessages(d?.messages ?? [])
    if (d?.settings) setSettings(d.settings)
    setError(d && !d.ok ? d.error || '' : d ? '' : 'No hay conexión con el servidor.')
    setLoaded(true)
  }), [])
  useEffect(() => {
    // ?c=email (from the question email) opens that client once loaded.
    const c = new URLSearchParams(window.location.search).get('c')
    void load().then(() => { if (c) setOpenId(c.toLowerCase()) })
  }, [load])


  const byClient = useMemo(() => {
    const m = new Map<string, PortalMessage[]>()
    for (const x of messages) m.set(x.email, [...(m.get(x.email) ?? []), x])
    return m
  }, [messages])
  const unread = (email: string) => (byClient.get(email) ?? []).filter(m => m.sender === 'client' && !m.read_at).length
  const totalUnread = clients.reduce((s, c) => s + unread(c.email), 0)

  const shown = clients
    .filter(c => !q || `${c.name ?? ''} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => unread(b.email) - unread(a.email))

  const flash = (email: string, text: string) => {
    setNote(n => ({ ...n, [email]: text }))
    setTimeout(() => setNote(n => ({ ...n, [email]: '' })), 4000)
  }

  async function open(c: PortalAccess) {
    const next = openId === c.email ? null : c.email
    setOpenId(next); setReply('')
    if (next && unread(c.email)) {
      await call('POST', { action: 'read', email: c.email })
      setMessages(ms => ms.map(m => m.email === c.email && m.sender === 'client' && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m))
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const r = await call('POST', { action: 'add', ...form })
    if (!r.ok) { setError(r.error || 'No se pudo añadir.'); return }
    setForm({ name: '', email: '' })
    setOpenId(r.client?.email ?? null)
    void load()
  }

  async function invite(c: PortalAccess) {
    flash(c.email, 'Enviando…')
    const r = await call('POST', { action: 'invite', email: c.email })
    flash(c.email, r.ok ? 'Invitación enviada por email.' : r.error || 'No se pudo enviar.')
    if (r.ok) void load()
  }

  async function copy(c: PortalAccess) {
    const ok = await copyText(`${window.location.origin}${portalPath(c.token)}`)
    flash(c.email, ok ? 'Enlace copiado.' : 'No se pudo copiar.')
  }

  async function patch(c: PortalAccess, body: Record<string, unknown>, done: string) {
    const r = await call('PATCH', { email: c.email, ...body })
    if (r.ok && r.client) setClients(cs => cs.map(x => x.email === c.email ? r.client : x))
    flash(c.email, r.ok ? done : r.error || 'No se pudo guardar.')
  }

  async function sendReply(c: PortalAccess) {
    if (!reply.trim()) return
    const r = await call('POST', { action: 'reply', email: c.email, body: reply })
    if (!r.ok) { flash(c.email, r.error || 'No se pudo enviar.'); return }
    setReply('')
    setMessages(ms => [...ms.map(m => m.email === c.email ? { ...m, read_at: m.read_at || new Date().toISOString() } : m), r.message])
    flash(c.email, r.emailed ? 'Respondido. Le ha llegado por email.' : 'Guardado en su portal (el email no salió: revisa RESEND_API_KEY).')
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSettingsMsg('Guardando…')
    const r = await call('PUT', settings)
    if (r.ok && r.settings) setSettings(r.settings)
    setSettingsMsg(r.ok ? 'Guardado. Todos los portales lo muestran ya.' : r.error || 'No se pudo guardar.')
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Portal de clientes</h1>
          <p className="os-page-sub">Cada cliente tiene su enlace personal. Entra con su email (le llega un enlace de acceso) y sigue dentro 60 días. Ve su contrato, sus facturas, su app y te puede escribir. Los clientes nuevos del pipeline aparecen aquí solos.</p>
        </div>
        <a className="os-btn os-btn-ghost os-btn-sm" href="/portal" target="_blank" rel="noopener"><i className="ti ti-external-link" /> Ver el portal</a>
      </div>

      {error && <div className="os-card" style={{ padding: '14px 20px', marginBottom: 16, color: 'var(--os-bad)', fontSize: 13.5 }}>{error}</div>}

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>
          Clientes {totalUnread > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-accent)' }}>· {totalUnread} {totalUnread === 1 ? 'pregunta nueva' : 'preguntas nuevas'}</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <input className="os-crm-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente…" style={{ flex: '1 1 200px' }} />
        </div>
        {!loaded ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>
        ) : shown.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>{clients.length ? 'Nadie coincide con la búsqueda.' : 'Aún no hay clientes. En cuanto un lead firme o pase a cliente, aparece aquí. También puedes añadir uno abajo.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shown.map(c => {
              const thread = byClient.get(c.email) ?? []
              const n = unread(c.email)
              const isOpen = openId === c.email
              return (
                <div key={c.email} style={{ borderBottom: '1px solid var(--os-line)' }}>
                  <button onClick={() => void open(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 2px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: c.active ? 'var(--os-text)' : 'var(--os-text-faint)' }}>{c.name || c.email}{!c.active && ' · sin acceso'}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--os-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[c.email, c.last_login_at ? `Último acceso ${fmt(c.last_login_at)}` : 'Aún no ha entrado'].join(' · ')}
                      </span>
                    </span>
                    {n > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: 'rgba(14,113,172,.14)', color: 'var(--os-accent)' }}>{n} nueva{n > 1 ? 's' : ''}</span>}
                    <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: 'var(--os-text-faint)' }} />
                  </button>
                  {isOpen && (
                    <div style={{ padding: '4px 2px 18px', display: 'grid', gap: 14 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button className="os-btn os-btn-primary os-btn-sm" onClick={() => void invite(c)} disabled={!c.active}><i className="ti ti-send" /> {c.invited_at ? 'Reenviar invitación' : 'Enviar invitación'}</button>
                        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void copy(c)}><i className="ti ti-copy" /> Copiar su enlace</button>
                        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void patch(c, { active: !c.active }, c.active ? 'Acceso quitado.' : 'Acceso activado.')} style={c.active ? { color: 'var(--os-bad)' } : undefined}>
                          <i className={`ti ti-${c.active ? 'lock' : 'lock-open'}`} /> {c.active ? 'Quitar acceso' : 'Dar acceso'}
                        </button>
                        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void patch(c, { app_ready: !c.app_ready }, c.app_ready ? `Volverá a ver el paso de crear cuenta en ${settings.appName}.` : `Irá directo a ${settings.appName}.`)}>
                          <i className={`ti ti-${c.app_ready ? 'circle-check' : 'circle'}`} /> {c.app_ready ? `Tiene cuenta en ${settings.appName}` : `Sin cuenta en ${settings.appName}`}
                        </button>
                        <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => void patch(c, { newLink: true }, 'Enlace nuevo creado. El anterior ya no funciona.')}><i className="ti ti-refresh" /> Enlace nuevo</button>
                        {note[c.email] && <span style={{ fontSize: 13, color: 'var(--os-text-muted)' }}>{note[c.email]}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)' }}>
                        Su enlace: <code style={{ userSelect: 'all' }}>joseunstoppable.com{portalPath(c.token)}</code>
                        {c.invited_at && <> · Invitado {fmt(c.invited_at)}</>}
                      </div>
                      <AppOverride client={c} fallback={settings.appUrl} onSave={url => void patch(c, { app_url: url }, 'Enlace de la app guardado.')} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Preguntas</div>
                        {thread.length === 0 ? <div style={{ fontSize: 13, color: 'var(--os-text-faint)', marginBottom: 8 }}>Aún no te ha escrito.</div> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                            {thread.map(m => (
                              <div key={m.id} style={{ alignSelf: m.sender === 'client' ? 'flex-start' : 'flex-end', maxWidth: '85%', padding: '9px 12px', borderRadius: 12, fontSize: 13.5, whiteSpace: 'pre-wrap', background: m.sender === 'client' ? 'var(--os-panel-deep, rgba(0,0,0,.05))' : 'rgba(14,113,172,.12)', color: 'var(--os-text)' }}>
                                {m.body}
                                <div style={{ fontSize: 11, color: 'var(--os-text-faint)', marginTop: 3 }}>{m.sender === 'client' ? (c.name || 'Cliente') : 'Tú'} · {fmt(m.created_at)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <textarea className="os-crm-textarea" rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder={`Escribe a ${c.name?.split(' ')[0] || 'tu cliente'}… Le llega por email y lo ve en su portal.`} />
                        <button className="os-btn os-btn-primary os-btn-sm" style={{ marginTop: 8 }} disabled={!reply.trim()} onClick={() => void sendReply(c)}><i className="ti ti-mail" /> Enviar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="os-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div className="os-card-title" style={{ marginBottom: 12 }}>Dar acceso a alguien más</div>
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Nombre
            <input className="os-crm-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ana García" style={{ marginTop: 4 }} />
          </label>
          <label className="os-label" style={{ display: 'block', minWidth: 0 }}>Email
            <input className="os-crm-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ana@email.com" style={{ marginTop: 4 }} />
          </label>
          <button className="os-btn os-btn-primary" disabled={!form.email.trim()}><i className="ti ti-user-plus" /> Añadir</button>
        </form>
      </div>

      <div className="os-card" style={{ padding: '20px 24px' }}>
        <div className="os-card-title" style={{ marginBottom: 6 }}>App de entrenamiento</div>
        <p className="os-page-sub" style={{ margin: '0 0 12px' }}>El botón grande del portal. Un cliente sin cuenta ve primero &quot;Crear mi cuenta&quot; (tu enlace de registro); cuando la tiene (lo marca él o tú arriba) va directo a la app. Sin enlace de registro, todos van directo a la app.</p>
        <form onSubmit={saveSettings} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <label className="os-label" style={{ display: 'block' }}>Nombre de la app
              <input className="os-crm-input" value={settings.appName} onChange={e => setSettings({ ...settings, appName: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label className="os-label" style={{ display: 'block' }}>Enlace de registro (crear cuenta)
              <input className="os-crm-input" value={settings.signupUrl} onChange={e => setSettings({ ...settings, signupUrl: e.target.value })} placeholder="Tu enlace de invitación de Harbiz" style={{ marginTop: 4 }} />
            </label>
            <label className="os-label" style={{ display: 'block' }}>Enlace para entrar a la app
              <input className="os-crm-input" value={settings.appUrl} onChange={e => setSettings({ ...settings, appUrl: e.target.value })} placeholder="https://harbiz.io" style={{ marginTop: 4 }} />
            </label>
            <label className="os-label" style={{ display: 'block' }}>App Store (iPhone)
              <input className="os-crm-input" value={settings.iosUrl} onChange={e => setSettings({ ...settings, iosUrl: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label className="os-label" style={{ display: 'block' }}>Google Play (Android)
              <input className="os-crm-input" value={settings.androidUrl} onChange={e => setSettings({ ...settings, androidUrl: e.target.value })} style={{ marginTop: 4 }} />
            </label>
          </div>
          <label className="os-label" style={{ display: 'block' }}>Mensaje en la portada del portal (opcional)
            <textarea className="os-crm-textarea" rows={2} value={settings.note} onChange={e => setSettings({ ...settings, note: e.target.value })} placeholder="Todo tu programa en un sitio…" style={{ marginTop: 4 }} />
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="os-btn os-btn-primary os-btn-sm">Guardar</button>
            {settingsMsg && <span style={{ fontSize: 13, color: 'var(--os-text-muted)' }}>{settingsMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

function AppOverride({ client, fallback, onSave }: { client: PortalAccess; fallback: string; onSave: (url: string) => void }) {
  const [url, setUrl] = useState(client.app_url ?? '')
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
      <label className="os-label" style={{ display: 'block', flex: '1 1 260px' }}>Su enlace a la app (opcional)
        <input className="os-crm-input" value={url} onChange={e => setUrl(e.target.value)} placeholder={fallback || 'https://…'} style={{ marginTop: 4 }} />
      </label>
      <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => onSave(url)}>Guardar</button>
    </div>
  )
}
