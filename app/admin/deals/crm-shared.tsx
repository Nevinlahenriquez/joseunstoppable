'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Deal, DealStage, ActivityType, ActivityEntry } from '@/lib/crm-types'
import { GOAL_LABELS } from '@/lib/goals'

export type Stage = { key: string; label: string; color: string }

export const DEFAULT_STAGES: Stage[] = [
  { key: 'lead', label: 'Nuevo lead', color: 'var(--os-bad)' },
  { key: 'contacted', label: 'Contactado', color: '#f97316' },
  { key: 'discovery', label: 'Llamada hecha', color: 'var(--os-warn)' },
  { key: 'proposal_sent', label: 'Propuesta enviada', color: 'var(--os-accent)' },
  { key: 'negotiation', label: 'Decidiendo', color: '#5BBCEE' },
  { key: 'signed', label: 'Firmado ✓', color: '#14b8a6' },
]

// Stages saved before the dashboard was in Spanish keep their English names;
// those untouched defaults are shown in Spanish, renamed ones stay as written.
const OLD_LABELS: Record<string, string> = {
  'New Lead': 'Nuevo lead', Contacted: 'Contactado', Discovery: 'Llamada hecha',
  'Proposal Sent': 'Propuesta enviada', Negotiation: 'Decidiendo', 'Signed ✓': 'Firmado ✓',
}

const STAGES_KEY = 'ju_stages'

const STAGES_VERSION = 3

export function getStages(): Stage[] {
  if (typeof localStorage === 'undefined') return DEFAULT_STAGES
  try {
    const raw = localStorage.getItem(STAGES_KEY)
    if (!raw) return DEFAULT_STAGES
    const parsed = JSON.parse(raw)

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.v === STAGES_VERSION
      && Array.isArray(parsed.stages) && parsed.stages.length
      && parsed.stages.every((s: Stage) => s.key && s.label && s.color)) {
      return (parsed.stages as Stage[]).map(st => OLD_LABELS[st.label] ? { ...st, label: OLD_LABELS[st.label] } : st)
    }
  } catch {  }
  return DEFAULT_STAGES
}

export function saveStages(stages: Stage[]): void {
  try { localStorage.setItem(STAGES_KEY, JSON.stringify({ v: STAGES_VERSION, stages })) } catch {  }
}

export function stageSlug(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('stage_' + Date.now().toString(36))
}

export const STAGES: Stage[] = DEFAULT_STAGES

// The tags José picks from are his clients' goals (also set automatically from their answers).
export const PRESET_TAGS = GOAL_LABELS

export const PRIORITY_COLOR: Record<NonNullable<Deal['priority']>, string> = {
  low: '#cbd5e1', medium: 'var(--os-warn)', high: 'var(--os-bad)',
}

export const ACTIVITY_ICON: Record<ActivityType, string> = {
  note: 'ti-note', call: 'ti-phone', email: 'ti-mail', meeting: 'ti-calendar-event', stage: 'ti-arrow-right', whatsapp: 'ti-brand-whatsapp',
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  note: 'Nota', call: 'Llamada', email: 'Email', meeting: 'Reunión', stage: 'Etapa', whatsapp: 'WhatsApp',
}

