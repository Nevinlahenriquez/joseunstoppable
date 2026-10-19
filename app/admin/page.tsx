'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getLeads, getDeals, getProposals, getInvoices } from '@/lib/crm-store'
import type { Lead, Deal, Proposal, Invoice } from '@/lib/crm-types'
import TrafficPanel from './TrafficPanel'
import ActionCenter from './ActionCenter'
import SetupCard from './SetupCard'
import { openContactPanel } from '@/lib/contact-panel'
import { isLikelySpam } from '@/lib/apply-guard'
import { OsIcon } from './os-icons'
import { EmailText } from '@/components/os/CopyEmail'

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export default function OsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const reload = () => {
    setLeads(getLeads())
    setDeals(getDeals())
    setProposals(getProposals())
    setInvoices(getInvoices())
  }

  useEffect(() => {
    reload()
    window.addEventListener('ju:hydrated', reload)
    return () => window.removeEventListener('ju:hydrated', reload)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeDeals = deals.filter(d => !['completed', 'lost'].includes(d.stage))
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.value ?? 0), 0)
  const signedProposals = proposals.filter(p => p.status === 'signed')

  const statCards = [
    { label: 'Leads',          value: String(leads.filter(l => !isLikelySpam(l)).length), note: 'En total, sin spam', icon: 'applications' as const, bg: 'rgba(14,113,172,.12)' },
    { label: 'En el pipeline', value: String(activeDeals.length),     note: 'Leads abiertos',        icon: 'hot' as const, bg: 'rgba(232,165,22,.16)' },
    { label: 'En juego',       value: fmt(pipelineValue),             note: 'Valor del pipeline',                icon: 'money' as const, bg: 'rgba(31,138,91,.14)'  },
    { label: 'Firmados',       value: String(signedProposals.length), note: 'Propuestas firmadas',   icon: 'signed' as const, bg: 'rgba(224,104,63,.14)' },
  ]

  const stBadge = (s: string) =>
    s === 'signed' ? { sc: 'var(--os-good)', sbg: 'rgba(31,138,91,.12)' } :
    s === 'sent'   ? { sc: 'var(--os-warn)', sbg: 'rgba(232,165,22,.16)' } :
                     { sc: 'var(--os-accent)', sbg: 'rgba(14,113,172,.12)' }

  const realLeads = leads.filter(l => !isLikelySpam(l))
  const hiddenSpam = leads.length - realLeads.length
  const recentLeads = realLeads.slice(0, 5)
  const recentProposals = proposals.slice(0, 5)

  const leadAvatarColors = [
    'linear-gradient(150deg,var(--os-accent),#5BBCEE)',
    'linear-gradient(150deg,var(--os-bad),#2A98D6)',
    'linear-gradient(150deg,var(--os-good),var(--os-accent))',
    'linear-gradient(150deg,var(--os-warn),var(--os-bad))',
    'linear-gradient(150deg,var(--os-accent),var(--os-accent))',
  ]

  return (
    <>
      {}
      <div className="os-page-header">
        <div>
          <div className="os-page-title">Inicio</div>
          <div className="os-page-sub">Hola, José. Esto es lo que está pasando.</div>
        </div>
        <Link href="/admin/proposals/new" className="os-btn os-btn-primary">
          + Nueva propuesta
        </Link>
      </div>
      <SetupCard />

      {}
      <div className="os-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 22 }}>
        {statCards.map(s => (
          <div key={s.label} className="os-stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="os-stat-label">{s.label}</span>
              <span className="os-stat-icon" style={{ background: s.bg }}><OsIcon name={s.icon} size={14} /></span>
            </div>
            {}
            <div className={`os-stat-value${/[$€ƒ]/.test(String(s.value)) ? ' money' : ''}`}>{s.value}</div>
            <div className="os-stat-sub">{s.note}</div>
          </div>
        ))}
      </div>

      {}
      <div style={{ marginBottom: 22 }}>
        <ActionCenter deals={deals} invoices={invoices} proposals={proposals} />
      </div>

      {}
      <TrafficPanel compact />

      {}
      <div className="os-collapse" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 16 }}>

        {}
        <div className="os-card">
          <div className="os-card-header">
            <span className="os-card-title">Últimos leads</span>
            <Link href="/admin/contacts" className="os-btn os-btn-ghost os-btn-sm">Ver todo</Link>
          </div>
          {}
          {hiddenSpam > 0 && (
            <div style={{ padding: '8px 20px 0', fontSize: 11.5, color: 'var(--os-text-faint)' }}>
              {hiddenSpam} {hiddenSpam === 1 ? 'posible spam oculto' : 'posibles spam ocultos'}.{' '}
              <Link href="/admin/contacts" style={{ color: 'var(--os-accent)', fontWeight: 600 }}>Verlos</Link>
            </div>
          )}
          {recentLeads.length === 0 ? (
            <div style={{ padding: '32px 24px', color: 'var(--os-text-faint)', fontSize: 13, textAlign: 'center' }}>
              {hiddenSpam > 0
                ? 'Todo lo que ha llegado parece spam.'
                : 'Aún no hay leads. Los formularios de la web aparecerán aquí.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentLeads.map((lead, i) => {
                const initials = lead.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={lead.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < recentLeads.length - 1 ? '1px solid var(--os-line)' : 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: leadAvatarColors[i % leadAvatarColors.length], display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--font-sora), Sora, sans-serif', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        onClick={() => openContactPanel({ id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, source: lead.source, notes: lead.notes, createdAt: lead.createdAt, tags: (lead as Lead & { tags?: string[] }).tags })}
                        style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--os-text)', cursor: 'pointer' }}
                      >{lead.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--os-text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><EmailText email={lead.email} /></div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'rgba(14,113,172,.1)', color: 'var(--os-accent)' }}>
                      {lead.source || 'web'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {}
        <div className="os-card">
          <div className="os-card-header">
            <span className="os-card-title">Propuestas</span>
            <Link href="/admin/proposals" className="os-btn os-btn-ghost os-btn-sm">Ver todo</Link>
          </div>
          {recentProposals.length === 0 ? (
            <div style={{ padding: '32px 24px', color: 'var(--os-text-faint)', fontSize: 13, textAlign: 'center' }}>Aún no hay propuestas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '9px 20px', borderBottom: '1px solid var(--os-line)', background: 'var(--os-card-alt)' }}>
                <span style={{ fontFamily: 'var(--font-space-mono), Space Mono, monospace', fontSize: 10, color: 'var(--os-text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Client</span>
                <span style={{ fontFamily: 'var(--font-space-mono), Space Mono, monospace', fontSize: 10, color: 'var(--os-text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Total</span>
                <span style={{ fontFamily: 'var(--font-space-mono), Space Mono, monospace', fontSize: 10, color: 'var(--os-text-faint)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Status</span>
              </div>
              {recentProposals.map((p, i) => {
                const { sc, sbg } = stBadge(p.status)
                return (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center', padding: '12px 20px', borderBottom: i < recentProposals.length - 1 ? '1px solid var(--os-line)' : 'none' }}>
                    <div>
                      <div
                        onClick={() => openContactPanel({ id: p.id, name: p.clientName, email: p.clientEmail, company: p.clientCompany, createdAt: p.createdAt, kindLabel: 'Proposal' })}
                        style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--os-text)', cursor: 'pointer' }}
                      >{p.clientName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--os-text-faint)' }}>{p.ref}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-sora), Sora, sans-serif', fontWeight: 700, fontSize: 13.5, color: 'var(--os-text)', whiteSpace: 'nowrap' }}>
                      {fmt(p.total)}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: sbg, color: sc, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {p.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
