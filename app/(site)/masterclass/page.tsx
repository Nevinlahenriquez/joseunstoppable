import type { Metadata } from 'next'
import Image from 'next/image'
import { T } from '@/components/site/bits'
import MobileBar from '@/components/site/MobileBar'
import { eventInstant } from '@/lib/event-time'
import { MASTERCLASS } from './config'
import Countdown from './Countdown'
import MasterclassForm from './MasterclassForm'

// Re-rendered every 10 minutes so the "next Thursday" date rolls over on its own.
export const revalidate = 600

export const metadata: Metadata = {
  title: 'Masterclass gratuita · José Unstoppable',
  description: 'En 45 minutos te enseño el método exacto para perder la barriga después de los 40 sin vivir en el gimnasio.',
  robots: { index: true, follow: true },
  openGraph: { title: 'Masterclass gratuita · José Unstoppable', images: ['/images/jose.jpg'] },
}

const TZ = 'Europe/Madrid'

function madridDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

// The configured date, or the next Thursday whose start time is still ahead.
function nextSession(now = new Date()): Date {
  const { date, time } = MASTERCLASS
  if (date) return eventInstant(date, time, TZ) ?? now
  for (let i = 0; i < 8; i++) {
    const day = new Date(now.getTime() + i * 864e5)
    const iso = madridDate(day)
    const start = eventInstant(iso, time, TZ)
    if (start && new Date(`${iso}T12:00:00Z`).getUTCDay() === 4 && start > now) return start
  }
  return now
}

function dateLabel(at: Date, locale: string) {
  return at.toLocaleDateString(locale, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
}

export default function MasterclassPage() {
  const start = nextSession()
  const startISO = start.toISOString()
  const es = dateLabel(start, 'es-ES')
  const en = dateLabel(start, 'en-GB')
  const online = MASTERCLASS.format === 'Online'
  const taken = Math.min(MASTERCLASS.capacity, MASTERCLASS.seatsTaken)

  return (
    <>
      <main>
        <section className="hero hero-top">
          <div className="wrap">
            <div className="hero-copy">
              <div className="chips">
                <span className="eyebrow"><T es="Masterclass gratuita" en="Free masterclass" /></span>
                <span className="chip-navy">{online ? <T es="En directo · Online" en="Live · Online" /> : <T es={`Presencial · ${MASTERCLASS.format}`} en={`In person · ${MASTERCLASS.format}`} />}</span>
              </div>
              <h1 className="disp">
                <T
                  es={<>Cómo perder la barriga después de los 40 <span className="hl">sin vivir en el gimnasio.</span></>}
                  en={<>How to lose the belly after 40 <span className="hl">without living at the gym.</span></>}
                />
              </h1>
              <p className="lead">
                <T
                  es={`En ${MASTERCLASS.minutes} minutos te enseño el método exacto que usé para cambiar mi cuerpo y mi confianza en 6 meses, y que ya ha ayudado a más de 100 personas.`}
                  en={`In ${MASTERCLASS.minutes} minutes I'll show you the exact method I used to change my body and confidence in 6 months, the same one that has helped 100+ people.`}
                />
              </p>
              <div className="facts">
                <div className="fact"><span><T es="Fecha" en="Date" /></span><b className="cap"><T es={es} en={en} /></b></div>
                <div className="fact"><span><T es="Hora" en="Time" /></span><b>{MASTERCLASS.time} CET</b></div>
              </div>
              <Countdown startISO={startISO} />
            </div>

            <div id="register" className="card">
              <MasterclassForm
                startISO={startISO}
                minutes={MASTERCLASS.minutes}
                time={MASTERCLASS.time}
                dateEs={es}
                dateEn={en}
                taken={taken}
                capacity={MASTERCLASS.capacity}
                eventId={MASTERCLASS.eventId}
              />
            </div>
          </div>
        </section>

        <section className="sec navy">
          <div className="wrap">
            <div className="head">
              <span className="eyebrow"><T es="En 45 minutos" en="In 45 minutes" /></span>
              <h2 className="disp"><T es="Lo que vas a aprender" en="What you'll learn" /></h2>
            </div>
            <div className="learn">
              <div>
                <span className="n">01</span>
                <h3><T es="Por qué el cardio no te quita la barriga" en="Why cardio isn't removing your belly" /></h3>
                <p><T es="Primero músculo, después grasa fuera: el error que te mantiene estancado." en="Muscle first, then fat loss: the mistake keeping you stuck." /></p>
              </div>
              <div>
                <span className="n">02</span>
                <h3><T es="Cómo comer sin dietas extremas" en="How to eat without extreme diets" /></h3>
                <p><T es="Una estructura sencilla que puedes mantener con tu vida real." en="A simple structure you can keep with your real life." /></p>
              </div>
              <div className="on">
                <span className="n">03</span>
                <h3><T es="La mentalidad para no volver atrás" en="The mindset to never go back" /></h3>
                <p><T es="Cómo cambié mis hábitos para siempre, y cómo puedes hacerlo tú." en="How I changed my habits for good, and how you can too." /></p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="wrap host">
            <div className="host-img">
              <Image src="/images/jose.jpg" alt="José Sánchez" fill sizes="(max-width: 900px) 100vw, 500px" style={{ objectFit: 'cover' }} />
            </div>
            <div className="host-copy">
              <span className="eyebrow"><T es="Tu anfitrión" en="Your host" /></span>
              <h2 className="disp">José Sánchez</h2>
              <p className="lead">
                <T
                  es="Hace un año no me reconocía en el espejo. Cambié mis hábitos, mi mentalidad y mi físico en 6 meses, y desde entonces he ayudado a más de 100 personas a hacer lo mismo."
                  en="A year ago I didn't recognise myself in the mirror. I changed my habits, mindset and body in 6 months, and I've since helped 100+ people do the same."
                />
              </p>
              <a className="btn btn-y" href="#register"><T es="Reservar mi plaza" en="Save my seat" /><span className="arr">→</span></a>
            </div>
          </div>
        </section>

        <section className="sec final">
          <div className="wrap">
            <span className="eyebrow"><T es="100% gratis" en="100% free" /></span>
            <h2 className="disp"><T es={<>Nos vemos el <span className="hl">{es}</span>.</>} en={<>See you on <span className="hl">{en}</span>.</>} /></h2>
            <a className="btn btn-navy" href="#register"><T es="Reservar mi plaza gratis" en="Save my free seat" /><span className="arr">→</span></a>
            <p className="micro"><T es={`${MASTERCLASS.minutes} minutos · En directo · Plazas limitadas`} en={`${MASTERCLASS.minutes} minutes · Live · Limited seats`} /></p>
          </div>
        </section>
      </main>
      <MobileBar href="#register"><T es="Reservar mi plaza gratis" en="Save my free seat" /></MobileBar>
    </>
  )
}
