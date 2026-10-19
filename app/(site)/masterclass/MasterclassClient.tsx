'use client'

import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { jakarta } from '../font'
import { LangBoot, useLang } from '@/lib/site/lang'
import { SiteTrack } from '@/lib/site/track'
import { sitePost } from '@/lib/site/post'

// Defaults from the template's data-props.
const EVENT_DATE = ''
const EVENT_TIME = '20:00'
const FORMAT = 'Online'
const CAPACITY = 100
const SEATS_TAKEN = 63
const EVENT_ID = 'masterclass-1'
const WHATSAPP = '34649764886'

const F = 'var(--f)'

// The clock ticks once a second on the client only. The server snapshot is 0,
// so the countdown and the date labels render after mount and never mismatch.
let nowVal = 0
let timer: ReturnType<typeof setInterval> | undefined
const nowSubs = new Set<() => void>()
function subscribeNow(fn: () => void) {
  nowSubs.add(fn)
  if (!timer) {
    nowVal = Date.now()
    timer = setInterval(() => {
      nowVal = Date.now()
      nowSubs.forEach(f => f())
    }, 1000)
  }
  return () => {
    nowSubs.delete(fn)
    if (!nowSubs.size && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}
function getNow() {
  if (!nowVal) nowVal = Date.now()
  return nowVal
}
function useNow(): number {
  return useSyncExternalStore(subscribeNow, getNow, () => 0)
}

type StoredLead = { source?: string } & Record<string, unknown>

function eventDate(): Date {
  const d = EVENT_DATE, t = EVENT_TIME
  if (d) return new Date(d + 'T' + t + ':00')
  const n = new Date()
  n.setDate(n.getDate() + ((4 - n.getDay() + 7) % 7 || 7))
  const [h, m] = t.split(':')
  n.setHours(+h, +m, 0, 0)
  return n
}

function storedLeads(): StoredLead[] {
  try {
    const a: unknown = JSON.parse(localStorage.getItem('unstoppable_leads') || '[]')
    return Array.isArray(a) ? (a as StoredLead[]) : []
  } catch {
    return []
  }
}

const iso = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
const pad = (n: number) => String(n).padStart(2, '0')

const langBtn: CSSProperties = {
  minWidth: 52, height: 44, border: 0, borderRadius: 999, fontFamily: F,
  fontWeight: 700, fontSize: 16, cursor: 'pointer',
}
const fieldLabel: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600, fontSize: 17 }
const fieldInput: CSSProperties = {
  height: 64, padding: '0 20px', borderRadius: 16, border: '1.5px solid #DDE9F2',
  fontSize: 20, fontFamily: 'inherit',
}
const infoBox: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 20px', borderRadius: 18,
  background: '#F1F8FD', flex: '1 1 auto',
}
const infoKey: CSSProperties = {
  fontFamily: F, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5D6E7E',
}
const highlight: CSSProperties = {
  background: '#5BBCEE', padding: '0 8px', borderRadius: 10,
  boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone',
}
const card: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12, padding: '30px 28px', borderRadius: 24, background: '#163C5C',
}
const cardNum: CSSProperties = { fontFamily: F, fontSize: 14, color: '#5BBCEE' }
const cardH3: CSSProperties = { margin: 0, fontFamily: F, fontWeight: 800, fontSize: 22, lineHeight: 1.2 }

