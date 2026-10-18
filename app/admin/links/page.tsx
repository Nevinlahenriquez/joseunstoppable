'use client'

import { useEffect, useState } from 'react'
import { copyText } from '@/lib/clipboard'

type Link = { id: string; label: string; url: string; active: boolean; highlight: boolean }

export default function LinksAdmin() {
  const [links, setLinks] = useState<Link[]>([])
  const [views, setViews] = useState(0)
  const [clicks, setClicks] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const d = await fetch('/api/admin/links').then(r => r.json()).catch(() => null)
    if (!d) return setMsg('No se pudo cargar.')
    setLinks(d.links ?? []); setViews(d.views ?? 0); setClicks(d.clicks ?? {})
    if (d.ok === false && d.error) setMsg(d.error)
  }
  useEffect(() => { void load() }, [])

  const update = (i: number, patch: Partial<Link>) => setLinks(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const move = (i: number, d: -1 | 1) => setLinks(ls => {
    const n = [...ls]; const j = i + d
    if (j < 0 || j >= n.length) return ls
    ;[n[i], n[j]] = [n[j], n[i]]; return n
  })

  async function save() {
    setSaving(true)
    const d = await fetch('/api/admin/links', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links }) }).then(r => r.json()).catch(() => null)
    setSaving(false)
    if (d?.ok) { setMsg('Guardado.'); void load() } else setMsg(d?.error || 'No se guardó.')
  }

  const pageUrl = typeof window !== 'undefined' ? `${location.origin}/links` : '/links'
  const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0)

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Link en bio</h1>
          <p className="os-page-sub">Tu página de enlaces para Instagram y TikTok. Cada visita y cada clic se cuentan.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="os-btn" href="/links" target="_blank" rel="noreferrer">Ver página</a>
          <button className="os-btn" onClick={() => { void copyText(pageUrl); setMsg('Copiado: ' + pageUrl) }}>Copiar enlace</button>
        </div>
      </div>

      {msg && <div className="os-card" style={{ padding: 12, marginBottom: 12 }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
        <div className="os-card" style={{ padding: 16 }}><div className="os-label">Visitas (30 días)</div><div style={{ fontSize: 28, fontWeight: 700 }}>{views}</div></div>
        <div className="os-card" style={{ padding: 16 }}><div className="os-label">Clics (30 días)</div><div style={{ fontSize: 28, fontWeight: 700 }}>{totalClicks}</div></div>
        <div className="os-card" style={{ padding: 16 }}><div className="os-label">Clics por visita</div><div style={{ fontSize: 28, fontWeight: 700 }}>{views ? Math.round((totalClicks / views) * 100) : 0}%</div></div>
      </div>

      <div className="os-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        {links.length === 0 && <div className="os-empty"><div className="os-empty-title">Sin enlaces todavía</div><div className="os-empty-sub">Ejemplo: Reserva tu llamada gratuita → /reserva</div></div>}
        {links.map((l, i) => (
          <div key={l.id || i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1.4fr auto', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'grid' }}>
              <button className="os-icon-btn" aria-label="Subir" onClick={() => move(i, -1)}>▲</button>
              <button className="os-icon-btn" aria-label="Bajar" onClick={() => move(i, 1)}>▼</button>
            </div>
            <input className="os-input" placeholder="Texto del botón" value={l.label} onChange={e => update(i, { label: e.target.value })} />
            <input className="os-input" placeholder="/reserva o https://..." value={l.url} onChange={e => update(i, { url: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <span title="Clics en 30 días">{clicks[l.id] ?? 0} clics</span>
              <label><input type="checkbox" checked={l.highlight} onChange={e => update(i, { highlight: e.target.checked })} /> Destacar</label>
              <label><input type="checkbox" checked={l.active} onChange={e => update(i, { active: e.target.checked })} /> Visible</label>
              <button className="os-icon-btn" aria-label="Quitar" onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="os-btn" onClick={() => setLinks(ls => [...ls, { id: '', label: '', url: '', active: true, highlight: false }])}>+ Añadir enlace</button>
          {links.length === 0 && <button className="os-btn" onClick={() => setLinks([
            { id: '', label: 'Reserva tu llamada gratuita', url: '/reserva', active: true, highlight: true },
            { id: '', label: 'Masterclass gratuita', url: '/masterclass', active: true, highlight: false },
            { id: '', label: 'Mi web', url: '/', active: true, highlight: false },
          ])}>Empezar con 3 enlaces</button>}
          <button className="os-btn" disabled={saving} onClick={() => void save()} style={{ marginLeft: 'auto' }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
      <p className="os-page-sub" style={{ marginTop: 12 }}>Los enlaces a tu propia web llevan ref=bio, así el lead queda marcado como &quot;Link en bio&quot; en el pipeline.</p>
    </div>
  )
}
