'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getEvent, updateEvent, deleteEvent,
  getAttendees, addAttendee, updateAttendee, removeAttendee,
  updateAttendeeStatus, markPaid, markCheckedIn, exportAttendeesCSV,
  generateTicketCode, hydrateEventsDetailed,
} from '@/lib/event-store'
import { saveDeal, getDeals, getInvoices } from '@/lib/crm-store'
import { defaultConfirmationBody, defaultReminderBody, defaultFollowUpBody } from '@/lib/event-email-defaults'
import { weekdayDate } from '@/lib/email'
import { isOpenDeal } from '@/lib/client-history'
import { openContactPanel } from '@/lib/contact-panel'
import type { CrmEvent, EventAttendee, Speaker, AgendaItem, FaqItem, AttendeeStatus } from '@/lib/event-types'
import { confirmAction } from '@/app/admin/ConfirmHost'
import { EmailText } from '@/components/os/CopyEmail'
import { EVENT_IMAGE_LIBRARY, SHARED_DEFAULT_IMAGE, eventImage } from '@/lib/event-images'
import '../events.css'
import EvIcon from '../EvIcon'
import EventOverview from './EventOverview'
import PaymentChip from './PaymentChip'
import AttendeeMail from './AttendeeMail'
import { copyText } from '@/lib/clipboard'

