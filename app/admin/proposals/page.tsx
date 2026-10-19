'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getProposals, updateProposal, duplicateProposal,
  reviseProposal, deleteProposal, createInvoiceFromProposal,
} from '@/lib/crm-store'
import { isResultsBased } from '@/lib/results-billing'
import type { Proposal, ProposalStatus } from '@/lib/crm-types'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { shareOrCopy } from '@/lib/clipboard'
import { getPeople } from '@/lib/people'

function fmt(n: number, cur = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(n)
}

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 30) return `hace ${days} d`
  return new Date(d).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
}

const STATUS_META: Record<ProposalStatus, { color: string; bg: string; icon: string; label: string }> = {
  draft:    { color: 'var(--os-text-faint)', bg: 'var(--os-line)', icon: 'ti-pencil',        label: 'Borrador' },
  sent:     { color: 'var(--os-warn)', bg: 'var(--os-warn-soft)', icon: 'ti-send',          label: 'Enviada' },
  signed:   { color: 'var(--os-good)', bg: 'var(--os-good-soft)', icon: 'ti-circle-check',  label: 'Firmada' },
  declined: { color: 'var(--os-bad)', bg: 'var(--os-bad-soft)', icon: 'ti-x',             label: 'Rechazada' },

  void:     { color: 'var(--os-text-faint)', bg: 'var(--os-line)', icon: 'ti-ban',          label: 'Anulada' },
}