export default function MasterclassClient() {
  const [lang, setLang] = useLang()
  const now = useNow()
  const mounted = now !== 0
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const es = lang !== 'en'
  const ev = eventDate()
  const diff = Math.max(0, +ev - now)
  const cap = CAPACITY
  const reg = mounted ? storedLeads().filter(l => l.source === 'Webinar').length : 0
  const taken = Math.min(cap, SEATS_TAKEN + reg)
  const valid = Boolean(name.trim()) && phone.replace(/\D/g, '').length >= 9
  const waPhone = WHATSAPP.replace(/\D/g, '')
  const fmt = FORMAT
  const dateLabel = mounted
    ? ev.toLocaleDateString(es ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const timeLabel = EVENT_TIME
  const regText =
    (es
      ? 'Hola José, soy ' + name.trim() + '. Me apunto a la masterclass gratuita del ' + dateLabel + ' a las ' + timeLabel + ' CET.'
      : "Hi José, I'm " + name.trim() + '. Please save my seat for the free masterclass on ' + dateLabel + ' at ' + timeLabel + ' CET.') +
    '\n\n• WhatsApp: ' + phone.trim() + '\n• Email: ' + (email.trim() || '—')
  const waConfirm = 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(regText)
  const gcalLink = mounted
    ? 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
      encodeURIComponent('Masterclass José Unstoppable') + '&dates=' + iso(ev) + '/' + iso(new Date(+ev + 45 * 6e4))
    : undefined

  const countdown = mounted
    ? [
        { v: pad(Math.floor(diff / 864e5)), es: 'días', en: 'days' },
        { v: pad(Math.floor(diff / 36e5) % 24), es: 'horas', en: 'hours' },
        { v: pad(Math.floor(diff / 6e4) % 60), es: 'min', en: 'min' },
        { v: pad(Math.floor(diff / 1e3) % 60), es: 'seg', en: 'sec' },
      ]
    : [
        { v: '00', es: 'días', en: 'days' },
        { v: '00', es: 'horas', en: 'hours' },
        { v: '00', es: 'min', en: 'min' },
        { v: '00', es: 'seg', en: 'sec' },
      ]

  const register = () => {
    if (!valid) return
    try {
      const a = storedLeads()
      a.unshift({
        id: 'w' + Date.now(), name, phone, email, source: 'Webinar', stage: 'new', lang,
        created: new Date().toISOString(), event: EVENT_ID,
      })
      localStorage.setItem('unstoppable_leads', JSON.stringify(a))
    } catch {}
    sitePost('/api/lead', {
      name: name.trim(), email: email.trim(), whatsapp: phone.trim(), lang, source: 'masterclass',
      message: 'Masterclass: ' + dateLabel + ' · ' + timeLabel + ' CET',
    })
    setDone(true)
    const url = waConfirm
    try {
      if (!window.open(url, '_blank')) location.href = url
    } catch {
      location.href = url
    }
  }

  return (
    <div className={`pg-masterclass ${jakarta.variable}`}>
      <LangBoot />
      <SiteTrack />
      <header style={{ borderBottom: '1px solid #E9F3FA' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '14px clamp(20px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ fontFamily: F, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>JOSÉ</span>
            <span style={{ fontFamily: F, fontSize: 12, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', background: '#5BBCEE', padding: '4px 8px', borderRadius: 6 }}>Unstoppable</span>
          </Link>
          <div style={{ marginLeft: 'auto', display: 'flex', padding: 4, borderRadius: 999, background: '#F1F8FD' }}>
            <button type="button" onClick={() => setLang('es')} style={{ ...langBtn, background: es ? '#0C2A43' : 'transparent', color: es ? '#FFFFFF' : '#0C2A43' }}>ES</button>
            <button type="button" onClick={() => setLang('en')} style={{ ...langBtn, background: es ? 'transparent' : '#0C2A43', color: es ? '#0C2A43' : '#FFFFFF' }}>EN</button>
          </div>
        </div>
      </header>

      <section data-screen-label="Webinar hero" style={{ padding: 'clamp(40px,6vw,80px) clamp(20px,4vw,40px) clamp(56px,7vw,96px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,460px),1fr))', gap: 'clamp(32px,5vw,72px)', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontFamily: F, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#5BBCEE', border: '1.5px solid #DDE9F2', padding: '6px 12px', borderRadius: 8 }}><span data-es="">Masterclass gratuita</span><span data-en="">Free masterclass</span></span>
              <span style={{ fontFamily: F, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#0C2A43', color: '#FFFFFF', padding: '8px 12px', borderRadius: 8 }}>
                <span data-es="">{fmt === 'Online' ? 'En directo · Online' : 'Presencial · ' + fmt}</span>
                <span data-en="">{fmt === 'Online' ? 'Live · Online' : 'In person · ' + fmt}</span>
              </span>
            </div>
            <h1 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 'clamp(34px,5vw,66px)', lineHeight: 1, letterSpacing: '-0.03em', textWrap: 'balance' }}>
              <span data-es="">Cómo perder la barriga después de los 40 <span style={highlight}>sin vivir en el gimnasio</span></span>
              <span data-en="">How to lose the belly after 40 <span style={highlight}>without living at the gym</span></span>
            </h1>
            <p style={{ margin: 0, fontSize: 'clamp(17px,1.4vw,20px)', color: '#344A5E', textWrap: 'pretty' }}><span data-es="">En 45 minutos te enseño el método exacto que usé para cambiar mi cuerpo y mi confianza en 6 meses, y que ya ha ayudado a más de 100 personas.</span><span data-en="">In 45 minutes I&apos;ll show you the exact method I used to change my body and confidence in 6 months — the same one that has helped 100+ people.</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ ...infoBox, minWidth: 200 }}>
                <span style={infoKey}><span data-es="">Fecha</span><span data-en="">Date</span></span>
                <span style={{ fontFamily: F, fontWeight: 800, fontSize: 22, textTransform: 'capitalize' }}>{dateLabel}</span>
              </div>
              <div style={infoBox}>
                <span style={infoKey}><span data-es="">Hora</span><span data-en="">Time</span></span>
                <span style={{ fontFamily: F, fontWeight: 800, fontSize: 22 }}>{timeLabel} CET</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontFamily: F, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5D6E7E' }}><span data-es="">Empieza en</span><span data-en="">Starts in</span></span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,96px))', gap: 10 }}>
                {countdown.map(c => (
                  <div key={c.en} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '14px 0', borderRadius: 16, background: '#0C2A43', color: '#FFFFFF' }}>
                    <span style={{ fontFamily: F, fontWeight: 800, fontSize: 36, lineHeight: 1, color: '#5BBCEE', fontVariantNumeric: 'tabular-nums' }}>{c.v}</span>
                    <span style={{ fontSize: 13, color: '#DDE9F2' }}><span data-es="">{c.es}</span><span data-en="">{c.en}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div id="register" style={{ background: '#FFFFFF', border: '1.5px solid #DDE9F2', borderRadius: 28, boxShadow: '0 24px 60px -28px rgba(12,42,67,.22)', padding: 'clamp(24px,3vw,36px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {!done ? (
              <>
                <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 25, lineHeight: 1.15 }}><span data-es="">Reserva tu plaza gratis</span><span data-en="">Save your free seat</span></h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600 }}><span><span data-es="">Plazas ocupadas</span><span data-en="">Seats taken</span></span><span style={{ fontFamily: F }}>{taken} / {cap}</span></div>
                <div style={{ height: 10, borderRadius: 99, background: '#F1F8FD', overflow: 'hidden' }}><div style={{ height: '100%', width: (taken / cap) * 100 + '%', background: '#5BBCEE', borderRight: '2px solid #0C2A43' }} /></div>
                <label style={fieldLabel}><span><span data-es="">Nombre</span><span data-en="">Name</span></span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" style={fieldInput} /></label>
                <label style={fieldLabel}><span>WhatsApp</span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+34 600 000 000" style={fieldInput} /></label>
                <label style={fieldLabel}><span><span data-es="">Email (opcional)</span><span data-en="">Email (optional)</span></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" style={fieldInput} /></label>
                <button type="button" onClick={register} disabled={!valid} style={{ minHeight: 64, borderRadius: 999, border: '2px solid #5BBCEE', background: '#5BBCEE', fontFamily: F, fontWeight: 800, fontSize: 19, cursor: 'pointer', color: '#0C2A43', opacity: valid ? 1 : 0.45 }}><span data-es="">Reservar plaza por WhatsApp →</span><span data-en="">Save my seat on WhatsApp →</span></button>
                <span style={{ fontSize: 15, color: '#5D6E7E', textAlign: 'center' }}><span data-es="">100% gratis. Se abrirá WhatsApp: pulsa enviar y te mandamos el enlace.</span><span data-en="">100% free. WhatsApp will open: press send and we&apos;ll send you the link.</span></span>
              </>
            ) : (
              <>
                <span style={{ width: 72, height: 72, borderRadius: '50%', background: '#5BBCEE', border: '1.5px solid #DDE9F2', display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 800 }}>✓</span>
                <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 28, lineHeight: 1.05 }}><span data-es="">¡Tienes tu plaza, {name}!</span><span data-en="">Your seat is saved, {name}!</span></h2>
                <p style={{ margin: 0, fontSize: 19, color: '#344A5E' }}><span data-es="">Nos vemos el</span><span data-en="">See you on</span> <strong style={{ textTransform: 'capitalize' }}>{dateLabel}</strong> · {timeLabel} CET.</p>
                <a href={waConfirm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64, borderRadius: 999, background: '#5BBCEE', border: '1.5px solid #DDE9F2', color: '#0C2A43', textDecoration: 'none', fontFamily: F, fontWeight: 800, fontSize: 20 }}><span data-es="">¿No se abrió? Enviar por WhatsApp →</span><span data-en="">Didn&apos;t open? Send on WhatsApp →</span></a>
                <a href={gcalLink} target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64, borderRadius: 999, background: '#0C2A43', color: '#FFFFFF', textDecoration: 'none', fontFamily: F, fontWeight: 700, fontSize: 18 }}><span data-es="">Añadir a mi calendario</span><span data-en="">Add to my calendar</span></a>
              </>
            )}
          </div>
        </div>
      </section>

      <section data-screen-label="What you'll learn" style={{ background: '#0C2A43', color: '#FFFFFF', padding: 'clamp(52px,8vw,104px) clamp(18px,4vw,40px)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 44 }}>
          <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 'clamp(30px,4.2vw,52px)', lineHeight: 1.02, letterSpacing: '-0.025em' }}><span data-es="">Lo que vas a aprender</span><span data-en="">What you&apos;ll learn</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16 }}>
            <div style={card}><span style={cardNum}>01</span><h3 style={cardH3}><span data-es="">Por qué el cardio no te quita la barriga</span><span data-en="">Why cardio isn&apos;t removing your belly</span></h3><p style={{ margin: 0, fontSize: 17, color: '#DDE9F2' }}><span data-es="">Primero músculo, después grasa fuera: el error que te mantiene estancado.</span><span data-en="">Muscle first, then fat loss — the mistake keeping you stuck.</span></p></div>
            <div style={card}><span style={cardNum}>02</span><h3 style={cardH3}><span data-es="">Cómo comer sin dietas extremas</span><span data-en="">How to eat without extreme diets</span></h3><p style={{ margin: 0, fontSize: 17, color: '#DDE9F2' }}><span data-es="">Una estructura sencilla que puedes mantener con tu vida real.</span><span data-en="">A simple structure you can keep with your real life.</span></p></div>
            <div style={{ ...card, background: '#5BBCEE', color: '#0C2A43' }}><span style={{ fontFamily: F, fontSize: 14 }}>03</span><h3 style={cardH3}><span data-es="">La mentalidad para no volver atrás</span><span data-en="">The mindset to never go back</span></h3><p style={{ margin: 0, fontSize: 18 }}><span data-es="">Cómo cambié mis hábitos para siempre, y cómo puedes hacerlo tú.</span><span data-en="">How I changed my habits for good — and how you can too.</span></p></div>
          </div>
        </div>
      </section>

      <section data-screen-label="Host" style={{ padding: 'clamp(52px,8vw,104px) clamp(18px,4vw,40px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,380px),1fr))', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
          <div style={{ height: 420, position: 'relative', borderRadius: 28, overflow: 'hidden' }}>
            <Image src="/images/site/jose.jpg" alt="José Sánchez" fill sizes="(max-width: 860px) 100vw, 520px" style={{ objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span style={{ fontFamily: F, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5D6E7E' }}><span data-es="">Tu anfitrión</span><span data-en="">Your host</span></span>
            <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 'clamp(30px,4vw,48px)', lineHeight: 1.02, letterSpacing: '-0.025em' }}>José Sánchez</h2>
            <p style={{ margin: 0, fontSize: 18, color: '#344A5E', textWrap: 'pretty' }}><span data-es="">Hace un año no me reconocía en el espejo. Cambié mis hábitos, mi mentalidad y mi físico en 6 meses, y desde entonces he ayudado a más de 100 personas a hacer lo mismo.</span><span data-en="">A year ago I didn&apos;t recognise myself in the mirror. I changed my habits, mindset and body in 6 months — and I&apos;ve since helped 100+ people do the same.</span></p>
            <a href="#register" className="mc-cta" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', minHeight: 64, padding: '12px 28px', maxWidth: '100%', textAlign: 'center', borderRadius: 999, background: '#5BBCEE', border: '1.5px solid #DDE9F2', boxShadow: '0 24px 60px -28px rgba(12,42,67,.22)', textDecoration: 'none', fontFamily: F, fontWeight: 800, fontSize: 20 }}><span data-es="">Reservar mi plaza →</span><span data-en="">Save my seat →</span></a>
          </div>
        </div>
      </section>

      <footer className="m-foot-pad" style={{ background: '#0C2A43', color: '#DDE9F2', padding: '36px clamp(20px,4vw,40px)', textAlign: 'center', fontSize: 15 }}>© José Sánchez · José Unstoppable</footer>
    </div>
  )
}