const I: React.CSSProperties = { width: '100%', minHeight: 44, padding: '10px 13px', border: '1px solid var(--os-line-strong, var(--os-line))', borderRadius: 11, fontSize: 14, color: 'var(--os-text)', outline: 'none', background: 'var(--os-base-2, var(--os-card))', fontFamily: 'inherit' }
const L: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 7 }
const Btn = (extra?: React.CSSProperties): React.CSSProperties => ({ background: 'linear-gradient(135deg,var(--os-accent),var(--os-accent))', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', ...extra })
const BtnGhost = (extra?: React.CSSProperties): React.CSSProperties => ({ background: 'none', border: '1.5px solid var(--os-line)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--os-accent)', cursor: 'pointer', ...extra })

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

function Section({ icon, title, hint, children }: { icon: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="evx-sec">
      <div className="evx-sec-head">
        <div className="evx-sec-icon"><EvIcon name={icon} size={17} /></div>
        <div><div className="evx-sec-title">{title}</div>{hint && <div className="evx-sec-hint">{hint}</div>}</div>
      </div>
      <div className="evx-fields">{children}</div>
    </section>
  )
}

function DetailsTab({ event, onUpdate }: { event: CrmEvent; onUpdate: () => void }) {
  const [f, setF] = useState({
    title: event.title, tagline: event.tagline, description: event.description,
    date: event.date, time: event.time, endTime: event.endTime, timezone: event.timezone,
    format: event.format, location: event.location, locationName: event.locationName,
    capacity: String(event.capacity), price: String(event.price), currency: event.currency,
    coverImage: event.coverImage, thumbnailImage: event.thumbnailImage,
    status: event.status, tags: event.tags.join(', '),
    seoTitle: event.seoTitle, seoDescription: event.seoDescription,
  })
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(v => ({ ...v, [k]: e.target.value }))

  async function save() {
    setSaveError('')
    const result = await updateEvent(event.id, {
      ...f, format: f.format as CrmEvent['format'], status: f.status as CrmEvent['status'],
      capacity: Number(f.capacity) || 0, price: Number(f.price) || 0,
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
    })
    onUpdate()
    if (!result.ok) {

      setSaveError(result.error || 'No se pudo guardar en el servidor. Por ahora el cambio solo está en este dispositivo.')
      return
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="evx-details-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }}>
      <div className="evx-form">
        <Section icon="ti-sparkles" title="Lo básico" hint="Lo primero que se lee en la página y en la tarjeta al compartir.">
          <div><label style={L}>Título del evento</label><input value={f.title} onChange={set('title')} placeholder="Masterclass: pierde la barriga después de los 40" style={{ ...I, fontSize: 16, fontWeight: 700 }} /></div>
          <div><label style={L}>Subtítulo <span className="evx-hint-inline">una línea corta</span></label><input value={f.tagline} onChange={set('tagline')} placeholder="Una línea que resuma la sesión" style={I} /></div>
          <div><label style={L}>Descripción <span className="evx-hint-inline">admite HTML</span></label><textarea value={f.description} onChange={set('description')} rows={6} style={{ ...I, resize: 'vertical', lineHeight: 1.6 }} /></div>
        </Section>

        <Section icon="ti-calendar-event" title="Cuándo" hint="La página lo muestra en la zona horaria de cada invitado.">
          <div className="evx-row evx-row-3">
            <div><label style={L}>Fecha</label><input type="date" value={f.date} onChange={set('date')} style={I} /></div>
            <div><label style={L}>Empieza</label><input type="time" value={f.time} onChange={set('time')} style={I} /></div>
            <div><label style={L}>Termina</label><input type="time" value={f.endTime} onChange={set('endTime')} style={I} /></div>
          </div>
          <div><label style={L}>Zona horaria</label>
            <select value={f.timezone} onChange={set('timezone')} style={I}>
              {['Europe/Madrid','America/New_York','America/Los_Angeles','Europe/Amsterdam','Europe/London','UTC'].map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </Section>

        <Section icon="ti-map-pin" title="Dónde" hint={f.format === 'online' ? 'El enlace para unirse solo se envía a los invitados por email.' : 'Se muestra en la página y en la confirmación.'}>
          <div className="evx-row evx-row-2">
            <div>
              <label style={L}>Formato</label>
              <select value={f.format} onChange={set('format')} style={I}>
                <option value="in_person">Presencial</option>
                <option value="online">Online</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <div><label style={L}>Lugar o plataforma <span className="evx-hint-inline">p. ej. Google Meet</span></label><input value={f.locationName} onChange={set('locationName')} placeholder="Lugar o plataforma" style={I} /></div>
          </div>
          <div><label style={L}>{f.format === 'online' ? 'Enlace de la reunión' : 'Dirección'}</label><input value={f.location} onChange={set('location')} placeholder={f.format === 'online' ? 'https://meet.google.com/...' : 'Dirección completa'} style={I} /></div>
        </Section>

        <Section icon="ti-ticket" title="Entradas" hint="Con un precio mayor que 0 es un evento de pago: el enlace para unirse llega tras el pago.">
          <div className="evx-row evx-row-3">
            <div><label style={L}>Precio</label><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} style={I} /></div>
            <div>
              <label style={L}>Moneda</label>
              <select value={f.currency} onChange={set('currency')} style={I}><option value="USD">USD</option><option value="EUR">EUR</option><option value="AWG">AWG</option></select>
            </div>
            <div><label style={L}>Plazas <span className="evx-hint-inline">0 = sin límite</span></label><input type="number" min="0" value={f.capacity} onChange={set('capacity')} style={I} /></div>
          </div>
        </Section>

        <Section icon="ti-eye" title="Imagen" hint="Un clic. Es la cabecera de la página, la tarjeta y la imagen al compartir.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
            {EVENT_IMAGE_LIBRARY.map(img => {
              const on = (f.thumbnailImage || f.coverImage) === img.src
              return (
                <button key={img.src} type="button" title={img.label} onClick={() => setF(v => ({ ...v, coverImage: img.src, thumbnailImage: img.src }))}
                  style={{ padding: 0, border: `2px solid ${on ? 'var(--os-accent)' : 'transparent'}`, boxShadow: on ? '0 0 0 4px var(--os-accent-soft)' : 'none', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'none', aspectRatio: '4 / 3', position: 'relative' }}>

                  <img src={img.src} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {on && <span style={{ position: 'absolute', top: 6, right: 6, background: 'var(--os-accent)', color: '#fff', borderRadius: 100, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EvIcon name="ti-check" size={13} /></span>}
                </button>
              )
            })}
          </div>
          {(f.coverImage === SHARED_DEFAULT_IMAGE || !f.coverImage) && <div style={{ fontSize: 12.5, color: 'var(--os-warn)' }}>Este evento aún usa la imagen por defecto. Elige una para que destaque.</div>}
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'var(--os-accent)' }}>Usar mi propio enlace de imagen</summary>
            <div className="evx-fields" style={{ marginTop: 12 }}>
              <div><label style={L}>Enlace de la imagen de portada</label><input value={f.coverImage} onChange={set('coverImage')} placeholder="https://..." style={I} /></div>
              <div><label style={L}>Enlace de la miniatura</label><input value={f.thumbnailImage} onChange={set('thumbnailImage')} placeholder="https://..." style={I} /></div>
            </div>
          </details>
        </Section>

        <Section icon="ti-world" title="Buscadores y etiquetas" hint="Opcional. Si lo dejas vacío se usan el título y el subtítulo.">
          <div className="evx-row evx-row-2">
            <div><label style={L}>Título para buscadores</label><input value={f.seoTitle} onChange={set('seoTitle')} placeholder="Sustituye el título de la página" style={I} /></div>
            <div><label style={L}>Descripción para buscadores</label><input value={f.seoDescription} onChange={set('seoDescription')} placeholder="Máximo 160 caracteres" style={I} /></div>
          </div>
          <div><label style={L}>Etiquetas <span className="evx-hint-inline">separadas por comas</span></label><input value={f.tags} onChange={set('tags')} placeholder="masterclass, fitness" style={I} /></div>
        </Section>

        <div className="evx-save-bar">
          <span>{saved ? 'Guardado. La página pública está al día.' : 'Los cambios se publican en la página al guardar.'}</span>
          <button onClick={save} className="evx-btn evx-btn-primary">{saved ? <><EvIcon name="ti-check" size={15} /> Guardado</> : 'Guardar detalles'}</button>
        </div>
        {saveError && (
          <div style={{ background: 'var(--os-bad-soft)', border: '1px solid var(--os-bad)', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: 'var(--os-bad)' }}>
            <strong>No se guardó en el servidor:</strong> {saveError}<br />
            La página pública del evento sigue mostrando el valor anterior hasta que se arregle.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 16 }}>
        <div className="evx-sec" style={{ padding: '18px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--os-text)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Estado</div>
          <select value={f.status} onChange={set('status')} style={{ ...I, marginBottom: 10 }}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="completed">Terminado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <button onClick={save} className="evx-btn evx-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Actualizar estado</button>
        </div>
        <div className="evx-sec" style={{ padding: '18px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--os-text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>URL pública</div>
          <div style={{ fontSize: 11.5, color: 'var(--os-accent)', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 10 }}>
            joseunstoppable.com/events/{event.slug}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" style={{ ...BtnGhost({ fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }) }}>
              <i className="ti ti-external-link" /> Ver
            </a>
            <button onClick={() => { void copyText(`https://joseunstoppable.com/events/${event.slug}`) }} style={BtnGhost({ fontSize: 12 })}>
              <i className="ti ti-copy" /> Copiar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpeakersTab({ event, onUpdate }: { event: CrmEvent; onUpdate: () => void }) {
  const empty: Omit<Speaker, 'id'> = { name: '', title: '', bio: '', photo: '', linkedin: '', instagram: '', website: '' }
  const [editing, setEditing] = useState<Speaker | null>(null)
  const [form, setForm] = useState<Omit<Speaker, 'id'>>(empty)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function startEdit(s: Speaker) { setEditing(s); setForm({ name: s.name, title: s.title, bio: s.bio, photo: s.photo, linkedin: s.linkedin ?? '', instagram: s.instagram ?? '', website: s.website ?? '' }) }
  function startAdd() { setEditing({ id: '' } as Speaker); setForm(empty) }

  function save() {
    const speakers = editing?.id
      ? event.speakers.map(s => s.id === editing.id ? { ...s, ...form } : s)
      : [...event.speakers, { id: uid(), ...form }]
    updateEvent(event.id, { speakers }); onUpdate(); setEditing(null)
  }

  function remove(id: string) {
    updateEvent(event.id, { speakers: event.speakers.filter(s => s.id !== id) }); onUpdate()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>{event.speakers.length} {event.speakers.length === 1 ? 'ponente' : 'ponentes'}</div>
        <button onClick={startAdd} style={Btn({ padding: '8px 16px', fontSize: 12 })}><i className="ti ti-plus" /> Añadir ponente</button>
      </div>

      {event.speakers.length === 0 && !editing && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--os-text-faint)' }}>
          <i className="ti ti-microphone" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: 'var(--os-text-faint)', marginBottom: 8 }}>Aún no hay ponentes</div>
          <div style={{ fontSize: 13 }}>Añade a las personas que presentan tu evento</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14, marginBottom: editing ? 24 : 0 }}>
        {event.speakers.map(s => (
          <div key={s.id} style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {s.photo ? (
              <img src={s.photo} alt={s.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,var(--os-accent),var(--os-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                {s.name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--os-text)' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--os-accent)', fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--os-text-faint)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.bio}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => startEdit(s)} style={BtnGhost({ fontSize: 11, padding: '4px 10px' })}>Editar</button>
                <button onClick={() => remove(s.id)} style={{ ...BtnGhost({ fontSize: 11, padding: '4px 10px' }), color: 'var(--os-bad)', borderColor: 'var(--os-bad-soft)' }}>Quitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ background: 'var(--os-card-alt)', border: '1.5px solid var(--os-line)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--os-text)', marginBottom: 16 }}>{editing.id ? 'Editar ponente' : 'Añadir ponente'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={L}>Nombre completo</label><input value={form.name} onChange={set('name')} placeholder="José Unstoppable" style={I} /></div>
            <div><label style={L}>Cargo / rol</label><input value={form.title} onChange={set('title')} placeholder="Coach" style={I} /></div>
            <div style={{ gridColumn: '1/-1' }}><label style={L}>Bio</label><textarea value={form.bio} onChange={set('bio')} rows={3} placeholder="Una biografía corta del ponente..." style={{ ...I, resize: 'vertical' }} /></div>
            <div>
              <label style={L}>URL de la foto</label>
              <input value={form.photo} onChange={set('photo')} placeholder="https://..." style={I} />
              {form.photo && <img src={form.photo} alt="Vista previa" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><label style={L}>LinkedIn</label><input value={form.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/..." style={I} /></div>
              <div><label style={L}>Instagram</label><input value={form.instagram} onChange={set('instagram')} placeholder="@handle" style={I} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => setEditing(null)} style={BtnGhost()}>Cancelar</button>
            <button onClick={save} style={Btn()}>{editing.id ? 'Guardar cambios' : 'Añadir ponente'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleTab({ event, onUpdate }: { event: CrmEvent; onUpdate: () => void }) {
  const [items, setItems] = useState<AgendaItem[]>(event.agenda)

  function commit(next: AgendaItem[]) {
    setItems(next); updateEvent(event.id, { agenda: next }); onUpdate()
  }
  function add() { commit([...items, { id: uid(), time: '', title: '', description: '', speakerId: '' }]) }
  function remove(id: string) { commit(items.filter(i => i.id !== id)) }
  function move(idx: number, dir: -1 | 1) {
    const next = [...items]; const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]; commit(next)
  }
  function patch(id: string, k: keyof AgendaItem, v: string) {
    commit(items.map(i => i.id === id ? { ...i, [k]: v } : i))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>{items.length} {items.length === 1 ? 'punto del programa' : 'puntos del programa'}</div>
        <button onClick={add} style={Btn({ padding: '8px 16px', fontSize: 12 })}><i className="ti ti-plus" /> Añadir punto</button>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--os-text-faint)' }}>
          <i className="ti ti-list" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: 'var(--os-text-faint)' }}>Aún no hay programa</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '14px 16px', display: 'grid', gridTemplateColumns: '80px 1fr 1fr auto', gap: 10, alignItems: 'start' }}>
              <div><label style={L}>Hora</label><input value={item.time} onChange={e => patch(item.id, 'time', e.target.value)} placeholder="20:00" style={I} /></div>
              <div><label style={L}>Título de la sesión</label><input value={item.title} onChange={e => patch(item.id, 'title', e.target.value)} placeholder="Bienvenida" style={I} /></div>
              <div>
                <label style={L}>Ponente</label>
                <select value={item.speakerId ?? ''} onChange={e => patch(item.id, 'speakerId', e.target.value)} style={I}>
                  <option value="">— Ninguno —</option>
                  {event.speakers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 20 }}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ ...BtnGhost({ padding: '4px 8px', fontSize: 12 }), opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} style={{ ...BtnGhost({ padding: '4px 8px', fontSize: 12 }), opacity: idx === items.length - 1 ? 0.4 : 1 }}>↓</button>
                <button onClick={() => remove(item.id)} style={{ ...BtnGhost({ padding: '4px 8px', fontSize: 12 }), color: 'var(--os-bad)', borderColor: 'var(--os-bad-soft)' }}>✕</button>
              </div>
              {item.description !== undefined && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={L}>Descripción</label>
                  <input value={item.description} onChange={e => patch(item.id, 'description', e.target.value)} placeholder="Detalles opcionales" style={I} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ATTENDEE_STATUS_STYLES: Record<AttendeeStatus, { color: string; bg: string }> = {
  registered: { color: 'var(--os-accent)', bg: '#eff6ff' },
  attended:   { color: 'var(--os-good)', bg: 'var(--os-good-soft)' },
  cancelled:  { color: 'var(--os-bad)', bg: 'var(--os-bad-soft)' },
  no_show:    { color: 'var(--os-text-faint)', bg: 'var(--os-line)' },
  waitlisted: { color: 'var(--os-warn)', bg: 'var(--os-warn-soft)' },
}

type AttendeeView = 'all' | 'paid' | 'unpaid' | 'came' | 'noshow' | 'notpipeline'

function AttendeesTab({ event }: { event: CrmEvent }) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState<AttendeeView>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', company: '' })
  const [toast, setToast] = useState('')

  const reload = useCallback(() => setAttendees(getAttendees(event.id)), [event.id])
  useEffect(() => { reload(); window.addEventListener('ju:events', reload); return () => window.removeEventListener('ju:events', reload) }, [reload])

  useEffect(() => { void hydrateEventsDetailed().then(r => { if (r.ok) reload() }) }, [reload])
  const [paying, setPaying] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { ok?: boolean; sent?: boolean; reason?: string; email?: string; error?: string }
      if (d?.sent) showToast(`Email actualizado. Confirmación reenviada a ${d.email}.`)
      else if (d?.reason === 'unpaid') showToast('Email actualizado. Recibirá el enlace cuando pague.')
      else if (d?.reason === 'event-over' || d?.reason === 'no-ticket' || d?.reason === 'no-event') showToast('Email actualizado.')
      else if (d?.ok) showToast('Email actualizado, pero la confirmación no se envió. Reenvíala desde la pestaña Emails.')
      else showToast(d?.error || 'Puede que el nuevo email no se haya guardado. Revísalo e inténtalo de nuevo.')
    }
    window.addEventListener('ju:attendee-email', on)
    return () => window.removeEventListener('ju:attendee-email', on)
  }, [])

  async function markSeatPaid(a: EventAttendee) {
    if (a.paid || paying) return
    if (event.price > 0) {
      const ok = await confirmAction({ message: `¿Marcar a ${a.name || a.email} como pagado? Recibirá el email de confirmación con el enlace.`, confirmLabel: 'Marcar pagado' })
      if (!ok) return
      setPaying(a.id)
      try {
        const res = await fetch('/api/os/event-attendee-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendeeId: a.id }) })
        const j = await res.json().catch(() => ({}))
        if (!res.ok || !j.ok) { showToast(j.error || 'No se pudo marcar como pagado.'); return }
        await hydrateEventsDetailed()
        reload()
        showToast(j.already ? 'Ya estaba pagado.' : j.emailSent ? `Pagado. ${a.name || a.email} ya tiene el enlace.` : 'Pagado, pero el email no se envió: manda el enlace a mano.')
      } finally { setPaying('') }
      return
    }
    markPaid(a.id, event.price); reload()
  }

  async function openProof(a: EventAttendee) {
    const res = await fetch('/api/os/event-attendee-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendeeId: a.id, action: 'proof' }) })
    const j = await res.json().catch(() => ({}))
    if (j.url) window.open(j.url, '_blank', 'noopener')
    else showToast(j.error || 'No se pudo abrir el justificante.')
  }

  function openAttendee(a: EventAttendee) {
    openContactPanel(
      { id: a.id, name: a.name, email: a.email, phone: a.phone, company: a.company, notes: a.notes,
        createdAt: a.registeredAt, source: a.source, kindLabel: `Asistente · ${a.eventTitle}` },
      patch => { updateAttendee(a.id, patch as Partial<EventAttendee>); reload() },
    )
  }

  const pipelineEmails = new Set(getDeals().filter(isOpenDeal).map(d => d.clientEmail?.toLowerCase()).filter(Boolean))

  const strategyInvoiced = new Set(getInvoices()
    .filter(i => String(i.status) !== 'void' && /strategy session|programa imparable/i.test(`${i.projectTitle ?? ''} ${i.lineItems.map(l => l.name).join(' ')}`))
    .map(i => (i.clientEmail ?? '').toLowerCase()).filter(Boolean))

  const strategyInvoiceHref = (a: EventAttendee) => {
    const q = new URLSearchParams({ preset: 'strategy', name: a.name ?? '', email: a.email ?? '', company: a.company ?? '', phone: a.phone ?? '' })
    return `/admin/invoices/new?${q.toString()}`
  }

  function addToPipeline(a: EventAttendee) {
    if (!a.email) return
    saveDeal({
      clientName: a.name, clientEmail: a.email, clientPhone: a.phone || undefined, clientCompany: a.company || undefined,
      stage: 'lead', value: 0, currency: 'EUR', service: `Del evento: ${a.eventTitle}`,
    })
    showToast(`${a.name} añadido al pipeline`)
    window.dispatchEvent(new CustomEvent('ju:hydrated'))
  }

  function addManual() {
    if (!addForm.name || !addForm.email) return
    addAttendee({
      eventId: event.id, eventTitle: event.title, ...addForm,
      status: 'registered', paid: false, paidAt: '', paidAmount: 0,
      checkedIn: false, checkedInAt: '', ticketCode: generateTicketCode(),
      notes: '', source: 'manual',
    })
    setAddForm({ name: '', email: '', phone: '', company: '' }); setShowAdd(false); showToast('Asistente añadido')
  }

  async function broadcast(type: 'reminder' | 'followup') {

    const label = type === 'reminder' ? 'Recordatorio' : 'Seguimiento'
    try {
      const res = await fetch('/api/send-event-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, eventId: event.id, broadcast: true }) })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.success) {
        showToast(`${label} falló: ${d?.error || `el servidor respondió ${res.status}`}`)
        return
      }
      showToast(d.failed > 0 ? `${label} enviado a ${d.sent}, ${d.failed} fallaron` : `${label} enviado a ${d.sent} asistentes`)
    } catch {
      showToast(`${label} falló: error de red`)
    }
  }

  const inView = (a: EventAttendee, v: AttendeeView) => {
    const came = a.checkedIn || a.status === 'attended'
    if (v === 'paid') return a.paid
    if (v === 'unpaid') return event.price > 0 && !a.paid && a.status !== 'cancelled'
    if (v === 'came') return came
    if (v === 'noshow') return !came && a.status !== 'cancelled' && !!event.date && event.date.slice(0, 10) < new Date().toISOString().slice(0, 10)
    if (v === 'notpipeline') return came && !pipelineEmails.has(a.email.toLowerCase())
    return true
  }
  const views: { key: AttendeeView; label: string }[] = [
    { key: 'all', label: 'Todos' },
    ...(event.price > 0 ? [{ key: 'paid' as const, label: 'Pagados' }, { key: 'unpaid' as const, label: 'Pago pendiente' }] : []),
    { key: 'came', label: 'Vinieron' },
    { key: 'noshow', label: 'No-show' },
    { key: 'notpipeline', label: 'Vinieron, sin pipeline' },
  ]
  const filtered = attendees.filter(a => inView(a, view)).filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
  const stats = { registered: attendees.filter(a => a.status === 'registered').length, attended: attendees.filter(a => a.status === 'attended').length, paid: attendees.filter(a => a.paid).length, waitlisted: attendees.filter(a => a.status === 'waitlisted').length }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[{ label: 'Inscritos', value: stats.registered, color: 'var(--os-accent)' }, { label: 'Asistieron', value: stats.attended, color: 'var(--os-good)' }, { label: 'Pagados', value: stats.paid, color: 'var(--os-accent)' }, { label: 'En espera', value: stats.waitlisted, color: 'var(--os-warn)' }].map(s => (
          <div key={s.label} style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--os-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {views.map(v => {
          const n = attendees.filter(a => inView(a, v.key)).length
          const on = view === v.key
          return (
            <button key={v.key} onClick={() => setView(v.key)} style={{ padding: '6px 12px', borderRadius: 100, border: `1.5px solid ${on ? 'var(--os-accent)' : 'var(--os-line)'}`, background: on ? 'var(--os-accent)' : 'none', color: on ? '#fff' : 'var(--os-text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {v.label} <span style={{ opacity: 0.75 }}>{n}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email…" style={{ ...I, maxWidth: 260 }} />
        <div style={{ flex: 1 }} />
        <button onClick={() => exportAttendeesCSV(event.id)} style={BtnGhost({ fontSize: 12 })}><i className="ti ti-download" /> Exportar CSV</button>
        <button onClick={() => broadcast('reminder')} style={BtnGhost({ fontSize: 12 })}><i className="ti ti-bell" /> Enviar recordatorio</button>
        <button onClick={() => broadcast('followup')} style={BtnGhost({ fontSize: 12 })}><i className="ti ti-mail" /> Enviar seguimiento</button>
        <button onClick={() => setShowAdd(true)} style={Btn({ fontSize: 12, padding: '8px 14px' })}><i className="ti ti-plus" /> Añadir</button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--os-card-alt)', border: '1.5px solid var(--os-line)', borderRadius: 12, padding: '16px 18px', marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          {(['name', 'email', 'phone', 'company'] as const).map(k => (
            <div key={k}><label style={L}>{({ name: 'Nombre', email: 'Email', phone: 'Teléfono', company: 'Empresa' } as Record<string, string>)[k] ?? k}{k === 'name' || k === 'email' ? ' *' : ''}</label>
              <input value={addForm[k]} onChange={e => setAddForm(f => ({ ...f, [k]: e.target.value }))} style={I} /></div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addManual} style={Btn({ padding: '9px 14px', fontSize: 12 })}>Añadir</button>
            <button onClick={() => setShowAdd(false)} style={BtnGhost({ padding: '9px 12px', fontSize: 12 })}>✕</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--os-text-faint)' }}>
          <i className="ti ti-users" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
          <div style={{ fontWeight: 700, color: 'var(--os-text-faint)' }}>{search || view !== 'all' ? 'Nadie coincide con este filtro' : 'Aún no hay asistentes'}</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--os-card-alt)' }}>
                {['Nombre', 'Email', 'Estado', 'Pagado', 'Check-in', 'Entrada', 'Fecha', 'Pipeline', 'Programa', ''].map(h => (
                  <th key={h} style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--os-text-faint)', textAlign: 'left', borderBottom: '1px solid var(--os-line)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {

                const ss = ATTENDEE_STATUS_STYLES[a.status] ?? { color: 'var(--os-text-faint)', bg: 'var(--os-card-alt)' }
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--os-line)' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openAttendee(a)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, color: 'var(--os-accent)', fontSize: 13, textDecoration: 'underline', textDecorationColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'currentColor')} onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}>
                        {a.name}
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--os-text-muted)' }}><EmailText email={a.email} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <select value={a.status} onChange={e => { updateAttendeeStatus(a.id, e.target.value as AttendeeStatus); reload() }}
                        style={{ fontSize: 11, fontWeight: 700, color: ss.color, background: ss.bg, border: 'none', borderRadius: 100, padding: '3px 9px', cursor: 'pointer', outline: 'none' }}>
                        <option value="registered">Inscrito</option>
                        <option value="attended">Asistió</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="no_show">No vino</option>
                        <option value="waitlisted">En espera</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {a.paid ? (
                        <PaymentChip a={a} onOpenProof={() => { void openProof(a) }} />
                      ) : (
                        <>
                          <button onClick={() => { void markSeatPaid(a) }} disabled={paying === a.id} title="Marcar pagado"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                            {paying === a.id ? '…' : '⬜'}
                          </button>
                          {a.proofPath && (
                            <button onClick={() => { void openProof(a) }}
                              title={a.proofCheck?.reasons?.length ? `Revisión: ${a.proofCheck.reasons.join(' ')}` : 'Justificante de transferencia'}
                              style={{ display: 'block', margin: '2px auto 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--os-warn)', whiteSpace: 'nowrap' }}>
                              Ver justificante
                            </button>
                          )}
                        </>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button onClick={() => { if (!a.checkedIn) { markCheckedIn(a.id); reload() } }}
                        title={a.checkedIn ? 'Check-in hecho' : 'Marcar check-in'}
                        style={{ background: 'none', border: 'none', cursor: a.checkedIn ? 'default' : 'pointer', fontSize: 16 }}>
                        {a.checkedIn ? '✅' : '⬜'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--os-accent)', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.ticketCode}</td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--os-text-faint)', whiteSpace: 'nowrap' }}>{new Date(a.registeredAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {!a.email ? (
                        <span style={{ fontSize: 11, color: 'var(--os-text-faint)' }}>Sin email</span>
                      ) : pipelineEmails.has(a.email.toLowerCase()) ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--os-good)' }}><i className="ti ti-circle-check" /> En pipeline</span>
                      ) : (
                        <button onClick={() => addToPipeline(a)} style={BtnGhost({ fontSize: 11, padding: '4px 10px' })}>
                          <i className="ti ti-plus" /> Añadir al pipeline
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {!a.email ? null : strategyInvoiced.has(a.email.toLowerCase()) ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--os-good)' }}><i className="ti ti-circle-check" /> Facturado</span>
                      ) : (
                        <Link href={strategyInvoiceHref(a)} style={{ ...BtnGhost({ fontSize: 11, padding: '4px 10px' }), textDecoration: 'none' }}
                          title="Abre una factura nueva del Programa Imparable, ya rellenada">
                          <i className="ti ti-file-invoice" /> Facturar programa
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={async () => { if (await confirmAction({ message: '¿Quitar a este asistente?', confirmLabel: 'Quitar' })) { removeAttendee(a.id); reload() } }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--os-bad)', fontSize: 14 }}>
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--os-deep)', color: 'var(--os-on-deep)', borderRadius: 100, padding: '11px 22px', fontSize: 13, fontWeight: 600, zIndex: 999 }}>{toast}</div>}
    </div>
  )
}

type TimelineStage = { key: string; label: string; when: string; dueAt: string | null; sent: number; total: number }

function EmailTimeline({ event }: { event: CrmEvent }) {
  const [stages, setStages] = useState<TimelineStage[] | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let dead = false
    fetch(`/api/os/events/email-timeline?eventId=${encodeURIComponent(event.id)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (dead) return; ok ? setStages(d.stages) : setErr(d.error || 'No se pudo cargar') })
      .catch(() => { if (!dead) setErr('No se pudo cargar la cronología') })
    return () => { dead = true }
  }, [event.id])

  const now = Date.now()
  const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Cronología de emails</div>
      <div style={{ fontSize: 12.5, color: 'var(--os-text-faint)', marginBottom: 14 }}>
        Every email in the sequence, with what has actually been sent. A stage counts a send only after the mail service accepted it.
      </div>
      {err && <div style={{ fontSize: 13, color: 'var(--os-bad)' }}>{err}</div>}
      {!err && !stages && <div style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>Cargando…</div>}
      {stages && (
        <div style={{ position: 'relative', paddingLeft: 22 }}>
          <div style={{ position: 'absolute', left: 8, top: 10, bottom: 10, width: 2, background: 'var(--os-line)' }} />
          {stages.map(st => {
            const due = st.dueAt ? Date.parse(st.dueAt) : null
            const done = st.total > 0 && st.sent >= st.total
            const partial = st.sent > 0 && !done
            const overdue = due !== null && due < now && st.sent === 0 && st.total > 0
            const future = due !== null && due > now
            const dot = done ? 'var(--os-good)' : partial ? 'var(--os-warn)' : overdue ? 'var(--os-bad)' : 'var(--os-line)'
            const badge = done ? '✓ enviado' : partial ? `${st.sent} de ${st.total}` : future ? 'programado' : overdue ? 'no enviado' : st.total === 0 ? 'sin asistentes' : '—'
            const badgeColor = done ? 'var(--os-good)' : partial ? 'var(--os-warn)' : overdue ? 'var(--os-bad)' : 'var(--os-text-faint)'
            return (
              <div key={st.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '7px 0', position: 'relative' }}>
                <span style={{ position: 'absolute', left: -20, top: 12, width: 12, height: 12, borderRadius: '50%', background: dot, border: '2px solid var(--os-card)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{st.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--os-text-faint)', marginLeft: 10 }}>
                    {st.dueAt ? fmt(st.dueAt) : st.when}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: badgeColor, whiteSpace: 'nowrap' }}>
                  {badge}{done || partial ? ` · ${st.sent}/${st.total}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmailsTab({ event, onUpdate }: { event: CrmEvent; onUpdate: () => void }) {

  const seeded = useMemo(() => {
    const date = weekdayDate(event.date, 'Fecha por confirmar')
    const time = String(event.time || '').trim() || 'Hora por confirmar'
    const location = String(event.location || event.locationName || '').trim() || 'Los detalles para unirte llegan por email'
    const joinUrl = (String(event.locationName || '').match(/https?:\/\/[^\s<"']+/) ?? [''])[0]
    const eventUrl = `https://joseunstoppable.com/events/${encodeURIComponent(String(event.slug || '').trim())}`
    const title = String(event.title || '').trim() || 'José Unstoppable event'
    return {
      emailConfirmation: event.emailConfirmation?.trim()
        ? event.emailConfirmation
        : defaultConfirmationBody({ name: '{{name}}', eventTitle: title, date, time, location, ticketCode: '{{ticketCode}}', eventUrl }),
      emailReminder: event.emailReminder?.trim()
        ? event.emailReminder
        : defaultReminderBody({ name: '{{name}}', eventTitle: title, date, time, joinUrl }, 24),
      emailFollowUp: event.emailFollowUp?.trim()
        ? event.emailFollowUp
        : defaultFollowUpBody({ name: '{{name}}', eventTitle: title }),
    }
  }, [event])

  const [t, setT] = useState({ ...seeded, reminderHoursBefore: event.reminderHoursBefore })
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  function save() {
    updateEvent(event.id, t); onUpdate(); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const vars = ['{{name}}', '{{eventTitle}}', '{{date}}', '{{time}}', '{{location}}', '{{ticketCode}}']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AttendeeMail eventId={event.id} />
      <EmailTimeline event={event} />
      <OfferBroadcast event={event} />
      <div style={{ background: 'var(--os-card-alt)', border: '1px solid var(--os-line)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--os-text-faint)' }}>Variables:</span>
        {vars.map(v => <span key={v} style={{ fontSize: 11.5, background: 'var(--os-chip)', color: 'var(--os-accent)', borderRadius: 6, padding: '2px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>)}
      </div>

      {([
        { key: 'emailConfirmation' as const, label: 'Confirmación', sub: 'Se envía al inscribirse', icon: 'ti-circle-check' },
        { key: 'emailReminder' as const, label: 'Recordatorio', sub: 'Se envía antes del evento', icon: 'ti-bell' },
        { key: 'emailFollowUp' as const, label: 'Seguimiento', sub: 'Se envía después del evento', icon: 'ti-mail-forward' },
      ]).map(({ key, label, sub, icon }) => (
        <div key={key} style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--os-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`ti ${icon}`} style={{ color: 'var(--os-accent)', fontSize: 16 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--os-text)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--os-text-faint)' }}>{sub}</div>
              </div>
            </div>
            <button onClick={() => setPreview(t[key])} style={BtnGhost({ fontSize: 12, padding: '6px 12px' })}>Vista previa</button>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <textarea value={t[key]} onChange={e => setT(v => ({ ...v, [key]: e.target.value }))} rows={8} style={{ ...I, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        </div>
      ))}

      <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '16px 18px' }}>
        <label style={L}>Enviar recordatorio</label>
        <select value={String(t.reminderHoursBefore)} onChange={e => setT(v => ({ ...v, reminderHoursBefore: Number(e.target.value) }))} style={{ ...I, maxWidth: 260 }}>
          <option value="0">Sin recordatorio automático</option>
          <option value="1">1 hora antes</option>
          <option value="3">3 horas antes</option>
          <option value="24">24 horas antes</option>
          <option value="48">48 horas antes</option>
        </select>
      </div>

      <button onClick={save} style={Btn()}>{saved ? '✓ Plantillas guardadas' : 'Guardar plantillas de email'}</button>

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--os-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Vista previa del email</span>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--os-text-faint)' }}>✕</button>
            </div>
            <div style={{ padding: 20 }} dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsTab({ event, onUpdate }: { event: CrmEvent; onUpdate: () => void }) {
  const router = useRouter()
  const [slug, setSlug] = useState(event.slug)
  const [waitlist, setWaitlist] = useState(event.waitlistEnabled)
  const [approval, setApproval] = useState(event.requiresApproval)
  const [faqs, setFaqs] = useState<FaqItem[]>(event.faq)
  const [saved, setSaved] = useState(false)

  function save() {
    updateEvent(event.id, { slug, waitlistEnabled: waitlist, requiresApproval: approval, faq: faqs })
    onUpdate(); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  function addFaq() { setFaqs(f => [...f, { id: uid(), question: '', answer: '' }]) }
  function removeFaq(id: string) { setFaqs(f => f.filter(q => q.id !== id)) }
  function patchFaq(id: string, k: 'question' | 'answer', v: string) { setFaqs(f => f.map(q => q.id === id ? { ...q, [k]: v } : q)) }

  async function handleDelete() {
    if (!(await confirmAction({ message: '¿Eliminar este evento y TODOS sus asistentes?', detail: 'No se puede deshacer.' }))) return
    deleteEvent(event.id)
    router.push('/admin/events')
  }

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--os-line)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--os-text)' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 100, background: value ? 'var(--os-accent)' : 'var(--os-line)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: 'var(--os-base-2, var(--os-card))', backgroundImage: 'var(--os-card-image, none)', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--os-text)', marginBottom: 14 }}>URL y SEO</div>
        <div style={{ marginBottom: 12 }}>
          <label style={L}>Slug del evento</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--os-text-faint)' }}>joseunstoppable.com/events/</span>
            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} style={{ ...I, flex: 1 }} />
          </div>
          {slug !== event.slug && <div style={{ fontSize: 11.5, color: 'var(--os-warn)', marginTop: 6 }}>⚠ Cambiar el slug romperá los enlaces que ya compartiste</div>}
        </div>
      </div>

      <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--os-text)', marginBottom: 4 }}>Ajustes de inscripción</div>
        <Toggle value={waitlist} onChange={setWaitlist} label="Activar lista de espera cuando se agote" />
        <Toggle value={approval} onChange={setApproval} label="Requerir aprobación antes de confirmar" />
      </div>

      <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--os-text)' }}>FAQ</div>
          <button onClick={addFaq} style={BtnGhost({ fontSize: 12, padding: '6px 12px' })}><i className="ti ti-plus" /> Añadir pregunta</button>
        </div>
        {faqs.length === 0 && <div style={{ fontSize: 13, color: 'var(--os-text-faint)', textAlign: 'center', padding: '20px 0' }}>Aún no hay preguntas frecuentes</div>}
        {faqs.map(q => (
          <div key={q.id} style={{ marginBottom: 12, background: 'var(--os-card-alt)', borderRadius: 10, padding: '12px 14px' }}>
            <input value={q.question} onChange={e => patchFaq(q.id, 'question', e.target.value)} placeholder="Pregunta…" style={{ ...I, marginBottom: 8, fontWeight: 700 }} />
            <textarea value={q.answer} onChange={e => patchFaq(q.id, 'answer', e.target.value)} placeholder="Respuesta…" rows={2} style={{ ...I, resize: 'vertical', marginBottom: 6 }} />
            <button onClick={() => removeFaq(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--os-bad)', fontSize: 12, fontWeight: 600 }}>Quitar</button>
          </div>
        ))}
      </div>

      <button onClick={save} style={Btn()}>{saved ? '✓ Ajustes guardados' : 'Guardar ajustes'}</button>

      <div style={{ background: 'var(--os-card)', border: '2px solid var(--os-bad-soft)', borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--os-bad)', marginBottom: 8 }}>Zona peligrosa</div>
        <div style={{ fontSize: 13, color: 'var(--os-text-faint)', marginBottom: 14 }}>Elimina para siempre este evento y todos los datos de sus asistentes. No se puede deshacer.</div>
        <button onClick={handleDelete} style={{ background: 'var(--os-bad)', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Eliminar evento</button>
      </div>
    </div>
  )
}

type Tab = 'overview' | 'details' | 'speakers' | 'schedule' | 'attendees' | 'emails' | 'settings'
const TABS: Tab[] = ['overview', 'details', 'speakers', 'schedule', 'attendees', 'emails', 'settings']

export default function EventEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<CrmEvent | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  const reload = useCallback(() => {
    const e = getEvent(id)
    if (!e) { router.replace('/admin/events'); return }
    setEvent(e)
  }, [id, router])

  useEffect(() => {
    reload()

    const raf = requestAnimationFrame(() => {
      const t = new URLSearchParams(window.location.search).get('tab') as Tab | null
      if (t && TABS.includes(t)) setTab(t)
    })
    window.addEventListener('ju:events', reload)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('ju:events', reload) }
  }, [reload])

  if (!event) return null

  const attendeeCount = getAttendees(event.id).length

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Resumen', icon: 'ti-chart-bar' },
    { key: 'details', label: 'Detalles', icon: 'ti-info-circle' },
    { key: 'speakers', label: `Ponentes (${event.speakers.length})`, icon: 'ti-microphone' },
    { key: 'schedule', label: `Programa (${event.agenda.length})`, icon: 'ti-list' },
    { key: 'attendees', label: `Asistentes (${attendeeCount})`, icon: 'ti-users' },
    { key: 'emails', label: 'Emails', icon: 'ti-mail' },
    { key: 'settings', label: 'Ajustes', icon: 'ti-settings' },
  ]

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'var(--os-line)', color: 'var(--os-text-faint)' },
    published: { bg: 'var(--os-good-soft)', color: 'var(--os-good)' },
    completed: { bg: '#eff6ff', color: 'var(--os-accent)' },
    cancelled: { bg: 'var(--os-bad-soft)', color: 'var(--os-bad)' },
  }
  const sc = statusColors[event.status] ?? statusColors.draft

  const live = getAttendees(event.id).filter(a => a.status !== 'cancelled' && a.status !== 'waitlisted')
  const seatCount = event.price > 0 ? live.filter(a => a.paid).length : live.length
  const dateLine = event.date
    ? new Date(event.date.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Sin fecha'
  const zone = (event.timezone || 'Europe/Madrid').split('/').pop()!.replace(/_/g, ' ')

  return (
    <div className="evx-page" style={{ maxWidth: 1140 }}>
      <div className="evx-banner">

        <img src={eventImage(event)} alt="" />
        <Link href="/admin/events" className="evx-banner-back"><EvIcon name="ti-arrow-left" /> Todos los eventos</Link>
        <div className="evx-banner-top">
          <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer" className="evx-btn evx-btn-glass" style={{ padding: '8px 14px' }}>
            <EvIcon name="ti-external-link" /> Página pública
          </a>
        </div>
        <div className="evx-banner-row">
          <div style={{ minWidth: 0 }}>
            <span className="evx-status" style={{ color: sc.color === 'var(--os-text-faint)' ? '#5a5274' : sc.color }}>{event.status}</span>
            <h1>{event.title || 'Evento sin título'}</h1>
            <div className="evx-meta">
              <span><EvIcon name="ti-calendar" />{dateLine}</span>
              {event.time && <span><EvIcon name="ti-clock" />{event.time}{event.endTime ? `–${event.endTime}` : ''} {zone}</span>}
              <span><EvIcon name={event.format === 'online' ? 'ti-video' : 'ti-map-pin'} />{event.locationName || (event.format === 'online' ? 'Online' : 'Falta el lugar')}</span>
              <span><EvIcon name="ti-ticket" />{event.price > 0 ? (event.currency === 'USD' ? `$${event.price}` : `${event.price} €`) : 'Gratis'}</span>
            </div>
          </div>
          <div className="evx-count" style={{ marginTop: 0 }}>
            <div className="evx-count-cell"><div className="evx-count-n">{seatCount}</div><div className="evx-count-l">{event.price > 0 ? 'Plazas pagadas' : 'Inscritos'}</div></div>
            {event.capacity > 0 && <div className="evx-count-cell"><div className="evx-count-n">{Math.max(0, event.capacity - seatCount)}</div><div className="evx-count-l">Plazas libres</div></div>}
          </div>
        </div>
      </div>

      <div className="evx-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            <EvIcon name={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <EventOverview event={event} attendees={getAttendees(event.id)} goTo={t => setTab(t)} />}
      {tab === 'details'   && <DetailsTab   event={event} onUpdate={reload} />}
      {tab === 'speakers'  && <SpeakersTab  event={event} onUpdate={reload} />}
      {tab === 'schedule'  && <ScheduleTab  event={event} onUpdate={reload} />}
      {tab === 'attendees' && <AttendeesTab event={event} />}
      {tab === 'emails'    && <EmailsTab    event={event} onUpdate={reload} />}
      {tab === 'settings'  && <SettingsTab  event={event} onUpdate={reload} />}
    </div>
  )
}

const RECORDING_SLOT = '[pega aquí el enlace de la grabación]'
const STRATEGY_OFFER = {
  subject: 'Tu grabación de la masterclass y tu llamada gratuita',
  message: [
    'Hola {{name}},',
    'Gracias por estar en {{eventTitle}}. Aquí tienes todo lo de la sesión en un solo sitio.',
    `La grabación: ${RECORDING_SLOT}`,
    'Si quieres aplicar el método con un plan hecho para ti, reserva tu llamada gratuita de 30 minutos. Me cuentas dónde estás y a dónde quieres llegar, y si no puedo ayudarte, te lo digo: https://joseunstoppable.com/reserva',
    '¿Alguna duda? Responde a este correo o escríbeme por WhatsApp y te contesto yo mismo.',
    'José',
  ].join('\n\n'),
}

function applyVars(text: string, name: string, title?: string): string {
  return text.replace(/\{\{name\}\}/g, name).replace(/\{\{eventTitle\}\}/g, String(title || 'el evento'))
}

function messageToHtml(message: string): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const link = (t: string) => t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => `<a href="${u}" style="color:#0E71AC">${u}</a>`)
  return message.trim().split(/\n{2,}/)
    .map(para => `<p style="margin:0 0 14px">${link(esc(para)).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const WORKSHOP_FOLLOWUP_EVENTS: string[] = []

function OfferBroadcast({ event }: { event: CrmEvent }) {
  const isWorkshop = WORKSHOP_FOLLOWUP_EVENTS.includes(event.id)

  const isMasterclass = /masterclass/i.test(String(event.title || ''))
  const [subject, setSubject] = useState(isWorkshop ? STRATEGY_OFFER.subject : '')
  const [message, setMessage] = useState(isWorkshop ? STRATEGY_OFFER.message : '')
  const [audience, setAudience] = useState<'all' | 'paid' | 'attended'>(isWorkshop ? 'paid' : 'all')
  const [excludeMembers, setExcludeMembers] = useState(!isWorkshop)
  const [showPreview, setShowPreview] = useState(false)
  const [armed, setArmed] = useState(false)
  const [preparedArmed, setPreparedArmed] = useState(false)

  const [sentSummary, setSentSummary] = useState<{ sent: number; failed: number; excluded: number; alreadySent: number; guard: string } | null>(null)
  const [resendUnlocked, setResendUnlocked] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const [failedList, setFailedList] = useState<{ email: string; name?: string; reason: string }[]>([])

  async function sendPrepared() {
    if (!preparedArmed) { setPreparedArmed(true); setResult(null); setFailed(false); return }
    setPreparedArmed(false); setSending(true); setResult(null); setFailed(false)
    try {
      const res = await fetch('/api/send-event-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'masterclass', eventId: event.id, broadcast: true, excludeMembers, audience }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.success) {
        setFailed(true)
        setResult(`No se envió nada. ${d?.error || `El servidor respondió ${res.status}.`}`)
      } else {
        setFailed(d.failed > 0)
        setSentSummary({ sent: d.sent ?? 0, failed: d.failed ?? 0, excluded: d.excluded ?? 0, alreadySent: d.alreadySent ?? 0, guard: d.guard ?? 'none' })
        setResendUnlocked(false)
        setResult(null)
      }
    } catch {
      setFailed(true); setResult('No se pudo conectar con el servidor. No se envió nada.')
    }
    setSending(false)
  }

  async function send(onlyEmails?: string[]) {
    if (!subject.trim() || !message.trim()) {
      setFailed(true); setResult('Hace falta un asunto y un mensaje.'); return
    }
    const slot = [RECORDING_SLOT].find(x => message.includes(x))
    if (slot) {
      setFailed(true); setResult('Primero pega el enlace en lugar de "' + slot + '".'); return
    }

    if (!onlyEmails && !armed) { setArmed(true); setResult(null); return }
    setArmed(false); setSending(true); setResult(null); setFailed(false); setFailedList([])

    try {
      const res = await fetch('/api/send-event-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'offer', eventId: event.id, broadcast: true,
          ...(onlyEmails ? { onlyEmails } : {}),
          subject: subject.trim(),

          bodyHtml: messageToHtml(message),
          excludeMembers, audience,
        }),
      })
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.success) {
        setFailed(true)
        setResult(`No se envió nada. ${d?.error || `El servidor respondió ${res.status}.`}`)
      } else {
        setFailed(d.failed > 0)
        setFailedList(Array.isArray(d.failedList) ? d.failedList : [])
        setResult(
          `Enviado a ${d.sent}.` +
          (d.excluded ? ` ${d.excluded} omitidos, ya son miembros.` : '') +
          (d.failed ? ` ${d.failed} fallaron.` : '')
        )
      }
    } catch {
      setFailed(true); setResult('No se pudo conectar con el servidor. No se envió nada.')
    }
    setSending(false)
  }

  return (
    <div style={{ background: 'var(--os-card)', border: '1px solid var(--os-line)', borderLeft: '3px solid var(--os-warn)', borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 4 }}>
        Enviar un mensaje a los inscritos
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--os-text-faint)', maxWidth: '62ch' }}>
        Un mensaje puntual a quienes se inscribieron: la grabación, un seguimiento, una
        invitación. Se escribe una vez, se envía una vez y no se guarda como plantilla.
      </p>

      {}
      {isWorkshop && (
        <div style={{ background: 'var(--os-good-soft)', border: '1px solid var(--os-good)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13.5, color: 'var(--os-text)', lineHeight: 1.55 }}>
          <strong>El seguimiento de la masterclass está rellenado abajo</strong>: la grabación y la invitación a la llamada gratuita.
          Pulsa <strong>Vista previa</strong> para leerlo como lo verán, y después <strong>Enviar a este evento</strong> (pide pulsar dos veces).
        </div>
      )}
      {isMasterclass && (
      <div style={{ background: 'var(--os-base-2)', border: '1px solid var(--os-line)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--os-text)', marginBottom: 4 }}>
          El seguimiento de la masterclass
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--os-text-faint)', maxWidth: '62ch' }}>
          Agradecimiento por asistir, la grabación y la invitación a trabajar con José, con WhatsApp
          debajo. Usa el público y las exclusiones que elijas abajo.
        </p>
        {sentSummary ? (
          <div style={{ background: 'var(--os-good-soft)', border: '1px solid var(--os-good)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--os-text)', marginBottom: 6 }}>
              <i className="ti ti-circle-check" style={{ marginRight: 6 }} />
              {sentSummary.sent === 0
                ? 'No hay nadie nuevo a quien enviar'
                : `Enviado a ${sentSummary.sent} ${sentSummary.sent === 1 ? 'persona' : 'personas'}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--os-text-muted)', lineHeight: 1.6 }}>
              {sentSummary.alreadySent > 0 && <>{sentSummary.alreadySent} ya lo tenían y se omitieron.<br /></>}
              {sentSummary.excluded > 0 && <>{sentSummary.excluded} omitidos, ya son miembros.<br /></>}
              {sentSummary.failed > 0
                ? <><strong style={{ color: 'var(--os-bad)' }}>{sentSummary.failed} fallaron</strong> y no salieron. Suele ser una dirección inexistente; quedan sin marcar para poder reintentarlo.<br /></>
                : <>Ninguno falló.<br /></>}
              {sentSummary.guard === 'per-recipient'
                ? <>Todos los que lo recibieron quedan marcados, así que volver a enviar solo llega a quien aún no lo tiene.<br /></>
                : <><strong style={{ color: 'var(--os-warn)' }}>La protección de envío único no está instalada.</strong> Ejecuta supabase/add-masterclass-sent.sql o un segundo envío llegará otra vez a todos.<br /></>}
              Los rebotes y aperturas están en Resend, no aquí: una dirección puede aceptar un
              mensaje y rebotarlo minutos después, así que esto cuenta lo que se entregó al
              servicio, no lo que llegó.
            </div>
            {!resendUnlocked ? (
              <button
                className="os-btn"
                style={{ marginTop: 12 }}
                onClick={() => setResendUnlocked(true)}
              >
                {sentSummary.guard === 'per-recipient' ? 'Enviar a los nuevos' : 'Necesito enviarlo otra vez'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--os-bad)', fontWeight: 700 }}>
                  {sentSummary.guard === 'per-recipient'
                    ? 'Esto solo se envía a quien aún no lo ha recibido.'
                    : 'Sin la protección instalada, esto se envía otra vez a TODOS.'}
                </span>
                <button className="os-btn os-btn-primary" disabled={sending} onClick={() => { setSentSummary(null); setResendUnlocked(false); setPreparedArmed(true) }}>
                  Sí, prepararlo otra vez
                </button>
                <button className="os-btn" onClick={() => setResendUnlocked(false)}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <a className="os-btn" href="/api/os/email-preview?kind=masterclass" target="_blank" rel="noopener noreferrer">
              Vista previa
            </a>
            <button
              className="os-btn os-btn-primary"
              disabled={sending}
              onClick={() => sendPrepared()}
            >
              {sending ? 'Enviando…' : preparedArmed ? `Sí, enviarlo a ${audience === 'attended' ? 'todos los que asistieron' : audience === 'paid' ? 'todas las plazas pagadas' : 'todos los inscritos'}` : 'Enviar el seguimiento'}
            </button>
            {preparedArmed && !sending && (
              <button className="os-btn" onClick={() => setPreparedArmed(false)}>Cancelar</button>
            )}
          </div>
        )}
      </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <select className="os-select" value={audience} onChange={e => setAudience(e.target.value as 'all' | 'paid' | 'attended')}>
          <option value="all">Todos los inscritos</option>
          <option value="paid">Solo plazas pagadas (y quien asistió)</option>
          <option value="attended">Solo quienes asistieron</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--os-text-muted)' }}>
          <input type="checkbox" checked={excludeMembers} onChange={e => setExcludeMembers(e.target.checked)} />
          Omitir a quien ya es cliente
        </label>
      </div>

      <button
        type="button"
        className="os-btn os-btn-ghost os-btn-sm"
        onClick={() => { setSubject(STRATEGY_OFFER.subject); setMessage(STRATEGY_OFFER.message); setAudience('paid'); setExcludeMembers(false); setArmed(false); setResult(null) }}
        style={{ marginBottom: 10 }}
      >
        Rellenar el seguimiento de la masterclass (grabación + llamada gratuita)
      </button>
      <input
        className="os-input"
        value={subject}
        onChange={e => { setSubject(e.target.value); setArmed(false) }}
        placeholder="Asunto"
        style={{ width: '100%', marginBottom: 10 }}
      />
      <textarea
        className="os-textarea"
        value={message}
        onChange={e => { setMessage(e.target.value); setArmed(false) }}
        rows={10}
        placeholder={'Escríbelo como lo dirías. Una línea en blanco empieza un párrafo nuevo.\n\nPega el enlace de la grabación en su propia línea.'}
        style={{ width: '100%' }}
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <button
          type="button"
          className="os-btn os-btn-sm"
          disabled={!message.trim()}
          onClick={() => setShowPreview(v => !v)}
        >
          {showPreview ? 'Ocultar vista previa' : 'Vista previa'}
        </button>
        <button
          className="os-btn os-btn-primary os-btn-sm"
          disabled={sending || !subject.trim() || !message.trim()}
          onClick={() => send()}
        >
          {sending ? 'Enviando…' : armed ? 'Pulsa otra vez para enviarlo' : 'Enviar a este evento'}
        </button>
        {armed && (
          <span style={{ fontSize: 12.5, color: 'var(--os-warn)', fontWeight: 600 }}>
            Esto envía emails reales y no se puede deshacer.
          </span>
        )}
      </div>

      {failedList.length > 0 && !sending && (
        <div style={{ marginTop: 12, background: 'var(--os-base-2)', border: '1px solid var(--os-bad)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--os-text)', marginBottom: 6 }}>No salieron</div>
          {failedList.map(f => (
            <div key={f.email} style={{ fontSize: 13, color: 'var(--os-text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--os-text)' }}>{f.name || f.email}</strong> ({f.email}): {f.reason}
            </div>
          ))}
          <button className="os-btn os-btn-primary os-btn-sm" style={{ marginTop: 10 }} onClick={() => send(failedList.map(f => f.email))}>
            Reintentar estos {failedList.length}
          </button>
        </div>
      )}

      {showPreview && (
        <div style={{ marginTop: 14, background: '#ffffff', color: '#212A4D', border: '1px solid var(--os-line)', borderRadius: 10, padding: '18px 20px', fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>
          <div style={{ fontSize: 12, color: '#6E6A7C', marginBottom: 10 }}>
            Vista previa con un nombre de ejemplo. Asunto: <strong>{applyVars(subject, 'Maria', event.title)}</strong>
          </div>
          <div dangerouslySetInnerHTML={{ __html: messageToHtml(applyVars(message, 'Maria', event.title)) }} />
        </div>
      )}

      {result && (
        <p style={{ margin: '12px 0 0', fontSize: 13.5, fontWeight: 600, color: failed ? 'var(--os-bad)' : 'var(--os-good)' }}>
          {result}
        </p>
      )}
    </div>
  )
}