export function genId(prefix: string): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function fmtTs(ts: string): string {
  return new Date(ts).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const CLOSED_STAGES = new Set(['signed', 'active', 'completed', 'lost'])
export const STALE_HOURS = 48
export const WARN_HOURS = 24

export function isOpenStage(stage: DealStage): boolean {
  return !CLOSED_STAGES.has(stage)
}

function ts(value: unknown): number {
  const t = new Date(String(value ?? '')).getTime()
  return Number.isFinite(t) ? t : NaN
}

export function lastTouchTs(deal: Deal): number {
  const touched = ts(deal.activity?.[0]?.ts)
  if (Number.isFinite(touched)) return touched
  const created = ts(deal.createdAt)
  return Number.isFinite(created) ? created : Date.now()
}

export function hoursSinceContact(deal: Deal): number {
  return (Date.now() - lastTouchTs(deal)) / 3600000
}

export function hoursSinceCreated(deal: Deal): number {
  const created = ts(deal.createdAt)
  return (Date.now() - (Number.isFinite(created) ? created : Date.now())) / 3600000
}

export function hasBeenContacted(deal: Deal): boolean {
  return (deal.activity?.length ?? 0) > 0
}

export function recentlyLogged(deal: Deal, type: ActivityType, withinMs = 60000): boolean {
  const a = deal.activity?.[0]
  if (!a || a.type !== type) return false
  return Date.now() - new Date(a.ts).getTime() < withinMs
}

export function isStale(deal: Deal): boolean {
  return isOpenStage(deal.stage) && hoursSinceContact(deal) >= STALE_HOURS
}

function fmtElapsed(hours: number): string {

  if (!Number.isFinite(hours) || hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h`
  return `${Math.floor(hours / 24)}d`
}

export function ContactTimer({ deal, style }: { deal: Deal; style?: CSSProperties }) {
  if (!isOpenStage(deal.stage)) return null
  const hrs = hoursSinceContact(deal)
  const contacted = hasBeenContacted(deal)
  const stale = hrs >= STALE_HOURS
  const warn = !stale && hrs >= WARN_HOURS
  const color = stale ? 'var(--os-bad)' : warn ? 'var(--os-warn)' : 'var(--os-good)'
  const bg = stale ? 'var(--os-bad-soft)' : warn ? 'var(--os-warn-soft)' : 'var(--os-good-soft)'
  return (
    <span
      title={contacted ? 'Tiempo desde la última acción' : 'Sin acción todavía: tiempo desde que entró'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: bg, color, whiteSpace: 'nowrap', ...style }}
    >
      <i className={`ti ${stale ? 'ti-alarm-filled' : 'ti-clock'}`} style={{ fontSize: 12 }} />
      {fmtElapsed(hrs)}{contacted ? '' : ' nuevo'}
    </span>
  )
}

export function LeadAge({ deal, style }: { deal: Deal; style?: CSSProperties }) {
  const hrs = hoursSinceCreated(deal)
  const since = new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <span
      title={`In the pipeline since ${since}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#EEF4F9', color: '#5D6E7E', whiteSpace: 'nowrap', ...style }}
    >
      <i className="ti ti-hourglass" style={{ fontSize: 12 }} />
      {fmtElapsed(hrs)}
    </span>
  )
}

export function LeadTimers({ deal, style }: { deal: Deal; style?: CSSProperties }) {
  const open = isOpenStage(deal.stage)
  const label: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--os-text-faint)' }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', ...style }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <span style={label}>En el pipeline</span>
        <LeadAge deal={deal} />
      </span>
      {open && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={label}>Desde la última acción</span>
          <ContactTimer deal={deal} />
        </span>
      )}
    </div>
  )
}

function digits(s?: string): string {
  return (s ?? '').replace(/[^\d]/g, '')
}

export function QuickActions({ deal, onLog }: { deal: Deal; onLog?: (type: ActivityType, text: string) => void }) {
  const wa = digits(deal.clientPhone)
  const log = (type: ActivityType, text: string) => {
    if (onLog && !recentlyLogged(deal, type)) onLog(type, text)
  }
  return (
    <div className="os-crm-actions">
      {wa && (
        <a className="os-crm-action os-crm-action-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" onClick={() => log('whatsapp', 'Escrito por WhatsApp')}>
          <i className="ti ti-brand-whatsapp" /> WhatsApp
        </a>
      )}
      {deal.clientPhone && (
        <a className="os-crm-action os-crm-action-dark" href={`tel:${deal.clientPhone}`} onClick={() => log('call', 'Llamada')}><i className="ti ti-phone" /> Llamar</a>
      )}
      {deal.clientEmail && (
        <a className="os-crm-action os-crm-action-dark" href={`mailto:${deal.clientEmail}`} onClick={() => log('email', 'Email enviado')}><i className="ti ti-mail" /> Email</a>
      )}
    </div>
  )
}

