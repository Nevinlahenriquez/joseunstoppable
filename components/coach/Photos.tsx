'use client'

import { useEffect, useState } from 'react'
import type { Photo, Pose } from '@/lib/coach/types'
import type { Store } from '@/lib/coach/store/types'
import { parseYmd } from '@/lib/coach/util'

export const POSES: { k: Pose; t: string }[] = [{ k: 'front', t: 'Frente' }, { k: 'side', t: 'Perfil' }, { k: 'back', t: 'Espalda' }]

export function StoredImg({ store, path, alt = '' }: { store: Store; path: string; alt?: string }) {
  const [src, setSrc] = useState<string | null>(path.startsWith('data:') || path.startsWith('http') ? path : null)
  useEffect(() => {
    let alive = true
    if (!src) store.fileUrl(path).then(u => { if (alive) setSrc(u) }).catch(() => {})
    return () => { alive = false }
  }, [store, path, src])
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} loading="lazy" /> : null
}

const fmt = (d: string) => parseYmd(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** Before / after, side by side, per pose. The oldest and the newest dates. */
export function PhotoCompare({ store, photos }: { store: Store; photos: Photo[] }) {
  const dates = [...new Set(photos.map(p => p.date))].sort()
  const [pose, setPose] = useState<Pose>('front')
  const [a, setA] = useState(dates[0])
  const [b, setB] = useState(dates[dates.length - 1])
  useEffect(() => { setA(dates[0]); setB(dates[dates.length - 1]) }, [dates.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (dates.length < 2) return null
  const pick = (d: string) => photos.find(p => p.date === d && p.pose === pose)
  const pa = pick(a), pb = pick(b)
  return (
    <div className="ca-stack" style={{ gap: 10 }}>
      <div className="ca-tabbar-inline">{POSES.map(p => <button key={p.k} className={pose === p.k ? 'on' : ''} onClick={() => setPose(p.k)}>{p.t}</button>)}</div>
      <div className="ca-grid2">
        {([[a, setA, pa, 'Antes'], [b, setB, pb, 'Ahora']] as const).map(([d, setD, p, label]) => (
          <div key={label} className="ca-stack" style={{ gap: 6 }}>
            <div className="ca-photo">{p ? <StoredImg store={store} path={p.path} alt={`${label} ${pose}`} /> : 'Sin foto'}<span>{label}</span></div>
            <select className="ca-select" value={d} onChange={e => setD(e.target.value)} aria-label={`Fecha ${label}`}>
              {dates.map(x => <option key={x} value={x}>{fmt(x)}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PhotoTimeline({ store, photos, onRemove }: { store: Store; photos: Photo[]; onRemove?: (p: Photo) => void }) {
  const dates = [...new Set(photos.map(p => p.date))].sort().reverse()
  return (
    <div className="ca-stack">
      {dates.map(d => (
        <div key={d}>
          <div className="ca-label" style={{ marginBottom: 6 }}>{fmt(d)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {POSES.map(p => {
              const ph = photos.find(x => x.date === d && x.pose === p.k)
              return (
                <div key={p.k} className="ca-photo">
                  {ph ? <StoredImg store={store} path={ph.path} alt={p.t} /> : '–'}
                  <span>{p.t}</span>
                  {ph && onRemove && <button onClick={() => onRemove(ph)} aria-label="Borrar foto" style={{ position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, border: 0, background: 'rgba(10,22,48,.7)', color: '#fff', cursor: 'pointer' }}>✕</button>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
