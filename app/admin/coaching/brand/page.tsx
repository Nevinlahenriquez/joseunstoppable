'use client'

import { useRef, useState } from 'react'
import { Dumbbell, Home, LineChart as Chart, MessageCircle, UploadCloud, Utensils } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { Avatar } from '@/components/coach/ui'
import { useArea } from '@/components/coach/admin/CoachArea'
import { initials } from '@/lib/coach/util'
import type { Coach } from '@/lib/coach/types'

const PRESETS: [string, string][] = [['#1E5BFF', '#0A1F5C'], ['#E8462B', '#5C150A'], ['#0E9F6E', '#053B2A'], ['#7C4DD6', '#2A1452'], ['#111827', '#F5B700'], ['#D4A017', '#2B2007']]

/** Small images stored inline on the coach row, so the logo shows on the
 *  login screen too, before anyone is signed in. */
function toDataUrl(file: File, max: number, type: 'image/png' | 'image/jpeg'): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL(type, 0.86))
    }
    img.onerror = e => { URL.revokeObjectURL(url); rej(e) }
    img.src = url
  })
}

export default function Brand() {
  const { coach, setCoach, store } = useCoach()
  const { toast } = useArea()
  const [c, setC] = useState<Coach>(coach)
  const [saving, setSaving] = useState(false)
  const logo = useRef<HTMLInputElement>(null)
  const photo = useRef<HTMLInputElement>(null)
  const dirty = JSON.stringify(c) !== JSON.stringify(coach)

  async function save() {
    setSaving(true)
    try { await store.put('coaches', c); setCoach(c); toast('Tu app está actualizada') }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudo guardar.') } finally { setSaving(false) }
  }
  const pick = async (f: File | undefined, k: 'logoUrl' | 'photoUrl') => {
    if (!f) return
    try { setC({ ...c, [k]: await toDataUrl(f, k === 'logoUrl' ? 320 : 400, k === 'logoUrl' ? 'image/png' : 'image/jpeg') }) }
    catch { toast('No se pudo leer esa imagen.') }
  }
  const hex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

  return (
    <div>
      <div className="ca-page-head">
        <div><h1>Tu app</h1><p className="ca-muted">Así la ven tus clientes: tu marca, tus colores, tu foto. Nada de otra empresa.</p></div>
        <button className="ca-btn" onClick={save} disabled={!dirty || saving}>{saving ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}</button>
      </div>
      <div className="ca-split" style={{ alignItems: 'start' }}>
        <div className="ca-stack">
          <div className="ca-card ca-stack">
            <h3>Marca</h3>
            <label className="ca-field"><span className="ca-label">Nombre de la app</span><input className="ca-input" value={c.brandName} onChange={e => setC({ ...c, brandName: e.target.value })} /></label>
            <label className="ca-field"><span className="ca-label">Frase corta</span><input className="ca-input" value={c.tagline ?? ''} onChange={e => setC({ ...c, tagline: e.target.value || undefined })} placeholder="Ej. Entrena con propósito" /></label>
            <label className="ca-field"><span className="ca-label">Tu nombre (coach)</span><input className="ca-input" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} /></label>
            <div className="ca-grid2">
              <div className="ca-field"><span className="ca-label">Logo</span>
                <div className="ca-row">
                  <div className="ca-brand-mark" style={{ width: 56, height: 56, fontSize: 20, background: c.logoUrl ? "#fff" : undefined, border: "1px solid var(--line)" }}>{c.logoUrl ? <img src={c.logoUrl} alt="" /> : initials(c.brandName)}</div>
                  <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => logo.current?.click()}><UploadCloud size={15} /> Subir</button>
                  {c.logoUrl && <button className="ca-link" onClick={() => setC({ ...c, logoUrl: undefined })}>Quitar</button>}
                </div>
                <input ref={logo} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0], 'logoUrl'); e.target.value = '' }} />
              </div>
              <div className="ca-field"><span className="ca-label">Tu foto</span>
                <div className="ca-row">
                  <Avatar name={c.name} url={c.photoUrl} size={56} />
                  <button className="ca-btn ca-btn-ghost ca-btn-sm" onClick={() => photo.current?.click()}><UploadCloud size={15} /> Subir</button>
                </div>
                <input ref={photo} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0], 'photoUrl'); e.target.value = '' }} />
              </div>
            </div>
          </div>
          <div className="ca-card ca-stack">
            <h3>Colores</h3>
            <div className="ca-chips">{PRESETS.map(([p, a]) => (
              <button key={p} className={`ca-chip${c.primary === p ? ' on' : ''}`} onClick={() => setC({ ...c, primary: p, accent: a })} aria-label={`Colores ${p}`}>
                <span style={{ display: 'inline-flex' }}><i style={{ width: 18, height: 18, borderRadius: 9, background: p, display: 'block' }} /><i style={{ width: 18, height: 18, borderRadius: 9, background: a, display: 'block', marginLeft: -6, border: '2px solid #fff' }} /></span>
              </button>
            ))}</div>
            <div className="ca-grid2">
              {(['primary', 'accent'] as const).map(k => (
                <label key={k} className="ca-field"><span className="ca-label">{k === 'primary' ? 'Principal (botones)' : 'Secundario (textos fuertes)'}</span>
                  <div className="ca-row"><input type="color" value={hex(c[k]) ? c[k] : '#000000'} onChange={e => setC({ ...c, [k]: e.target.value })} style={{ width: 48, height: 48, border: 0, background: 'none', padding: 0 }} aria-label={k} />
                    <input className="ca-input" value={c[k]} onChange={e => setC({ ...c, [k]: e.target.value.trim() })} maxLength={7} /></div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <Preview c={c} />
      </div>
    </div>
  )
}

function Preview({ c }: { c: Coach }) {
  const vars = { ['--brand' as string]: c.primary, ['--brand-deep' as string]: c.accent }
  return (
    <div className="ca-phone" style={{ ...vars, display: "flex", flexDirection: "column", minHeight: 560, margin: "0 auto" }}>
      <div style={{ padding: '18px 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="ca-brand-mark" style={{ width: 34, height: 34, fontSize: 13, background: c.logoUrl ? "#fff" : undefined }}>{c.logoUrl ? <img src={c.logoUrl} alt="" /> : initials(c.brandName)}</div>
        <b style={{ color: 'var(--ink)' }}>{c.brandName || 'Tu marca'}</b>
      </div>
      <div style={{ padding: '4px 16px 16px' }} className="ca-stack">
        <div><div className="ca-muted" style={{ fontSize: 13 }}>Hola, Carlos</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--display, inherit)' }}>{c.tagline || 'Hoy toca pierna'}</div></div>
        <div className="ca-card" style={{ background: c.primary, color: '#fff', border: 0 }}>
          <div style={{ fontSize: 12.5, opacity: .85 }}>Entreno de hoy</div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Pierna A · 6 ejercicios</div>
          <div style={{ marginTop: 10, background: '#fff', color: c.accent, borderRadius: 10, padding: '8px 12px', fontWeight: 800, display: 'inline-block', fontSize: 14 }}>Empezar</div>
        </div>
        <div className="ca-card ca-card-tight ca-row" style={{ gap: 10 }}>
          <Avatar name={c.name} url={c.photoUrl} size={34} />
          <div style={{ fontSize: 13.5 }}><b style={{ color: 'var(--ink)' }}>{c.name.split(' ')[0] || 'Tu coach'}</b><div className="ca-muted">“Buen trabajo ayer, sube 2 kg hoy.”</div></div>
        </div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-around', padding: '10px 6px 14px', borderTop: '1px solid var(--line)', background: '#fff' }}>
        {[Home, Dumbbell, Utensils, Chart, MessageCircle].map((I, i) => <I key={i} size={21} color={i === 0 ? c.primary : 'var(--muted)'} />)}
      </div>
    </div>
  )
}
