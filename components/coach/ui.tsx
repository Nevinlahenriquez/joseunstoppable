'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { initials, parseYmd } from '@/lib/coach/util'

/** A progress ring. value 0..1. */
export function Ring({ value, size = 64, stroke = 7, color = 'var(--brand)', track = 'var(--ice)', children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value || 0))
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

export interface Point { x: string; y: number }

/** A small line chart. x is yyyy-mm-dd. Draws nothing silly for one point. */
export function LineChart({ points, height = 160, color = 'var(--brand)', unit = '', fmt }: { points: Point[]; height?: number; color?: string; unit?: string; fmt?: (n: number) => string }) {
  const id = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  if (!points.length) return <div className="ca-muted" style={{ height, display: 'grid', placeItems: 'center', fontSize: 14 }}>Todavía no hay datos</div>
  const W = 600, H = height, pad = { l: 36, r: 12, t: 14, b: 24 }
  const ys = points.map(p => p.y)
  let lo = Math.min(...ys), hi = Math.max(...ys)
  if (lo === hi) { lo -= 1; hi += 1 }
  const span = hi - lo
  lo -= span * 0.12; hi += span * 0.12
  const xs = points.map(p => parseYmd(p.x).getTime())
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const px = (t: number) => pad.l + (x1 === x0 ? (W - pad.l - pad.r) / 2 : ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r))
  const py = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const pts = points.map((p, i) => [px(xs[i]), py(p.y)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${H - pad.b} L${pts[0][0].toFixed(1)},${H - pad.b} Z`
  const f = fmt ?? ((n: number) => `${Math.round(n * 10) / 10}`)
  const ticks = [hi - (hi - lo) * 0.12, (hi + lo) / 2, lo + (hi - lo) * 0.12]
  const label = (s: string) => parseYmd(s).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  const h = hover ?? points.length - 1
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}
        onPointerMove={e => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const x = ((e.clientX - r.left) / r.width) * W
          let best = 0
          pts.forEach(([px2], i) => { if (Math.abs(px2 - x) < Math.abs(pts[best][0] - x)) best = i })
          setHover(best)
        }}
        onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={py(t)} y2={py(t)} stroke="var(--line)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <text x={pad.l - 6} y={py(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{f(t)}</text>
          </g>
        ))}
        {points.length > 1 && <path d={area} fill={`url(#g${id})`} />}
        {points.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === h ? 5 : 3} fill={i === h ? color : '#fff'} stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
        <text x={pad.l} y={H - 6} fontSize="11" fill="var(--muted)">{label(points[0].x)}</text>
        {points.length > 1 && <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--muted)">{label(points[points.length - 1].x)}</text>}
      </svg>
      <div className="ca-chart-tip">{label(points[h].x)} · <b>{f(points[h].y)}{unit}</b></div>
    </div>
  )
}

/** Bottom sheet on a phone, centred dialog on a desktop. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="ca-sheet-bg" onClick={onClose}>
      <div className={`ca-sheet${wide ? ' ca-sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="ca-sheet-head">
          <div className="ca-sheet-title">{title}</div>
          <button className="ca-icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="ca-sheet-body">{children}</div>
        {footer && <div className="ca-sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
  }
  return (
    <div aria-hidden style={{ width: size, height: size, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.38, color: '#fff', background: 'linear-gradient(135deg, var(--brand), var(--brand-deep))' }}>
      {initials(name)}
    </div>
  )
}

export function Empty({ icon = '✨', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="ca-empty">
      <div style={{ fontSize: 30 }}>{icon}</div>
      <div className="ca-empty-title">{title}</div>
      {text && <div className="ca-muted" style={{ fontSize: 14, maxWidth: 320 }}>{text}</div>}
      {action}
    </div>
  )
}

/** 1..n scale of tappable chips with a label under the ends. */
export function Scale({ value, onChange, max = 5, low, high }: { value: number; onChange: (n: number) => void; max?: number; low?: string; high?: string }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${max}, 1fr)`, gap: 6 }}>
        {Array.from({ length: max }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" className={`ca-scale${value === n ? ' on' : ''}`} onClick={() => onChange(n)} aria-pressed={value === n}>{n}</button>
        ))}
      </div>
      {(low || high) && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }} className="ca-muted"><span>{low}</span><span>{high}</span></div>}
    </div>
  )
}

export function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrellas`}
          style={{ background: 'none', border: 0, fontSize: 32, cursor: 'pointer', padding: 2, color: n <= value ? '#F5B301' : 'var(--ice)', minWidth: 44, minHeight: 44 }}>★</button>
      ))}
    </div>
  )
}

export function Spinner() {
  return <div className="ca-spin" aria-label="Cargando" />
}
