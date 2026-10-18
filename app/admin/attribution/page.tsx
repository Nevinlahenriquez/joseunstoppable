'use client'

import { useEffect, useState } from 'react'
import { copyText } from '@/lib/clipboard'
import type { FeeSettings } from '@/lib/fee'

type Client = { email: string; name: string; firstPaidAt: string; revenue: number; channel: string; ad: boolean; overridden: boolean; inWindow: boolean }
type Data = {
  ok: boolean; error?: string; fee: FeeSettings; adParams: string; channels: string[]
  leadsBy: Record<string, number>; callsBy: Record<string, number>; paidBy: Record<string, number>
  clients: Client[]; counted: number; feeTotal: number; windowEnd: string
}

const AD = 'Anuncio Meta'

export default function AttributionPage() {
  const [d, setD] = useState<Data | null>(null)
  const [fee, setFee] = useState<FeeSettings | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await fetch('/api/admin/attribution').then(x => x.json()).catch(() => null)
    if (!r) return setMsg('No se pudo cargar.')
    setD(r); setFee(r.fee)
    if (r.ok === false && r.error) setMsg(r.error)
  }
  useEffect(() => { void load() }, [])

  async function put(body: unknown, ok: string) {
    const r = await fetch('/api/admin/attribution', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(x => x.json()).catch(() => null)
    setMsg(r?.ok ? ok : r?.error || 'No se guardó.')
    if (r?.ok) void load()
  }

  const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: fee?.currency || 'EUR' }).format(n)
  const channels = d?.channels ?? []
  const rows: [string, Record<string, number> | undefined][] = [['Leads', d?.leadsBy], ['Llamadas', d?.callsBy], ['Clientes que pagaron', d?.paidBy]]

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Anuncios vs directo</h1>
          <p className="os-page-sub">De dónde vienen tus leads, tus llamadas y tus clientes. Solo &quot;Anuncio Meta&quot; cuenta para la comisión de captación.</p>
        </div>
      </div>
      {msg && <div className="os-card" style={{ padding: 12, marginBottom: 12 }}>{msg}</div>}

      <div className="os-card" style={{ padding: 16, marginBottom: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: 6 }}></th>{channels.map(c => <th key={c} style={{ textAlign: 'right', padding: 6, whiteSpace: 'nowrap', color: c === AD ? 'var(--os-accent)' : undefined }}>{c}</th>)}</tr></thead>
          <tbody>{rows.map(([label, by]) => (
            <tr key={label}><td style={{ padding: 6, fontWeight: 600 }}>{label}</td>{channels.map(c => <td key={c} style={{ textAlign: 'right', padding: 6 }}>{by?.[c] ?? 0}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>

      {fee && (
        <div className="os-card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 12 }}>
          <div className="os-card-title">Comisión por clientes de anuncios</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <div className="os-form-group"><label className="os-label">Empieza el</label><input className="os-input" type="date" value={fee.startDate} onChange={e => setFee({ ...fee, startDate: e.target.value })} /></div>
            <div className="os-form-group"><label className="os-label">Meses</label><input className="os-input" type="number" value={fee.months} onChange={e => setFee({ ...fee, months: Number(e.target.value) })} /></div>
          </div>
          <div className="os-label">Importe por cliente nuevo (por tramos)</div>
          {fee.tiers.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Desde el cliente nº</span>
              <input className="os-input" type="number" style={{ width: 90 }} value={t.from} onChange={e => setFee({ ...fee, tiers: fee.tiers.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) } : x)) })} />
              <input className="os-input" type="number" style={{ width: 110 }} value={t.perClient} onChange={e => setFee({ ...fee, tiers: fee.tiers.map((x, j) => (j === i ? { ...x, perClient: Number(e.target.value) } : x)) })} />
              <span>{fee.currency} por cliente</span>
              {fee.tiers.length > 1 && <button className="os-icon-btn" aria-label="Quitar tramo" onClick={() => setFee({ ...fee, tiers: fee.tiers.filter((_, j) => j !== i) })}>✕</button>}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="os-btn" onClick={() => setFee({ ...fee, tiers: [...fee.tiers, { from: (fee.tiers.at(-1)?.from ?? 0) + 5, perClient: fee.tiers.at(-1)?.perClient ?? 25 }] })}>+ Tramo</button>
            <button className="os-btn" style={{ marginLeft: 'auto' }} onClick={() => void put({ fee }, 'Comisión guardada.')}>Guardar</button>
          </div>
          {d && (
            <div style={{ fontSize: 15 }}>
              {fee.startDate
                ? <>Clientes nuevos de anuncios en el periodo: <strong>{d.counted}</strong> · Total a facturar: <strong>{eur(d.feeTotal)}</strong>{d.windowEnd && <> · hasta el {new Date(d.windowEnd).toLocaleDateString('es-ES')}</>}</>
                : 'Pon la fecha de inicio para empezar a contar.'}
            </div>
          )}
        </div>
      )}

      <div className="os-card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="os-card-title">Clientes que han pagado</div>
        {!d?.clients.length
          ? <div className="os-empty"><div className="os-empty-sub">Aparecen aquí cuando una factura se marca como pagada.</div></div>
          : <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {d.clients.map(c => (
                <div key={c.email} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--os-border)', padding: '6px 0' }}>
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--os-text-muted)', fontSize: 13 }}>{c.firstPaidAt ? new Date(c.firstPaidAt).toLocaleDateString('es-ES') : 'sin fecha'} · {eur(c.revenue)}</span>
                  <span className="os-chip" style={c.ad ? { color: 'var(--os-accent)' } : undefined}>{c.ad ? AD : c.channel}{c.overridden ? ' (a mano)' : ''}</span>
                  {c.ad && c.inWindow && <span style={{ color: 'var(--os-good)', fontSize: 13 }}>cuenta para la comisión</span>}
                  <select className="os-select" style={{ marginLeft: 'auto' }} value={c.overridden ? (c.ad ? 'ad' : 'not-ad') : ''} onChange={e => void put({ override: { email: c.email, value: e.target.value || null } }, 'Corregido.')}>
                    <option value="">Según la etiqueta</option>
                    <option value="ad">Vino de un anuncio</option>
                    <option value="not-ad">No vino de un anuncio</option>
                  </select>
                </div>
              ))}
            </div>}
      </div>

      {d && (
        <div className="os-card" style={{ padding: 16 }}>
          <div className="os-card-title">Para que un anuncio cuente</div>
          <p className="os-page-sub">En Ads Manager, en cada anuncio: Parámetros de URL. Pega esto. Sin estos parámetros el lead se marca &quot;Meta (sin confirmar)&quot; y no cuenta.</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ padding: 8, background: 'var(--os-chip)', borderRadius: 8, wordBreak: 'break-all' }}>{d.adParams}</code>
            <button className="os-btn" onClick={() => { void copyText(d.adParams); setMsg('Copiado.') }}>Copiar</button>
          </div>
        </div>
      )}
    </div>
  )
}
