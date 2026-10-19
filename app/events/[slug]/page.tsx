import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import { serviceDb } from '@/lib/os-supabase'
import { rowToEvent } from '@/lib/event-store'
import { eventImage } from '@/lib/event-images'
import { eventTimeRangesLine } from '@/lib/event-time'
import { eventFunnelId } from '@/lib/event-analytics'
import type { CrmEvent } from '@/lib/event-types'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'

const NAVY = '#0C2A43'
const SKY = '#0E71AC'
const SOFT = '#F1F8FD'
const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"

async function loadEvent(slug: string): Promise<CrmEvent | null> {
  const db = await serviceDb()
  if (!db) return null
  const { data } = await db.from('events').select('*').eq('slug', slug).limit(1)
  const row = data?.[0]
  if (!row) return null
  const ev = rowToEvent(row)
  return ev.status === 'published' || ev.status === 'completed' ? ev : null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ev = await loadEvent((await params).slug)
  if (!ev) return { title: 'Evento · José Unstoppable' }
  const title = ev.seoTitle || `${ev.title} · José Unstoppable`
  const description = ev.seoDescription || ev.tagline
  return { title, description, openGraph: { title, description, images: [eventImage(ev)] }, robots: { index: true, follow: true } }
}

function dateLabel(ev: CrmEvent): string {
  if (!ev.date) return 'Fecha por confirmar'
  const d = new Date(`${ev.date}T12:00:00Z`)
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function priceLabel(ev: CrmEvent): string {
  if (!(ev.price > 0)) return 'Gratis'
  return ev.currency === 'USD' ? `$${ev.price}` : `${ev.price.toLocaleString('es-ES')} €`
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ev = await loadEvent(slug)
  if (!ev) notFound()

  const past = ev.status === 'completed' || (!!ev.date && ev.date < new Date().toISOString().slice(0, 10))
  const when = ev.time ? eventTimeRangesLine(ev.date, ev.time, ev.endTime, ev.timezone || 'Europe/Madrid') : ''
  const where = ev.format === 'online' ? (ev.locationName || 'Online') : (ev.locationName || ev.location || 'Lugar por confirmar')
  const description = ev.description ? DOMPurify.sanitize(ev.description) : ''
  const speakers = ev.speakers ?? []
  const agenda = ev.agenda ?? []
  const faq = ev.faq ?? []
  const speakerName = (id?: string) => speakers.find(s => s.id === id)?.name

  const meta: [string, string][] = [['Fecha', dateLabel(ev)], ['Hora', when || 'Por confirmar'], ['Dónde', where], ['Entrada', priceLabel(ev)]]

  return (
    <main style={{ minHeight: '100dvh', background: '#fff', color: NAVY, fontFamily: FONT }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var k='ju_vid',v=localStorage.getItem(k);if(!v){v=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem(k,v)}navigator.sendBeacon('/api/track',new Blob([JSON.stringify({step:'view',funnelId:${JSON.stringify(eventFunnelId(ev.slug))},visitorId:v,path:location.pathname+location.search,referrer:document.referrer})],{type:'application/json'}))}catch(e){}})();` }} />

      <header style={{ borderBottom: '1px solid #E4F4FD' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', color: NAVY, fontWeight: 800, letterSpacing: 3, fontSize: 14 }}>
            JOSÉ <span style={{ color: SKY, fontWeight: 600, letterSpacing: 4, fontSize: 11, marginLeft: 6 }}>| UNSTOPPABLE</span>
          </a>
          <a href="/reserva" style={{ background: NAVY, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 999 }}>Reservar llamada</a>
        </div>
      </header>

      <section style={{ background: `linear-gradient(180deg, ${SOFT}, #fff)` }}>
        <div className="ev-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 16px', display: 'grid', gap: 36 }}>
          <div>
            <div style={{ display: 'inline-block', background: '#E4F4FD', color: SKY, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', padding: '6px 12px', borderRadius: 999 }}>
              {past ? 'Evento terminado' : ev.format === 'online' ? 'En directo · online' : 'Evento presencial'}
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', lineHeight: 1.05, letterSpacing: -1.5, margin: '18px 0 14px', fontWeight: 800 }}>{ev.title}</h1>
            {ev.tagline && <p style={{ fontSize: 19, lineHeight: 1.55, color: '#3F5A70', margin: '0 0 24px' }}>{ev.tagline}</p>}
            <img src={eventImage(ev)} alt="" style={{ width: '100%', borderRadius: 20, aspectRatio: '16 / 9', objectFit: 'cover', background: SOFT }} />
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '22px 0 0' }}>
              {meta.map(([k, v]) => (
                <div key={k} style={{ background: SOFT, borderRadius: 14, padding: '12px 14px' }}>
                  <dt style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: SKY }}>{k}</dt>
                  <dd style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 15, textTransform: k === 'Fecha' ? 'capitalize' : undefined }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside id="inscripcion" style={{ alignSelf: 'start', background: '#fff', border: '1px solid #E4F4FD', borderRadius: 22, padding: 24, boxShadow: '0 24px 60px -30px rgba(12,42,67,.35)' }}>
            {past
              ? <><h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Este evento ya pasó</h2><p style={{ color: '#3F5A70', lineHeight: 1.6, margin: '0 0 16px' }}>Si quieres trabajar conmigo, reserva una llamada gratuita de 30 minutos.</p><a href="/reserva" style={{ display: 'block', textAlign: 'center', background: SKY, color: '#fff', textDecoration: 'none', fontWeight: 700, padding: '14px 18px', borderRadius: 999 }}>Reservar llamada gratuita</a></>
              : <RegisterForm eventId={ev.id} paid={ev.price > 0} priceLabel={priceLabel(ev)} />}
          </aside>
        </div>
      </section>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 16px 64px' }}>
        {description && (
          <section style={{ margin: '24px 0 40px' }}>
            <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>Sobre el evento</h2>
            <div className="ev-desc" style={{ fontSize: 16.5, lineHeight: 1.75, color: '#3F5A70' }} dangerouslySetInnerHTML={{ __html: description }} />
          </section>
        )}

        {agenda.length > 0 && (
          <section style={{ margin: '0 0 40px' }}>
            <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>{ev.agendaHeading || 'Programa'}</h2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {agenda.map(a => (
                <li key={a.id} style={{ display: 'flex', gap: 16, background: SOFT, borderRadius: 14, padding: '14px 16px' }}>
                  <span style={{ fontWeight: 800, color: SKY, minWidth: 54 }}>{a.time}</span>
                  <span>
                    <strong style={{ display: 'block' }}>{a.title}</strong>
                    {a.description && <span style={{ color: '#3F5A70', fontSize: 14.5 }}>{a.description}</span>}
                    {speakerName(a.speakerId) && <span style={{ display: 'block', color: SKY, fontSize: 13, marginTop: 2 }}>{speakerName(a.speakerId)}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {speakers.length > 0 && (
          <section style={{ margin: '0 0 40px' }}>
            <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>{speakers.length === 1 ? 'Tu anfitrión' : 'Ponentes'}</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {speakers.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {s.photo && <img src={s.photo} alt="" width={64} height={64} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                  <div>
                    <strong style={{ fontSize: 17 }}>{s.name}</strong>
                    {s.title && <div style={{ color: SKY, fontSize: 14 }}>{s.title}</div>}
                    {s.bio && <p style={{ color: '#3F5A70', lineHeight: 1.6, margin: '6px 0 0' }}>{s.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {faq.length > 0 && (
          <section style={{ margin: '0 0 40px' }}>
            <h2 style={{ fontSize: 26, margin: '0 0 14px' }}>Preguntas frecuentes</h2>
            {faq.map(q => (
              <details key={q.id} style={{ borderBottom: '1px solid #E4F4FD', padding: '14px 0' }}>
                <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{q.question}</summary>
                <p style={{ color: '#3F5A70', lineHeight: 1.65, margin: '8px 0 0' }}>{q.answer}</p>
              </details>
            ))}
          </section>
        )}
      </div>

      <footer style={{ background: NAVY, color: '#BFE6FA', fontSize: 13, padding: '22px 16px', textAlign: 'center' }}>
        © José Sánchez · José Unstoppable
      </footer>

      <style>{`
        .ev-grid { grid-template-columns: 1fr; }
        @media (min-width: 900px) { .ev-grid { grid-template-columns: 1.4fr 1fr; } }
        .ev-desc p { margin: 0 0 14px; }
        .ev-desc a { color: ${SKY}; }
      `}</style>
    </main>
  )
}
