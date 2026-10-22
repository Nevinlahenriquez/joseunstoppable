import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { safeHtml } from '@/lib/safe-html'
import { T, Tick } from '@/components/site/bits'
import MobileBar from '@/components/site/MobileBar'
import { serviceDb } from '@/lib/os-supabase'
import { rowToEvent } from '@/lib/event-store'
import { eventImage } from '@/lib/event-images'
import { eventInstant, eventTimeRangesLine } from '@/lib/event-time'
import type { CrmEvent } from '@/lib/event-types'
import RegisterForm from './RegisterForm'

// Edits made in /admin show up within a minute without rebuilding the site.
export const revalidate = 60

type Loaded = { ev: CrmEvent; seatsLeft: number | null; past: boolean }

async function loadEvent(slug: string): Promise<Loaded | null> {
  const db = await serviceDb()
  if (!db) return null
  const { data } = await db.from('events').select('*').eq('slug', slug).limit(1)
  const row = data?.[0]
  if (!row) return null
  const ev = rowToEvent(row)
  if (ev.status !== 'published' && ev.status !== 'completed') return null
  let seatsLeft: number | null = null
  if (ev.capacity > 0) {
    let q = db.from('event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('status', 'registered')
    if (ev.price > 0) q = q.eq('paid', true)
    const { count } = await q
    if (typeof count === 'number') seatsLeft = Math.max(0, ev.capacity - count)
  }
  const start = ev.date && ev.time ? eventInstant(ev.date, ev.time, ev.timezone || 'Europe/Madrid') : null
  const now = new Date()
  const past = ev.status === 'completed' || (start ? start < now : !!ev.date && ev.date < now.toISOString().slice(0, 10))
  return { ev, seatsLeft, past }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const loaded = await loadEvent((await params).slug)
  if (!loaded) return { title: 'Evento · Jose Unstoppable' }
  const { ev } = loaded
  const title = ev.seoTitle || `${ev.title} · Jose Unstoppable`
  const description = ev.seoDescription || ev.tagline
  return { title, description, openGraph: { title, description, images: [eventImage(ev)] }, robots: { index: true, follow: true } }
}

function dateLabel(ev: CrmEvent, locale: string): string {
  return new Date(`${ev.date}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

function priceLabel(ev: CrmEvent): string {
  if (!(ev.price > 0)) return ''
  return ev.currency === 'USD' ? `$${ev.price}` : `${ev.price.toLocaleString('es-ES')} €`
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const loaded = await loadEvent(slug)
  if (!loaded) notFound()
  const { ev, seatsLeft, past } = loaded

  const when = ev.time ? eventTimeRangesLine(ev.date, ev.time, ev.endTime, ev.timezone || 'Europe/Madrid') : ''
  const online = ev.format === 'online'
  const where = online ? (ev.locationName || 'Online') : (ev.locationName || ev.location)
  const price = priceLabel(ev)
  const description = ev.description ? safeHtml(ev.description) : ''
  const speakers = ev.speakers ?? []
  const agenda = ev.agenda ?? []
  const faq = ev.faq ?? []
  const leaveWith = (ev.leaveWith ?? []).filter(Boolean)
  const speakerName = (id?: string) => speakers.find(s => s.id === id)?.name
  const full = seatsLeft === 0

  return (
    <>
      <main>
        <section className="hero hero-top">
          <div className="wrap">
            <div className="hero-copy">
              <div className="chips">
                <span className="eyebrow">
                  {past
                    ? <T es="Evento terminado" en="Past event" />
                    : online ? <T es="En directo · Online" en="Live · Online" />
                    : ev.format === 'hybrid' ? <T es="Presencial y online" en="In person and online" />
                    : <T es="Evento presencial" en="In-person event" />}
                </span>
                <span className="chip-navy">{price || <T es="Gratis" en="Free" />}</span>
              </div>
              <h1 className="disp">{ev.title}</h1>
              {ev.tagline && <p className="lead">{ev.tagline}</p>}
              <div className="facts">
                <div className="fact"><span><T es="Fecha" en="Date" /></span><b className="cap">{ev.date ? <T es={dateLabel(ev, 'es-ES')} en={dateLabel(ev, 'en-GB')} /> : <T es="Por confirmar" en="To be confirmed" />}</b></div>
                <div className="fact"><span><T es="Hora" en="Time" /></span><b>{when || <T es="Por confirmar" en="To be confirmed" />}</b></div>
                <div className="fact"><span><T es="Dónde" en="Where" /></span><b>{where || <T es="Por confirmar" en="To be confirmed" />}</b></div>
              </div>
              <div className="ev-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- event images can be any URL Jose pastes in /admin */}
                <img src={eventImage(ev)} alt="" />
              </div>
            </div>

            <aside id="register" className="card">
              {past ? (
                <>
                  <h2><T es="Este evento ya pasó" en="This event has ended" /></h2>
                  <p className="card-sub"><T es="Si quieres trabajar conmigo, reserva una llamada gratuita de 30 minutos." en="If you'd like to work with me, book a free 30-minute call." /></p>
                  <a className="btn btn-y btn-wide" href="/reserva"><T es="Reservar llamada gratuita" en="Book a free call" /><span className="arr">→</span></a>
                </>
              ) : (
                <RegisterForm eventId={ev.id} paid={ev.price > 0} priceLabel={price} seatsLeft={seatsLeft} capacity={ev.capacity} full={full} waitlist={ev.waitlistEnabled !== false} />
              )}
            </aside>
          </div>
        </section>

        {(description || leaveWith.length > 0) && (
          <section className="sec tint">
            <div className="wrap">
              <div className="head">
                <span className="eyebrow"><T es="Sobre el evento" en="About the event" /></span>
                {leaveWith.length > 0 && <h2 className="disp"><T es="Con qué te vas" en="What you leave with" /></h2>}
              </div>
              {leaveWith.length > 0 && (
                <ul className="speakers">
                  {leaveWith.map((item, i) => <li key={i} className="speaker" style={{ background: 'var(--white)', alignItems: 'center' }}><Tick /><strong>{item}</strong></li>)}
                </ul>
              )}
              {description && <div className="prose" style={{ marginTop: 36 }} dangerouslySetInnerHTML={{ __html: description }} />}
            </div>
          </section>
        )}

        {agenda.length > 0 && (
          <section className="sec">
            <div className="wrap">
              <div className="head">
                <span className="eyebrow"><T es="Programa" en="Agenda" /></span>
                <h2 className="disp">{ev.agendaHeading || <T es="Cómo va a ir" en="How it runs" />}</h2>
              </div>
              <ol className="agenda">
                {agenda.map(a => (
                  <li key={a.id}>
                    <span className="t">{a.time}</span>
                    <div>
                      <h3 style={{ fontSize: 19 }}>{a.title}</h3>
                      {a.description && <p>{a.description}</p>}
                      {speakerName(a.speakerId) && <div className="who">{speakerName(a.speakerId)}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {speakers.length > 0 && (
          <section className={agenda.length > 0 ? 'sec tint' : 'sec'}>
            <div className="wrap">
              <div className="head">
                <span className="eyebrow">{speakers.length === 1 ? <T es="Tu anfitrión" en="Your host" /> : <T es="Ponentes" en="Speakers" />}</span>
              </div>
              <div className="speakers">
                {speakers.map(s => (
                  <div key={s.id} className="speaker" style={agenda.length > 0 ? { background: 'var(--white)' } : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- speaker photos are external URLs */}
                    {s.photo && <img src={s.photo} alt="" width={72} height={72} />}
                    <div>
                      <h3>{s.name}</h3>
                      {s.title && <div className="role">{s.title}</div>}
                      {s.bio && <p>{s.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {faq.length > 0 && (
          <section className="sec">
            <div className="wrap">
              <div className="head">
                <span className="eyebrow"><T es="Preguntas frecuentes" en="FAQ" /></span>
                <h2 className="disp"><T es="Lo que te estás preguntando." en="What you're wondering." /></h2>
              </div>
              <div className="faq-list">
                {faq.map(q => (
                  <details key={q.id} className="qa">
                    <summary><span>{q.question}</span><span className="pm">+</span></summary>
                    <p>{q.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {!past && (
          <section className="sec final">
            <div className="wrap">
              <span className="eyebrow">{price ? <T es={`Entrada ${price}`} en={`Ticket ${price}`} /> : <T es="Plazas limitadas" en="Limited seats" />}</span>
              <h2 className="disp">{ev.closingLine || <T es={<>Te guardo un sitio. <span className="hl">Solo tienes que reservarlo.</span></>} en={<>I&apos;ll save you a seat. <span className="hl">You just have to claim it.</span></>} />}</h2>
              <a className="btn btn-navy" href="#register"><T es="Reservar mi plaza" en="Save my seat" /><span className="arr">→</span></a>
              {ev.disclaimer && <p className="micro" style={{ maxWidth: 640 }}>{ev.disclaimer}</p>}
            </div>
          </section>
        )}
      </main>
      {!past && <MobileBar href="#register"><T es="Reservar mi plaza" en="Save my seat" /></MobileBar>}
    </>
  )
}
