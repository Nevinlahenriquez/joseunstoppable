'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getLeads, getDeals, saveLead, updateLead, deleteLead, deleteDeal, hydrateFromSupabase } from '@/lib/crm-store'
import { getAttendees, updateAttendee, removeAttendee } from '@/lib/event-store'
import type { Lead, Deal, LeadStatus } from '@/lib/crm-types'
import type { EventAttendee } from '@/lib/event-types'
import { CONTACT_STATUSES } from '@/lib/crm-types'
import { PRESET_TAGS } from '../deals/crm-shared'
import { guessCountry } from '@/lib/country-codes'
import ContactCard, { type ContactCardContact } from '@/components/ContactCard'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { isLikelySpam } from '@/lib/apply-guard'
import { getPeople, PERSON_STATES, stateMeta, type Person, type PersonState } from '@/lib/people'
import { EmailText } from '@/components/os/CopyEmail'
import { StateChips, useIsNarrow, initialsOf, avatarBgOf } from '@/components/os/PersonBits'

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  website?: string
  source: string
  status: string
  notes?: string
  createdAt: string
  tags?: string[]
  _type: 'lead' | 'deal' | 'attendee'
  _deal?: Deal
  _attendeeId?: string

  _country?: string
  _companyType?: string
  _lastContacted: string
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
}

function avatar(name: string) {
  const colors = ['var(--os-accent)', 'var(--os-good)', 'var(--os-warn)', 'var(--os-bad)', 'var(--os-accent)', '#db2777']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

function statusMeta(v: string) {
  return CONTACT_STATUSES.find(s => s.value === v)
    ?? { value: v, label: v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : '—', color: 'var(--os-text-faint)', bg: 'var(--os-line)' }
}

function companyTypeOf(tags?: string[]): string | undefined {
  return tags?.find(t => (PRESET_TAGS as readonly string[]).includes(t))
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  if (d < 30) return `hace ${d} d`
  if (d < 365) return `hace ${Math.floor(d / 30)} meses`
  return `hace ${Math.floor(d / 365)} años`
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim()
    })
    return row
  }).filter(r => Object.values(r).some(v => v))
}

function mapCSVRow(row: Record<string, string>) {
  const get = (...keys: string[]) => keys.map(k => row[k]).find(v => v) ?? ''
  return {
    name: get('name', 'full name', 'fullname', 'first name', 'firstname', 'naam', 'nombre', 'client full name', 'organization', 'business name'),
    email: get('email', 'e-mail', 'emailaddress', 'email address', 'email (pattern/known)'),
    phone: get('phone', 'tel', 'telephone', 'whatsapp', 'mobile', 'mobile number', 'cel', 'telefoon'),
    company: get('company', 'company name', 'business', 'business name', 'organization', 'organisation', 'bedrijf', 'empresa'),
    website: get('website', 'website url', 'company website', 'url', 'site'),
    role: get('role', 'job title', 'title', 'position', 'key contact (role)'),
    status: get('status', 'lifecycle', 'stage'),
    location: get('location', 'island', 'country', 'city', 'region'),
    value: get('value', 'amount', 'monthly retainer', 'lifetime', 'retainer'),
    tags: get('tags', 'tag', 'segment', 'sector'),
    source: get('source', 'origin'),
    notes: get('notes', 'note', 'message', 'comments', 'remarks', 'company insight for outreach', 'ai opportunity'),
  }
}