export function ProcessStepper({ stage, onPick, stages }: { stage: DealStage; onPick: (s: DealStage) => void; stages?: Stage[] }) {
  const list = stages ?? getStages()
  const idx = list.findIndex(s => s.key === stage)
  return (
    <div className="os-stepper">
      {list.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'todo'
        return (
          <button key={s.key} className={`os-step os-step-${state}`} onClick={() => onPick(s.key)} title={s.label}>
            <span className="os-step-dot" style={state !== 'todo' ? { background: s.color, borderColor: s.color, color: '#fff' } : undefined}>
              {state === 'done' ? <i className="ti ti-check" /> : i + 1}
            </span>
            <span className="os-step-label">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

type DetailProps = {
  deal: Deal
  layout: 'drawer' | 'page'
  onPatch: (p: Partial<Deal>) => void
  onAddActivity: (type: ActivityType, text: string) => void
}

export function CrmDetail({ deal, layout, onPatch, onAddActivity }: DetailProps) {
  const [draft, setDraft] = useState<Deal>(deal)
  const [composer, setComposer] = useState('')
  const [composerType, setComposerType] = useState<ActivityType>('note')

  useEffect(() => { setDraft(deal) }, [deal])

  const set = <K extends keyof Deal>(key: K, value: Deal[K]) => setDraft(d => ({ ...d, [key]: value }))
  const save = <K extends keyof Deal>(key: K) => { if (draft[key] !== deal[key]) onPatch({ [key]: draft[key] } as Partial<Deal>) }

  function submitActivity() {
    const text = composer.trim()
    if (!text) return
    onAddActivity(composerType, text)
    setComposer('')
  }

  function toggleTag(tag: string) {
    const tags = new Set(deal.tags ?? [])
    if (tags.has(tag)) tags.delete(tag); else tags.add(tag)
    onPatch({ tags: [...tags] })
  }

  const field = (label: string, key: keyof Deal, opts?: { type?: string; placeholder?: string; area?: boolean }) => (
    <div className="os-crm-field">
      <label>{label}</label>
      {opts?.area ? (
        <textarea className="os-crm-textarea" placeholder={opts?.placeholder} value={(draft[key] as string) ?? ''}
          onChange={e => set(key, e.target.value as Deal[typeof key])} onBlur={() => save(key)} />
      ) : (
        <input className="os-crm-input" type={opts?.type ?? 'text'} placeholder={opts?.placeholder}
          value={(draft[key] as string | number) ?? ''}
          onChange={e => set(key, (opts?.type === 'number' ? Number(e.target.value) : e.target.value) as Deal[typeof key])}
          onBlur={() => save(key)} />
      )}
    </div>
  )

  const profile = (
    <>
      <div className="os-crm-section">
        <div className="os-crm-section-title">Objetivos</div>
        <div className="os-crm-tags">
          {PRESET_TAGS.map(t => (
            <button key={t} className={`os-tag-chip${(deal.tags ?? []).includes(t) ? ' active' : ''}`} onClick={() => toggleTag(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="os-crm-section">
        <div className="os-crm-section-title">Contacto</div>
        {field('Email', 'clientEmail', { type: 'email', placeholder: 'nombre@email.com' })}
        {field('WhatsApp', 'clientPhone', { type: 'tel', placeholder: '+34 600 000 000' })}
        {field('Instagram', 'instagram', { placeholder: '@usuario' })}
        {field('Ciudad', 'location', { placeholder: 'Madrid' })}
      </div>

      <div className="os-crm-section">
        <div className="os-crm-section-title">Venta</div>
        <div className="os-crm-row">
          <div style={{ flex: 1 }}>{field('Valor (€)', 'value', { type: 'number' })}</div>
          <div className="os-crm-field" style={{ flex: 1 }}>
            <label>Tipo de pago</label>
            <select className="os-crm-input" value={draft.revenueType ?? 'one_time'}
              onChange={e => { set('revenueType', e.target.value as Deal['revenueType']); onPatch({ revenueType: e.target.value as Deal['revenueType'] }) }}>
              <option value="one_time">Pago único</option>
              <option value="mrr">Mensual</option>
            </select>
          </div>
        </div>
        <div className="os-crm-row">
          <div style={{ flex: 2 }}>{field('Programa', 'service', { placeholder: 'Programa 12 semanas' })}</div>
          {draft.revenueType === 'mrr' && <div style={{ flex: 1 }}>{field('Meses', 'retainerMonths', { type: 'number' })}</div>}
        </div>
        <div className="os-crm-row">
          <div style={{ flex: 2 }}>{field('Siguiente paso', 'nextStep', { placeholder: 'Llamarle, mandar propuesta…' })}</div>
          <div style={{ flex: 1 }}>{field('Para el', 'nextStepDate', { type: 'date' })}</div>
        </div>
        <div className="os-crm-row">
          <div style={{ flex: 1 }}>{field('Cierre previsto', 'closeDate', { type: 'date' })}</div>
          <div style={{ flex: 1 }}>{field('Presupuesto', 'budget', { placeholder: 'Aprox.' })}</div>
        </div>
      </div>

      <div className="os-crm-section">
        <div className="os-crm-section-title">Transformación</div>
        {field('Cómo está ahora', 'currentState', { area: true, placeholder: 'Peso, hábitos, qué no le funciona…' })}
        {field('Qué quiere conseguir', 'desiredOutcome', { area: true, placeholder: 'Cómo se ve en 12 semanas' })}
        {field('Objetivos concretos', 'goals', { area: true, placeholder: 'Kilos, medidas, fechas' })}
        {field('Frenos y salud', 'blockers', { area: true, placeholder: 'Lesiones, objeciones, falta de tiempo…' })}
        {field('Notas', 'notes', { area: true, placeholder: 'Cualquier otra cosa' })}
      </div>
    </>
  )

  const timeline = (
    <div>
      <div className="os-crm-section-title">Actividad</div>
      <div className="os-composer">
        <div className="os-composer-types">
          {(['note', 'call', 'whatsapp', 'email', 'meeting'] as ActivityType[]).map(t => (
            <button key={t} type="button" className={`os-composer-type${composerType === t ? ' active' : ''}`} onClick={() => setComposerType(t)}>
              <i className={`ti ${ACTIVITY_ICON[t]}`} style={{ fontSize: 11, marginRight: 4 }} />{ACTIVITY_LABEL[t]}
            </button>
          ))}
        </div>
        <textarea className="os-crm-textarea" placeholder="Apunta una nota o llamada… (⌘+Enter)" value={composer}
          onChange={e => setComposer(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitActivity() } }} />
        <button className="os-btn os-btn-primary os-btn-sm" onClick={submitActivity} style={{ alignSelf: 'flex-start' }}>
          <i className="ti ti-plus" /> Guardar
        </button>
      </div>
      <div className="os-timeline">
        {(deal.activity ?? []).length === 0 && (
          <div style={{ color: 'var(--os-text-muted)', fontSize: 13, padding: '12px 0' }}>Sin actividad todavía. Apunta la primera nota arriba.</div>
        )}
        {(deal.activity ?? []).map(a => (
          <div key={a.id} className="os-timeline-item">
            <div className="os-timeline-dot"><i className={`ti ${ACTIVITY_ICON[a.type]}`} /></div>
            <div>
              <div className="os-timeline-text">{a.text}</div>
              <div className="os-timeline-ts">{ACTIVITY_LABEL[a.type] ?? a.type} · {fmtTs(a.ts)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (layout === 'page') {
    return (
      <div className="os-crm-page-grid">
        <div>{profile}</div>
        <div>{timeline}</div>
      </div>
    )
  }
  return <>{profile}{timeline}</>
}