export default function ProposalsPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [filter, setFilter] = useState<'all' | ProposalStatus>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const [menuPos, setMenuPos] = useState({ top: 0, right: 0, flip: false })
  const [converting, setConverting] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)

  const [armedRemind, setArmedRemind] = useState<string | null>(null)
  const [reminded, setReminded] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const reload = () => {
    setProposals(getProposals().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }
  useEffect(() => {
    reload()

    window.addEventListener('ju:hydrated', reload)
    return () => window.removeEventListener('ju:hydrated', reload)
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = filter === 'all' ? proposals : proposals.filter(p => p.status === filter)

  const totalValue = proposals.reduce((s, p) => s + p.total, 0)
  const pendingValue = proposals.filter(p => p.status === 'sent').reduce((s, p) => s + p.total, 0)
  const signedValue = proposals.filter(p => p.status === 'signed').reduce((s, p) => s + p.total, 0)

  async function sendReminder(p: Proposal) {
    if (!p.clientEmail) { showToast('Esta propuesta no tiene email, así que no hay adónde enviarla.'); return }
    if (armedRemind !== p.id) { setArmedRemind(p.id); return }
    setArmedRemind(null)
    setSending(p.id)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: p.id, token: p.token, ref: p.ref,
          clientName: p.clientName, clientEmail: p.clientEmail,
          clientCompany: p.clientCompany, title: p.title,
          total: p.total, currency: p.currency,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || (data && data.ok === false)) {
        showToast(`No enviada: ${data?.error ?? res.status}.`)
        return
      }

      setReminded(p.id)
      showToast(`Recordatorio enviado a ${p.clientEmail}`)
    } catch {
      showToast('No se pudo enviar, revisa Resend')
    } finally { setSending(null) }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/proposal/${token}`
    setMenuOpen(null)
    void shareOrCopy(url, 'Propuesta').then(r => {
      if (r === 'copied') showToast('¡Enlace copiado!')
      else if (r === 'failed') { showToast('Copia bloqueada, mantén pulsado el enlace'); window.prompt('Enlace de la propuesta:', url) }
    })
  }

  function handleConvertToInvoice(p: Proposal) {
    setConverting(p.id); setMenuOpen(null)
    try {
      const inv = createInvoiceFromProposal(p)
      showToast(`Factura #${inv.number} creada`)
      setTimeout(() => router.push(`/admin/invoices/${inv.id}`), 1200)
    } catch { showToast('No se pudo crear la factura') }
    finally { setConverting(null) }
  }

  async function handleSendProposal(p: Proposal) {
    setSending(p.id); setMenuOpen(null)
    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: p.id, token: p.token, ref: p.ref,
          clientName: p.clientName, clientEmail: p.clientEmail,
          clientCompany: p.clientCompany, title: p.title,
          total: p.total, currency: p.currency,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || (data && data.ok === false)) {
        showToast(`No enviada: ${data?.error ?? res.status}. La propuesta no ha cambiado.`)
        return
      }
      updateProposal(p.id, { status: 'sent', sentAt: new Date().toISOString() })
      reload()
      showToast(`Propuesta enviada a ${p.clientEmail}`)
    } catch { showToast('No se pudo enviar, revisa Resend') }
    finally { setSending(null) }
  }

  function handleRevise(id: string) {
    const r = reviseProposal(id); setMenuOpen(null)
    if (r) router.push(`/admin/proposals/${r.id}/edit`)
  }

  async function handleDelete(p: Proposal) {
    setMenuOpen(null)
    if (!(await confirmAction({ message: `¿Eliminar ${p.ref}?`, detail: 'No se puede deshacer.' }))) return
    deleteProposal(p.id); reload()
  }

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--os-deep)', color: 'var(--os-on-deep)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {}
      <div className="os-page-header">
        <div>
          <div className="os-page-title">Propuestas</div>
          <div className="os-page-sub">{proposals.length} {proposals.length === 1 ? 'propuesta' : 'propuestas'}, {fmt(totalValue)} en total</div>
        </div>
        <Link href="/admin/proposals/new" className="os-btn os-btn-primary">
          <i className="ti ti-plus" /> Nueva propuesta
        </Link>
      </div>

      {}
      <div className="os-collapse-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { icon: 'ti-file-text', label: 'Total en propuestas', value: fmt(totalValue), sub: `${proposals.length} propuestas`, accent: 'var(--os-accent)', light: 'var(--os-line)' },
          { icon: 'ti-hourglass', label: 'Pendiente de firma', value: fmt(pendingValue), sub: `${proposals.filter(p => p.status === 'sent').length} enviadas`, accent: 'var(--os-warn)', light: 'var(--os-warn-soft)' },
          { icon: 'ti-trophy', label: 'Firmadas', value: fmt(signedValue), sub: `${proposals.filter(p => p.status === 'signed').length} cerradas`, accent: 'var(--os-good)', light: 'var(--os-good-soft)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', border: '1px solid var(--os-line)', borderRadius: 16, padding: '24px 28px', display: 'flex', gap: 18, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: s.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--os-text)', letterSpacing: -1, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--os-text-muted)', marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--os-text-faint)', marginTop: 2 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {}
      {}
      {proposals.filter(p => p.status === 'sent' && p.sentAt && Math.floor((Date.now() - new Date(p.sentAt).getTime()) / 86400000) >= 3).map(p => {
        const days = Math.floor((Date.now() - new Date(p.sentAt!).getTime()) / 86400000)
        const done = reminded === p.id
        return (
          <div key={p.id} style={{
            marginBottom: 10,
            background: done ? 'var(--os-good-soft)' : 'var(--os-warn-soft)',
            border: `1px solid ${done ? '#86efac' : '#fcd34d'}`,
            borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
            transition: 'background .2s ease, border-color .2s ease',
          }}>
            <i className={`ti ${done ? 'ti-check' : 'ti-clock'}`} style={{ color: done ? 'var(--os-good)' : 'var(--os-warn)' }} />
            <span style={{ color: done ? 'var(--os-good)' : 'var(--os-warn)', fontWeight: 600 }}>
              {done
                ? `Recordatorio enviado a ${p.clientEmail}`
                : `${p.clientName}, esperando firma desde hace ${days} días · ${fmt(p.total, p.currency)}`}
            </span>
            {!done && (
              <>
                <button
                  onClick={() => sendReminder(p)}
                  onBlur={() => setArmedRemind(a => (a === p.id ? null : a))}
                  disabled={sending === p.id}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 12px', cursor: 'pointer', fontSize: 12, fontWeight: armedRemind === p.id ? 800 : 600, color: 'var(--os-warn)' }}
                >
                  {sending === p.id ? 'Enviando…'
                    : armedRemind === p.id ? `Pulsa otra vez: enviar a ${p.clientEmail}`
                    : 'Enviar recordatorio'}
                </button>
                {}
                <button onClick={() => copyLink(p.token)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--os-warn)', textDecoration: 'underline' }}>
                  Copiar enlace
                </button>
              </>
            )}
          </div>
        )
      })}

      {}
      <div className="os-chiprow" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['all', 'draft', 'sent', 'signed', 'declined'] as const).map(s => {
          const meta = s !== 'all' ? STATUS_META[s] : null
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12,
              background: filter === s ? (meta?.color ?? 'var(--os-accent)') : 'transparent',
              color: filter === s ? '#fff' : 'var(--os-text-muted)',
              border: `1px solid ${filter === s ? (meta?.color ?? 'var(--os-accent)') : 'var(--os-line)'}`,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {meta && <i className={`ti ${meta.icon}`} style={{ fontSize: 11 }} />}
              {s === 'all' ? 'Todas' : STATUS_META[s].label}
              {s !== 'all' && <span style={{ opacity: 0.7 }}>({proposals.filter(p => p.status === s).length})</span>}
            </button>
          )
        })}
      </div>

      {}
      {filtered.length === 0 ? (
        <div className="os-card">
          <div className="os-empty">
            <i className="ti ti-file-description" />
            <div className="os-empty-title">{filter !== 'all' ? `No hay propuestas con estado «${STATUS_META[filter as keyof typeof STATUS_META]?.label ?? filter}»` : 'Aún no hay propuestas'}</div>
            <div className="os-empty-sub">Crea tu primera propuesta y envía al cliente un enlace para firmarla</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(p => {
            const meta = STATUS_META[p.status]
            return (
              <div key={p.id} className="os-card" style={{ padding: 0, transition: 'box-shadow .15s', cursor: 'pointer' }}
                onClick={() => router.push(`/admin/proposals/${p.id}/edit`)}>
                <div className="ospr-row" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>

                  {}
                  <div className="ospr-stripe" style={{ width: 5, alignSelf: 'stretch', background: meta.color, borderRadius: '14px 0 0 14px', flexShrink: 0 }} />

                  {}
                  <div className="ospr-icon" style={{ width: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${meta.icon}`} style={{ fontSize: 18, color: meta.color }} />
                      {p.status === 'sent' && (
                        <span
                          title={p.viewedAt
                            ? `Abierta el ${new Date(p.viewedAt).toLocaleString('es-ES')}`
                            : 'Enviada, aún sin abrir'}
                          style={{
                            position: 'absolute', right: -5, bottom: -5,
                            width: 18, height: 18, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, lineHeight: 1,
                            background: p.viewedAt ? 'var(--os-good-soft)' : 'var(--os-line)',
                            border: `1.5px solid ${p.viewedAt ? 'var(--os-good)' : 'var(--os-line-strong)'}`,
                          }}
                        >
                          {p.viewedAt ? '👀' : '✉️'}
                        </span>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="ospr-main" style={{ flex: 1, padding: '18px 0', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, overflow: 'hidden' }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--os-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{p.clientName}</span>
                      {p.clientCompany && <span style={{ fontSize: 12, color: 'var(--os-text-faint)', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{p.clientCompany}</span>}
                      {(p.version ?? 1) > 1 && <span style={{ fontSize: 10, fontWeight: 800, background: '#0E71AC20', color: '#0E71AC', padding: '2px 7px', borderRadius: 20, flexShrink: 0 }}>v{p.version}</span>}
                      {p.linkedInvoiceId && <span style={{ fontSize: 10.5, fontWeight: 700, background: '#16a34a18', color: 'var(--os-good)', padding: '2px 8px', borderRadius: 20, border: '1px solid #16a34a33', flexShrink: 0 }}>Facturada</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                    <div className="ospr-meta" style={{ fontSize: 11.5, color: 'var(--os-text-faint)', display: 'flex', gap: 12 }}>
                      <span><i className="ti ti-hash" style={{ marginRight: 3 }} />{p.ref}</span>
                      <span><i className="ti ti-calendar" style={{ marginRight: 3 }} />{timeAgo(p.createdAt)}</span>
                      {p.sentAt && <span><i className="ti ti-send" style={{ marginRight: 3 }} />Enviada {timeAgo(p.sentAt)}</span>}
                      {p.signedAt && <span style={{ color: 'var(--os-good)' }}><i className="ti ti-writing" style={{ marginRight: 3 }} />Firmada {timeAgo(p.signedAt)}</span>}
                    </div>
                  </div>

                  {}
                  <div className="ospr-pills" style={{ display: 'flex', gap: 6, padding: '0 16px', flexShrink: 0 }}>
                    {p.paymentSchedule.slice(0, 3).map((m, i) => (
                      <div key={i} style={{ background: 'var(--os-card-alt)', border: '1px solid var(--os-line)', borderRadius: 8, padding: '6px 12px', textAlign: 'center', maxWidth: 120 }}>
                        <div style={{ fontSize: 10, color: 'var(--os-text-faint)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--os-text)' }}>{fmt(m.amount, p.currency)}</div>
                      </div>
                    ))}
                    {p.paymentSchedule.length > 3 && (
                      <div style={{ background: 'var(--os-card-alt)', border: '1px solid var(--os-line)', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--os-text-faint)', fontSize: 12 }}>
                        +{p.paymentSchedule.length - 3}
                      </div>
                    )}
                  </div>

                  {}
                  <div className="ospr-total" style={{ padding: '0 24px 0 8px', textAlign: 'right', flexShrink: 0, minWidth: 110 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: meta.color, letterSpacing: -1 }}>{fmt(p.total, p.currency)}</div>
                    <div style={{ fontSize: 11, color: 'var(--os-text-faint)' }}>{p.currency} · {p.paymentSchedule.length} {p.paymentSchedule.length === 1 ? 'pago' : 'pagos'}</div>
                  </div>

                  {}
                  <div className="ospr-actions" style={{ paddingRight: 16, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()

                        const MENU_H = 320
                        const flip = rect.bottom + MENU_H > window.innerHeight
                        setMenuPos({
                          top: flip ? window.innerHeight - rect.top + 6 : rect.bottom + 6,
                          right: window.innerWidth - rect.right,
                          flip,
                        })
                        setMenuOpen(menuOpen === p.id ? null : p.id)
                      }}
                      style={{ background: 'none', border: '1px solid var(--os-line)', borderRadius: 6, padding: '5px 9px', cursor: 'pointer', color: 'var(--os-text-faint)', fontSize: 15, lineHeight: 1 }}>
                      •••
                    </button>
                    {menuOpen === p.id && (
                      <div style={{
                        position: 'fixed',
                        ...(menuPos.flip ? { bottom: menuPos.top } : { top: menuPos.top }),
                        right: menuPos.right,
                        background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', border: '1px solid var(--os-line)',
                        borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)',
                        zIndex: 1000, minWidth: 200, padding: 6,

                        maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
                      }}>
                        <MenuItem icon="ti-edit" label="Editar propuesta" onClick={() => { setMenuOpen(null); router.push(`/admin/proposals/${p.id}/edit`) }} />
                        <MenuLink icon="ti-eye" label="Vista previa" href={`/proposal/${p.token}?preview=1`} onClick={() => setMenuOpen(null)} />
                        <MenuItem icon="ti-link" label="Copiar enlace de firma" onClick={() => copyLink(p.token)} />
                        {(p.status === 'draft' || p.status === 'sent') && (
                          <MenuItem icon="ti-mail-forward" label={sending === p.id ? 'Enviando…' : 'Enviar al cliente'} onClick={() => handleSendProposal(p)} style={{ color: 'var(--os-accent)', fontWeight: 700 }} />
                        )}
                        <MenuItem icon="ti-git-branch" label="Revisar (nueva versión)" onClick={() => handleRevise(p.id)} />
                        <MenuItem icon="ti-copy" label="Duplicar" onClick={() => { duplicateProposal(p.id); setMenuOpen(null); reload() }} />
                        {p.status === 'signed' && isResultsBased(p) && (
                          <MenuItem icon="ti-receipt" label="Facturar clientes nuevos" onClick={() => { setMenuOpen(null); router.push(`/admin/proposals/${p.id}/edit`) }} style={{ color: 'var(--os-accent)', fontWeight: 700 }} />
                        )}
                        {p.status === 'signed' && !p.linkedInvoiceId && !isResultsBased(p) && (
                          <MenuItem icon="ti-receipt" label={converting === p.id ? 'Creando…' : 'Convertir en factura'} onClick={() => handleConvertToInvoice(p)} style={{ color: 'var(--os-accent)', fontWeight: 700 }} />
                        )}
                        {p.status === 'signed' && p.linkedInvoiceId && (
                          <MenuItem icon="ti-receipt" label="Ver factura" onClick={() => { setMenuOpen(null); router.push(`/admin/invoices/${p.linkedInvoiceId}`) }} style={{ color: 'var(--os-good)' }} />
                        )}
                        <div style={{ height: 1, background: 'var(--os-chip)', margin: '4px 0' }} />
                        <MenuItem icon="ti-trash" label="Eliminar" onClick={() => handleDelete(p)} style={{ color: 'var(--os-bad)' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {menuOpen && <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />}
    </>
  )
}

function MenuItem({ icon, label, onClick, style }: { icon: string; label: string; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, borderRadius: 6, color: 'var(--os-text)', textAlign: 'left', ...style }}>
      <i className={`ti ${icon}`} /> {label}
    </button>
  )
}

function MenuLink({ icon, label, href, onClick }: { icon: string; label: string; href: string; onClick: () => void }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', color: 'var(--os-text)', textDecoration: 'none', fontSize: 13, borderRadius: 6 }}>
      <i className={`ti ${icon}`} /> {label}
    </a>
  )
}