function CSVImportModal({ onClose, onImported }: { onClose: () => void; onImported: (n: number) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ReturnType<typeof mapCSVRow>[]>([])
  const [tag, setTag] = useState('')
  const [source, setSource] = useState('Masterclass')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(0)
  const [error, setError] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  function handleFile(f: File) {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target?.result as string)
      setRows(parsed.map(mapCSVRow).filter(r => r.name || r.email))
    }
    reader.readAsText(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) handleFile(f)
  }

  async function doImport() {
    if (!rows.length) return
    setImporting(true)
    setError('')
    const batchTags = [source, tag].filter(Boolean)

    const STATUS_MAP: Record<string, string> = { prospect: 'opportunity', lead: 'new', customer: 'client', won: 'client', active: 'client' }

    const contacts = rows.map(r => {
      const extra = [
        r.website ? `Web: ${r.website}` : '',
        r.role ? `Cargo: ${r.role}` : '',
        r.location ? `Ubicación: ${r.location}` : '',
        r.value ? `Valor: ${r.value}` : '',
      ].filter(Boolean).join(' | ')
      const notes = [extra, r.notes].filter(Boolean).join('\n')
      const rowTags = r.tags ? r.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean) : []
      const st = (r.status || '').trim().toLowerCase()
      return {
        name: r.name, email: r.email, phone: r.phone, company: r.company, notes,
        status: STATUS_MAP[st] || st || undefined,
        tags: rowTags,
        source: r.source ? r.source.toLowerCase().replace(/\s+/g, '-') : undefined,
      }
    })
    try {
      const res = await fetch('/api/import-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts, tags: batchTags, source: source.toLowerCase().replace(/\s+/g, '-') }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'La importación falló'); setImporting(false); return }
      setDone(data.imported)
      onImported(data.imported)
    } catch {
      setError('Error de red, inténtalo de nuevo')
    }
    setImporting(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--os-text)' }}>Importar contactos</div>
            <div style={{ fontSize: 13, color: 'var(--os-text-faint)', marginTop: 2 }}>CSV con columnas de nombre, email, teléfono y empresa</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'var(--os-line)', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--os-text-faint)' }}>✕</button>
        </div>

        {done > 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--os-good)', marginBottom: 8 }}>{done} contacts imported</div>
            <div style={{ fontSize: 14, color: 'var(--os-text-faint)', marginBottom: 24 }}>Ya están en tu lista de contactos</div>
            <button onClick={onClose} className="os-btn os-btn-primary">Listo</button>
          </div>
        ) : (
          <>
            {}
            <div
              ref={dropRef}
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => document.getElementById('csv-file-input')?.click()}
              style={{ border: '2px dashed #c4b5fd', borderRadius: 14, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--os-line)', marginBottom: 20, transition: 'border-color .15s' }}
            >
              <i className="ti ti-upload" style={{ fontSize: 28, color: 'var(--os-accent)', display: 'block', marginBottom: 10 }} />
              {file ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--os-text)' }}>{file.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--os-accent)', marginTop: 4 }}>{rows.length} contacts detected</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--os-accent)' }}>Suelta el CSV aquí o haz clic para elegirlo</div>
                  <div style={{ fontSize: 12, color: 'var(--os-text-faint)', marginTop: 4 }}>Acepta: nombre, email, teléfono, empresa, notas</div>
                </div>
              )}
              <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>

            {}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label className="os-label">Origen / evento</label>
                <input className="os-input" value={source} onChange={e => setSource(e.target.value)} placeholder="Masterclass, nombre del evento..." />
              </div>
              <div>
                <label className="os-label">Etiqueta (opcional)</label>
                <input className="os-input" value={tag} onChange={e => setTag(e.target.value)} placeholder="Masterclass, VIP..." />
              </div>
            </div>

            {}
            {rows.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-text-faint)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Vista previa, primeras 3 filas</div>
                <div style={{ border: '1px solid var(--os-line)', borderRadius: 10, overflow: 'hidden' }}>
                  {rows.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderBottom: i < 2 ? '1px solid var(--os-line)' : 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatar(r.name || r.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {initials(r.name || r.email)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--os-text)' }}>{r.name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--os-text-faint)' }}><EmailText email={r.email} />{r.phone ? ` · ${r.phone}` : ''}</div>
                      </div>
                    </div>
                  ))}
                  {rows.length > 3 && (
                    <div style={{ padding: '8px 14px', background: 'var(--os-line)', fontSize: 12, color: 'var(--os-accent)', fontWeight: 600 }}>
                      + {rows.length - 3} more contacts
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && <div style={{ background: 'var(--os-bad-soft)', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--os-bad)', marginBottom: 16 }}>{error}</div>}

            <button
              onClick={doImport}
              disabled={!rows.length || importing}
              className="os-btn os-btn-primary"
              style={{ width: '100%', justifyContent: 'center', opacity: (!rows.length || importing) ? 0.5 : 1 }}
            >
              {importing ? 'Importando...' : `Importar ${rows.length} contactos`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const EMPTY = { name: '', email: '', phone: '', company: '', source: 'manual', status: 'new', notes: '', tags: '' }

function ContactModal({ contact, onClose, onSaved }: { contact?: Lead; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(contact
    ? { name: contact.name, email: contact.email, phone: contact.phone ?? '', company: contact.company ?? '', source: contact.source, status: contact.status, notes: contact.notes ?? '', tags: (contact as Lead & { tags?: string[] }).tags?.join(', ') ?? '' }
    : EMPTY
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    if (contact) {
      updateLead(contact.id, { ...form, tags } as Partial<Lead>)
    } else {
      saveLead({ ...form, tags } as Parameters<typeof saveLead>[0])
    }
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--os-text)' }}>{contact ? 'Editar contacto' : 'Nuevo contacto'}</div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'var(--os-line)', borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--os-text-faint)' }}>✕</button>
        </div>
        <form className="os-form" onSubmit={submit}>
          <div className="os-form-row">
            <div className="os-form-group">
              <label className="os-label">Nombre completo *</label>
              <input className="os-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Juan Pérez" />
            </div>
            <div className="os-form-group">
              <label className="os-label">Email</label>
              <input className="os-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" />
            </div>
          </div>
          <div className="os-form-row">
            <div className="os-form-group">
              <label className="os-label">WhatsApp / teléfono</label>
              <input className="os-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder=" xxx xxxx" />
            </div>
            <div className="os-form-group">
              <label className="os-label">Empresa</label>
              <input className="os-input" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
          </div>
          <div className="os-form-group">
            <label className="os-label">Estado</label>
            <select className="os-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="os-form-row">
            <div className="os-form-group">
              <label className="os-label">Origen</label>
              <select className="os-select" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                <option value="manual">Manual</option>
                <option value="workshop">Masterclass</option>
                <option value="referral">Referido</option>
                <option value="web-form">Formulario web</option>
                <option value="social">Redes sociales</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="csv-import">Importación CSV</option>
              </select>
            </div>
            <div className="os-form-group">
              <label className="os-label">Etiquetas (separadas por comas)</label>
              <input className="os-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Masterclass, Coaching, VIP..." />
            </div>
          </div>
          <div className="os-form-group">
            <label className="os-label">Notas</label>
            <textarea className="os-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="¿Qué necesita? ¿En qué punto está?" />
          </div>
          <button type="submit" className="os-btn os-btn-primary">{contact ? 'Guardar cambios' : 'Añadir contacto'}</button>
        </form>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [search, setSearch] = useState('')

  const [stateFilter, setStateFilter] = useState<'all' | PersonState>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('all')
  const [lastContactedFilter, setLastContactedFilter] = useState<string>('all')
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editContact, setEditContact] = useState<Lead | undefined>()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importCount, setImportCount] = useState(0)
  const [cardContact, setCardContact] = useState<ContactCardContact | null>(null)
  const narrow = useIsNarrow()

  const readLocal = useCallback(() => setPeople(getPeople({ includeSpam: true })), [])
  const reload = useCallback(async () => {
    readLocal()
    await hydrateFromSupabase()
    readLocal()
  }, [readLocal])

  useEffect(() => {
    reload()
    window.addEventListener('ju:hydrated', readLocal)
    return () => window.removeEventListener('ju:hydrated', readLocal)
  }, [reload, readLocal])

  const rows = useMemo(() => people.map(p => ({
    ...p,
    _country: guessCountry(p.phone)?.name,
    _companyType: companyTypeOf(p.tags),
  })), [people])
  type Row = typeof rows[number]

  const visible = rows.filter(r => !r.spam)
  const spamCount = rows.length - visible.length

  const allTags = Array.from(new Set(rows.flatMap(r => r.tags))).sort()

  const allCountries = Array.from(new Set(rows.map(r => r._country).filter((v): v is string => Boolean(v)))).sort()
  const allCompanyTypes = Array.from(new Set(rows.map(r => r._companyType).filter((v): v is string => Boolean(v)))).sort()
  const selectStyle: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid var(--os-line)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--os-text)', background: 'var(--os-card)', cursor: 'pointer', fontFamily: 'inherit' }

  const LAST_CONTACTED_BUCKETS: Record<string, (days: number) => boolean> = {
    '7d': days => days <= 7,
    '30d': days => days <= 30,
    'stale': days => days > 30,
  }

  const filtered = rows.filter(r => {

    if (stateFilter === 'spam') { if (!r.spam) return false }
    else if (r.spam) return false
    else if (stateFilter !== 'all' && !r.states.includes(stateFilter)) return false
    if (tagFilter !== 'all' && !r.tags.includes(tagFilter)) return false
    if (countryFilter !== 'all' && r._country !== countryFilter) return false
    if (companyTypeFilter !== 'all' && r._companyType !== companyTypeFilter) return false
    if (lastContactedFilter !== 'all') {
      const days = Math.floor((Date.now() - new Date(r.lastSeen).getTime()) / 86400000)
      if (!LAST_CONTACTED_BUCKETS[lastContactedFilter]?.(days)) return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return [r.name, r.email, r.company, r.website, r.phone, ...r.tags, ...r.events]
      .filter(Boolean).some(v => v.toLowerCase().includes(q))
  })

  function toggleSelect(key: string) {
    setSelected(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }
  function selectAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(r => r.key)))
  }

  function openRow(r: Row) {

    setCardContact({
      id: r.dealId ?? r.leadId ?? r.attendeeId ?? r.key,
      name: r.name, email: r.email, phone: r.phone, company: r.company,
      tags: r.tags, createdAt: r.firstSeen,
    })
  }

  function exportCSV(onlySelected = false) {
    const source = onlySelected ? filtered.filter(r => selected.has(r.key)) : filtered
    const rowsOut = [
      ['Nombre', 'Email', 'Teléfono', 'Empresa', 'Web', 'Estados', 'Etiquetas', 'Eventos', 'Primera vez', 'Última vez'],
      ...source.map(r => [
        r.name, r.email, r.phone, r.company, r.website,
        r.states.map(st => stateMeta(st).label).join('; '),
        r.tags.join('; '), r.events.join('; '),
        r.firstSeen.slice(0, 10), r.lastSeen.slice(0, 10),
      ]),
    ]
    const csv = rowsOut.map(r => r.map(v => `"${(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'contactos.csv'
    a.click()
  }

  async function sendBulkWhatsApp() {
    const targets = filtered.filter(r => selected.has(r.key) && r.phone)
    if (!targets.length) { await confirmAction({ message: 'No hay teléfonos seleccionados.', detail: 'Selecciona al menos un contacto con teléfono.', confirmLabel: 'OK', cancelLabel: 'Cerrar', destructive: false }); return }

    window.open(`https://wa.me/${targets[0].phone.replace(/[^0-9]/g, '')}`, '_blank')
  }

  function deletePeople(keys: string[]) {
    const byKey = new Map(rows.map(r => [r.key, r]))
    const emails = new Set<string>()
    for (const k of keys) {
      const r = byKey.get(k)
      if (!r) continue
      if (r.email) emails.add(r.email.trim().toLowerCase())
      if (r.attendeeId) removeAttendee(r.attendeeId)
      if (r.dealId) deleteDeal(r.dealId)
      if (r.leadId) deleteLead(r.leadId)
    }
    if (emails.size) {
      getDeals().filter(d => emails.has((d.clientEmail ?? '').trim().toLowerCase())).forEach(d => deleteDeal(d.id))
      getLeads().filter(l => emails.has((l.email ?? '').trim().toLowerCase())).forEach(l => deleteLead(l.id))
      getAttendees().filter(a => emails.has((a.email ?? '').trim().toLowerCase())).forEach(a => removeAttendee(a.id))
    }
    setSelected(new Set())
    reload()
  }

  async function deleteAllSpam() {
    const keys = rows.filter(r => r.spam).map(r => r.key)
    if (!keys.length) return
    const names = rows.filter(r => r.spam).slice(0, 6).map(r => r.name || r.email).join(', ')
    if (!(await confirmAction({
      message: `¿Eliminar ${keys.length} ${keys.length > 1 ? 'contactos que parecen spam' : 'contacto que parece spam'}?`,
      detail: `${names}${keys.length > 6 ? ` y ${keys.length - 6} más` : ''}. También se borran sus tarjetas del pipeline y sus inscripciones a eventos. No se puede deshacer.`,
      confirmLabel: `Eliminar ${keys.length}`,
    }))) return
    deletePeople(keys)
    setStateFilter('all')
  }

  async function bulkDelete() {
    const keys = filtered.filter(r => selected.has(r.key)).map(r => r.key)
    if (!keys.length) return
    if (!(await confirmAction({ message: `¿Eliminar ${keys.length} ${keys.length > 1 ? 'contactos' : 'contacto'}?`, detail: 'Se borran todos los registros donde aparecen. No se puede deshacer.' }))) return
    deletePeople(keys)
  }

  const hasSelection = selected.size > 0
  const tabs: { key: 'all' | PersonState; label: string; n: number }[] = [
    { key: 'all', label: 'Todos', n: visible.length },
    ...PERSON_STATES.filter(st => st.value !== 'spam').map(st => ({
      key: st.value, label: st.label, n: visible.filter(r => r.states.includes(st.value)).length,
    })),
    { key: 'spam' as const, label: 'Posible spam', n: spamCount },
  ]

  return (
    <>
      <div className="os-page-header">
        <div>
          <div className="os-page-title">Contactos</div>
          <div className="os-page-sub">
            {visible.length} {visible.length === 1 ? 'persona' : 'personas'}
            {spamCount > 0 && ` · ${spamCount} filtrados como spam`}
            {importCount > 0 && ` · ${importCount} importados`}
          </div>
        </div>
        <div className="os-page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="os-btn os-btn-ghost" onClick={() => setShowImport(true)}>
            <i className="ti ti-upload" /> Importar CSV
          </button>
          <button className="os-btn os-btn-primary" onClick={() => { setEditContact(undefined); setShowAdd(true) }}>
            <i className="ti ti-plus" /> Añadir contacto
          </button>
        </div>
      </div>

      {}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.filter(t => t.n > 0 || t.key === 'all').map(t => {
          const on = stateFilter === t.key
          const bad = t.key === 'spam'
          return (
            <button key={t.key} type="button" onClick={() => setStateFilter(t.key)}
              style={{
                padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                border: `1.5px solid ${on ? (bad ? 'var(--os-bad)' : 'var(--os-accent)') : 'var(--os-line)'}`,
                background: on ? (bad ? 'var(--os-bad)' : 'var(--os-accent)') : 'transparent',
                color: on ? '#fff' : bad ? 'var(--os-bad)' : 'var(--os-text-muted)',
              }}>
              {t.label} <span style={{ opacity: on ? .85 : .6, fontWeight: 800 }}>{t.n}</span>
            </button>
          )
        })}
        {stateFilter === 'spam' && spamCount > 0 && (
          <button type="button" className="os-btn os-btn-sm" onClick={deleteAllSpam}
            style={{ marginLeft: 'auto', background: 'var(--os-bad)', color: '#fff', border: 'none' }}>
            Eliminar los {spamCount} posibles spam
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--os-text-faint)', fontSize: 15 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, email, empresa, evento..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid var(--os-line)', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--os-text)', background: 'var(--os-card)' }}
          />
        </div>
        {allCountries.length > 0 && (
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} style={selectStyle}>
            <option value="all">Todos los países</option>
            {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {allCompanyTypes.length > 0 && (
          <select value={companyTypeFilter} onChange={e => setCompanyTypeFilter(e.target.value)} style={selectStyle}>
            <option value="all">Todos los tipos de empresa</option>
            {allCompanyTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={lastContactedFilter} onChange={e => setLastContactedFilter(e.target.value)} style={selectStyle}>
          <option value="all">Cualquier fecha</option>
          <option value="7d">Activos en los últimos 7 días</option>
          <option value="30d">Activos en los últimos 30 días</option>
          <option value="stale">Sin actividad en 30+ días</option>
        </select>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['all', ...allTags]).map(t => (
              <button key={t} onClick={() => setTagFilter(t)}
                style={{ padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12, background: tagFilter === t ? 'var(--os-accent)' : 'var(--os-card)', color: tagFilter === t ? '#fff' : 'var(--os-text-muted)', border: tagFilter === t ? 'none' : '1px solid var(--os-line)' }}>
                {t === 'all' ? 'Todas las etiquetas' : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSelection && (
        <div style={{ background: 'var(--os-line)', border: '1px solid #c4b5fd', borderRadius: 12, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--os-accent)' }}>{selected.size} selected</span>
          <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => exportCSV(true)}><i className="ti ti-download" /> Exportar selección</button>
          <button className="os-btn os-btn-ghost os-btn-sm" onClick={sendBulkWhatsApp} title="WhatsApp no permite envíos masivos. Esto abre un chat con el primer contacto seleccionado."><i className="ti ti-brand-whatsapp" /> WhatsApp al primero</button>
          <button className="os-btn os-btn-ghost os-btn-sm" style={{ color: '#e53e3e', borderColor: 'rgba(229,62,62,.35)' }} onClick={bulkDelete}><i className="ti ti-trash" /> Delete {selected.size}</button>
          <button className="os-btn os-btn-ghost os-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Limpiar</button>
        </div>
      )}

      <div className="os-card os-people-cards" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="os-empty">
            <i className="ti ti-users" />
            <div className="os-empty-title">{search || stateFilter !== 'all' || tagFilter !== 'all' ? 'Nadie coincide' : 'Aún no hay contactos'}</div>
            <div className="os-empty-sub">Importa un CSV o añade contactos a mano para empezar</div>
          </div>
        ) : narrow ? (

          <div>
            {filtered.map(r => (
              <div key={r.key} role="button" tabIndex={0} className="os-pcard"
                onClick={() => openRow(r)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRow(r) } }}>
                <div className="os-pcard-top">
                  <div className="os-pcard-av" style={{ background: avatarBgOf(r.name || r.email) }}>{initialsOf(r.name || r.email)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="os-pcard-name">{r.name || r.email || 'Sin nombre'}</div>
                    {r.company && <div className="os-pcard-sub">{r.company}</div>}
                  </div>
                </div>
                {r.states.length > 0 && (
                  <div className="os-pcard-states"><StateChips states={r.states} max={4} /></div>
                )}
                <div className="os-pcard-meta" onClick={e => e.stopPropagation()}>
                  {r.email && <EmailText email={r.email} style={{ maxWidth: '100%' }} />}
                  {r.phone && <a href={`tel:${r.phone}`}>{r.phone}</a>}
                  {r.lastSeen && <span style={{ color: 'var(--os-text-faint)' }}>{timeAgo(r.lastSeen)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="os-client-table-wrap">
            <table className="os-table os-client-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  <th>Contacto</th>
                  <th>Estados</th>
                  <th>Empresa</th>
                  <th>Teléfono</th>
                  <th>Etiquetas</th>
                  <th>Última actividad</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.key} style={{ background: selected.has(r.key) ? 'var(--os-line)' : undefined, cursor: 'pointer' }} onClick={() => openRow(r)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggleSelect(r.key)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: 220 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatar(r.name || r.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {initials(r.name || r.email)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--os-text)', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>{r.name || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>
                            {r.email ? <EmailText email={r.email} style={{ maxWidth: 178 }} /> : <span>Sin email</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {}
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 240 }}>
                        {r.states.length ? <StateChips states={r.states} max={4} /> : <span style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--os-text-muted)' }}>
                      <span style={{ display: 'block', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.company}>{r.company || '—'}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--os-text-muted)', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      {r.phone ? <a href={`tel:${r.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{r.phone}</a> : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 130 }}>
                        {r.tags.slice(0, 2).map(t => (
                          <span key={t} title={t} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, background: 'var(--os-chip)', color: 'var(--os-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{t}</span>
                        ))}
                        {r.tags.length > 2 && <span style={{ fontSize: 10.5, color: 'var(--os-text-faint)', fontWeight: 700 }}>+{r.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--os-text-faint)', whiteSpace: 'nowrap' }}>{r.lastSeen ? timeAgo(r.lastSeen) : '—'}</td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.email && (
                        <a className="os-btn os-btn-ghost os-btn-sm" href={`mailto:${r.email}`} title="Email"><i className="ti ti-mail" /></a>
                      )}
                      <button className="os-btn os-btn-ghost os-btn-sm" style={{ color: '#e53e3e' }} title="Eliminar"
                        onClick={async () => { if (await confirmAction({ message: `¿Eliminar a ${r.name || r.email}?`, detail: 'Se borran todos los registros donde aparece. No se puede deshacer.' })) deletePeople([r.key]) }}>
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="os-btn os-btn-ghost os-btn-sm" onClick={() => exportCSV()}>
            <i className="ti ti-download" /> Export {filtered.length}
          </button>
        </div>
      )}

      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onImported={n => { setImportCount(c => c + n); reload() }}
        />
      )}

      {showAdd && (
        <ContactModal
          contact={editContact}
          onClose={() => { setShowAdd(false); setEditContact(undefined) }}
          onSaved={reload}
        />
      )}

      <ContactCard contact={cardContact} onClose={() => setCardContact(null)} />
    </>
  )
}
