'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { T } from '@/components/site/bits'
import useLang from '@/components/site/useLang'
import { GOAL_TAGS, LINKS, PRICE, WHATSAPP } from '@/lib/site'

type Opt = [es: string, en: string]
type Pick = 'urgency' | 'blocker' | 'ready' | 'invest'
type Step = {
  id: 'start' | 'goal' | Pick | 'slot'
  type: 'start' | 'multi' | 'scale' | 'choice' | 'slot'
  tagEs: string; tagEn: string
  es: string; en: string
  hintEs?: string; hintEn?: string
  options?: Opt[]
}

// Name and email first, so the visitor is a lead after one screen. Every later
// step is one tap and saves as it goes, so an unfinished form still reaches José.
const STEPS: Step[] = [
  { id: 'start', type: 'start', tagEs: 'Empezamos', tagEn: "Let's start", es: '¿Cómo te llamas y dónde te escribo?', en: 'What is your name and where can I reach you?' },
  { id: 'goal', type: 'multi', tagEs: 'Tu objetivo', tagEn: 'Your goal', es: '¿Qué quieres conseguir?', en: 'What do you want to achieve?', hintEs: 'Puedes elegir varias.', hintEn: 'Choose as many as apply.', options: [['Perder grasa', 'Lose fat'], ['Ganar músculo', 'Build muscle'], ['Ganar confianza', 'Gain confidence'], ['Más energía y salud', 'More energy and health']] },
  { id: 'urgency', type: 'scale', tagEs: 'Urgencia', tagEn: 'Urgency', es: 'Del 1 al 10, ¿qué tan urgente es para ti cambiar ahora?', en: 'From 1 to 10, how urgent is it for you to change now?' },
  { id: 'blocker', type: 'choice', tagEs: 'Obstáculos', tagEn: 'Obstacles', es: '¿Qué es lo que más te frena hoy?', en: "What's holding you back the most today?", options: [['Falta de tiempo', 'Lack of time'], ['No sé qué hacer', "I don't know what to do"], ['Falta de constancia', 'Lack of consistency'], ['Falta de motivación o apoyo', 'Lack of motivation or support']] },
  { id: 'ready', type: 'choice', tagEs: 'Compromiso', tagEn: 'Commitment', es: 'Con un plan hecho para ti y yo a tu lado, ¿estás listo para comprometerte 90 días?', en: 'With a plan made for you and me by your side, are you ready to commit for 90 days?', options: [['Sí, estoy listo', "Yes, I'm ready"], ['Lo tengo que pensar', 'I need to think about it'], ['Todavía no', 'Not yet']] },
  { id: 'invest', type: 'choice', tagEs: 'Inversión', tagEn: 'Investment', es: `El programa es una inversión de ${PRICE} €. Si en la llamada todo encaja, ¿puedes invertirlo?`, en: `The program is a ${PRICE} € investment. If everything fits on the call, can you invest it?`, options: [['Sí, puedo invertirlo', 'Yes, I can invest it'], ['Sí, con opciones de pago', 'Yes, with payment options'], ['No ahora mismo', 'Not right now']] },
  { id: 'slot', type: 'slot', tagEs: 'Agenda', tagEn: 'Schedule', es: 'Elige día y hora para tu llamada', en: 'Pick a day and time for your call' },
]

// Shown when the agenda can't be reached: weekdays and José's usual hours.
const FALLBACK_TIMES = ['10:00', '12:00', '17:00', '19:00']

type Answers = { goal: number[]; goalNote: string } & Partial<Record<Pick, number>>
type Avail = { date: string; slots: { label: string; start: string }[] }[]

const optOf = (id: Step['id'], i: number | undefined, li: 0 | 1) => i === undefined ? '' : STEPS.find(x => x.id === id)!.options![i][li]
const cookie = (n: string) => { const m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : '' }
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
const validPhone = (v: string) => v.replace(/\D/g, '').length >= 9

// Anti-spam: when the form appeared, and a hidden field only bots fill in.
let shownAt = 0
const honeypot = () => (document.getElementById('bk-hp') as HTMLInputElement | null)?.value ?? ''

function post(path: string, body: Record<string, unknown>) {
  try {
    fetch(path, {
      method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, hp: honeypot(), elapsedMs: shownAt ? Date.now() - shownAt : undefined, pageUrl: location.href, referrer: document.referrer || '', fbc: cookie('_fbc'), fbp: cookie('_fbp'), landing: cookie('ju_src'), visitorId: cookie('ju_vid') }),
    }).catch(() => {})
  } catch {}
}

function fallbackDays() {
  const out: Date[] = []
  const d = new Date(); d.setHours(0, 0, 0, 0)
  while (out.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) out.push(new Date(d)) }
  return out
}

// José's copy of the answers, always in Spanish.
function answersEs(a: Answers) {
  return [
    ['Objetivo', a.goal.map(i => optOf('goal', i, 0)).join(', ') + (a.goalNote.trim() ? ' — ' + a.goalNote.trim() : '')],
    ['Urgencia', a.urgency ? a.urgency + '/10' : ''],
    ['Lo que más le frena', optOf('blocker', a.blocker, 0)],
    ['Listo para 90 días', optOf('ready', a.ready, 0)],
    ['Inversión ' + PRICE + ' €', optOf('invest', a.invest, 0)],
  ].filter(r => r[1]).map(r => r[0] + ': ' + r[1]).join('\n')
}

export default function BookingFlow() {
  const lang = useLang()
  const es = lang !== 'en'
  const [step, setStep] = useState(0)
  const [a, setAns] = useState<Answers>({ goal: [], goalNote: '' })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [avail, setAvail] = useState<Avail | null>(null)
  const [result, setResult] = useState<null | 'booked' | 'notFit'>(null)
  const [waUrl, setWaUrl] = useState('')
  const started = useRef(false)
  const advancing = useRef(false)

  useEffect(() => {
    shownAt = Date.now()
    fetch('/api/booking').then(r => r.json()).then(j => {
      if (j?.ok && Array.isArray(j.days) && j.days.length) setAvail(j.days)
    }).catch(() => {})
  }, [])

  const days = useMemo(() => avail ? avail.map(x => new Date(x.date + 'T12:00:00')) : fallbackDays(), [avail])
  const times = avail ? (day !== null && avail[day] ? avail[day].slots.map(x => x.label) : []) : FALLBACK_TIMES
  const slotStart = avail && day !== null && time !== null ? avail[day]?.slots[time]?.start ?? null : null

  const st = STEPS[step]
  const total = STEPS.length
  const loc = es ? 'es-ES' : 'en-GB'
  const firstName = name.trim().split(' ')[0]
  const dayLabel = day !== null && days[day] ? days[day].toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const slotLabel = dayLabel && time !== null ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1) + ' · ' + times[time] : ''
  const valid =
    st.type === 'start' ? name.trim().length >= 2 && validEmail(email) && (!phone.trim() || validPhone(phone)) && consent
    : st.type === 'multi' ? a.goal.length > 0
    : st.type === 'slot' ? day !== null && time !== null && validPhone(phone)
    : a[st.id as Pick] !== undefined

  const contact = () => ({ name: name.trim(), email: email.trim().toLowerCase(), whatsapp: phone.trim(), lang })

  // Each step updates the same lead card in the pipeline.
  function saveProgress(next: Answers, note: string) {
    post('/api/crm-lead', {
      ...contact(), source: 'reserva', countedByCaller: true,
      tags: ['Formulario llamada', ...next.goal.map(i => GOAL_TAGS[i])],
      desiredOutcome: next.goal.map(i => optOf('goal', i, 0)).join(', ') || undefined,
      budget: optOf('invest', next.invest, 0) || undefined,
      formAnswers: answersEs(next) + '\n' + note,
    })
  }

  function summary(label: string) {
    const rows: [string, string][] = es ? [
      ['Email', email], ['Objetivo', a.goal.map(i => optOf('goal', i, 0)).join(', ')], ['Urgencia', a.urgency ? a.urgency + '/10' : ''],
      ['Lo que más me frena', optOf('blocker', a.blocker, 0)], ['Listo para 90 días', optOf('ready', a.ready, 0)], ['Inversión', optOf('invest', a.invest, 0)],
    ] : [
      ['Email', email], ['Goal', a.goal.map(i => optOf('goal', i, 1)).join(', ')], ['Urgency', a.urgency ? a.urgency + '/10' : ''],
      ['What holds me back', optOf('blocker', a.blocker, 1)], ['Ready for 90 days', optOf('ready', a.ready, 1)], ['Investment', optOf('invest', a.invest, 1)],
    ]
    const head = label
      ? (es ? `Hola José, soy ${name.trim()}. Acabo de reservar mi llamada gratuita: ${label}.` : `Hi José, I'm ${name.trim()}. I just booked my free call: ${label}.`)
      : (es ? `Hola José, soy ${name.trim()}. Acabo de rellenar el formulario.` : `Hi José, I'm ${name.trim()}. I just filled in the form.`)
    return head + '\n\n' + rows.filter(r => r[1]).map(r => '• ' + r[0] + ': ' + r[1]).join('\n')
  }

  function sendWa(text: string) {
    const url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text)
    setWaUrl(url)
    try { if (!window.open(url, '_blank')) window.location.assign(url) } catch { window.location.assign(url) }
  }

  // Moves on from the current step with the answers as they now stand.
  function advance(next: Answers) {
    if (st.type === 'start') {
      if (!started.current) {
        started.current = true
        post('/api/lead', { ...contact(), source: 'reserva', stage: 'started', message: 'Empezó el formulario de llamada.' })
      }
      setStep(1); return
    }
    if (st.id === 'invest' && (next.ready === 2 || next.invest === 2)) {
      saveProgress(next, 'Resultado: no encaja ahora.')
      setResult('notFit'); return
    }
    if (st.type === 'slot') {
      const call = days[day!].toISOString().slice(0, 10) + ' ' + times[time!]
      post('/api/booking', { ...contact(), start: slotStart, slotLabel: call, answers: answersEs(next), qualified: true })
      setResult('booked'); sendWa(summary(slotLabel)); return
    }
    saveProgress(next, 'Paso alcanzado: ' + STEPS[step + 1].tagEs + '.')
    setStep(s => s + 1)
  }

  function next() { if (valid) advance(a) }

  // One-tap steps move on by themselves after a short beat.
  function pick(id: Pick, i: number) {
    const nextA = { ...a, [id]: i }
    setAns(nextA)
    if (advancing.current) return
    advancing.current = true
    setTimeout(() => { advancing.current = false; advance(nextA) }, 220)
  }

  const fallbackWa = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(summary(result === 'booked' ? slotLabel : ''))
  const backBtn = step > 0 && <button type="button" className="bk-back" aria-label={es ? 'Atrás' : 'Back'} onClick={() => setStep(s => Math.max(0, s - 1))}>←</button>

  if (result === 'booked') return (
    <div className="bk-card">
      <div className="bk-body bk-done">
        <span className="bk-ok" aria-hidden="true">✓</span>
        <h2 className="disp bk-title">{es ? `Listo, ${firstName}. Nos vemos pronto.` : `Done, ${firstName}. Talk soon.`}</h2>
        <p className="bk-p">
          {es ? 'Tu llamada:' : 'Your call:'} <strong>{slotLabel}</strong>.{' '}
          {es ? <>Te llega la confirmación por email. Se ha abierto WhatsApp con tus respuestas: <strong>pulsa enviar</strong> y te confirmo yo mismo.</> : <>Your confirmation is on its way by email. WhatsApp has opened with your answers: <strong>press send</strong> and I&apos;ll confirm personally.</>}
        </p>
        <a className="btn bk-wa" href={waUrl || fallbackWa} target="_blank" rel="noopener">{es ? '¿No se abrió? Enviar por WhatsApp' : "Didn't open? Send on WhatsApp"}</a>
        <Link className="bk-link" href={LINKS.home}>{es ? 'Volver a la web' : 'Back to the site'}</Link>
      </div>
    </div>
  )

  if (result === 'notFit') return (
    <div className="bk-card">
      <div className="bk-body bk-done">
        <h2 className="disp bk-title">{es ? `Gracias por tu sinceridad, ${firstName}.` : `Thank you for your honesty, ${firstName}.`}</h2>
        <p className="bk-p">{es ? 'Parece que ahora mismo no es el momento ideal para la llamada. Mientras tanto, la masterclass gratuita te ayuda a empezar, y cuando estés listo, aquí estaré.' : "It looks like right now isn't the ideal moment for the call. Meanwhile, the free masterclass will help you get started, and when you're ready, I'll be here."}</p>
        <Link className="btn btn-y bk-full" href={LINKS.webinar}>{es ? 'Ver la masterclass gratuita' : 'Watch the free masterclass'}<span className="arr">→</span></Link>
        <a className="btn bk-wa" href={fallbackWa} target="_blank" rel="noopener">{es ? 'Escribir a José por WhatsApp' : 'Message José on WhatsApp'}</a>
      </div>
    </div>
  )

  return (
    <div className="bk-card">
      <div className="bk-prog">
        <div className="bk-prog-h"><span>{step + 1} / {total}</span><span><T es={st.tagEs} en={st.tagEn} /></span></div>
        <div className="bk-track"><div style={{ width: ((step + 1) / total * 100) + '%' }} /></div>
      </div>

      <form className="bk-body" key={st.id} onSubmit={e => { e.preventDefault(); next() }}>
        <h2 className="bk-q"><T es={st.es} en={st.en} /></h2>
        {st.hintEs && <span className="bk-hint"><T es={st.hintEs} en={st.hintEn!} /></span>}

        {st.type === 'start' && (
          <>
            <input id="bk-hp" name="bk_company_url" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            <label className="bk-field"><span><T es="Nombre y apellido" en="First and last name" /></span><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" autoFocus /></label>
            <label className="bk-field"><span>Email</span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" inputMode="email" placeholder={es ? 'tu@email.com' : 'you@email.com'} /></label>
            <label className="bk-field"><span><T es="WhatsApp (opcional)" en="WhatsApp (optional)" /></span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="+34 600 000 000" /></label>
            <label className="bk-consent">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>{es ? <>Acepto la <Link href={LINKS.privacy} target="_blank">política de privacidad</Link>. José usará mis datos solo para preparar la llamada.</> : <>I accept the <Link href={LINKS.privacy} target="_blank">privacy policy</Link>. José will only use my details to prepare the call.</>}</span>
            </label>
          </>
        )}

        {st.type === 'multi' && (
          <>
            <div className="bk-list" role="group">
              {st.options!.map((o, i) => {
                const sel = a.goal.includes(i)
                return (
                  <button key={i} type="button" role="checkbox" aria-checked={sel} className="bk-opt bk-choice multi"
                    onClick={() => setAns(s => ({ ...s, goal: sel ? s.goal.filter(x => x !== i) : [...s.goal, i] }))}>
                    <span className="bk-dot" aria-hidden="true" /><T es={o[0]} en={o[1]} />
                  </button>
                )
              })}
            </div>
            <label className="bk-field"><span><T es="¿Algo concreto que quieras contarme? (opcional)" en="Anything specific to tell me? (optional)" /></span>
              <textarea value={a.goalNote} onChange={e => setAns(s => ({ ...s, goalNote: e.target.value }))} rows={2} />
            </label>
          </>
        )}

        {st.type === 'scale' && (
          <div className="bk-scale" role="radiogroup" aria-label={es ? st.es : st.en}>
            {Array.from({ length: 10 }, (_, i) => (
              <button key={i} type="button" role="radio" aria-checked={a.urgency === i + 1} className="bk-opt bk-num" onClick={() => pick('urgency', i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}

        {st.type === 'choice' && (
          <div className="bk-list" role="radiogroup">
            {st.options!.map((o, i) => (
              <button key={i} type="button" role="radio" aria-checked={a[st.id as Pick] === i} className="bk-opt bk-choice" onClick={() => pick(st.id as Pick, i)}>
                <span className="bk-dot" aria-hidden="true" /><T es={o[0]} en={o[1]} />
              </button>
            ))}
          </div>
        )}

        {st.type === 'slot' && (
          <>
            <div className="bk-days">
              {days.map((d, i) => (
                <button key={i} type="button" aria-pressed={day === i} className="bk-opt bk-day" onClick={() => { setDay(i); setTime(null) }}>
                  <span>{d.toLocaleDateString(loc, { weekday: 'short' })}</span><b>{d.getDate()}</b>
                </button>
              ))}
            </div>
            {day === null
              ? <span className="bk-hint">{es ? 'Elige un día para ver las horas libres.' : 'Pick a day to see the free times.'}</span>
              : times.length > 0
                ? <div className="bk-times">{times.map((t, i) => <button key={t + i} type="button" aria-pressed={time === i} className="bk-opt bk-time" onClick={() => setTime(i)}>{t}</button>)}</div>
                : <span className="bk-hint">{es ? 'No quedan horas este día. Prueba otro.' : 'No times left that day. Try another.'}</span>}
            <label className="bk-field"><span><T es="Tu WhatsApp, para confirmarte la llamada" en="Your WhatsApp, to confirm the call" /></span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="+34 600 000 000" /></label>
            <span className="bk-hint">{es ? 'Hora de España (CET).' : 'Spain time (CET).'}</span>
          </>
        )}

        <div className="bk-nav">
          {backBtn}
          {st.type === 'scale' || st.type === 'choice'
            ? <span className="bk-hint bk-tap"><T es="Toca una opción para seguir." en="Tap an option to continue." /></span>
            : <button type="submit" className="btn btn-y bk-next" disabled={!valid}>
                {st.type === 'slot' ? <T es="Reservar mi llamada" en="Book my call" /> : st.type === 'start' ? <T es="Empezar" en="Start" /> : <T es="Siguiente" en="Next" />}
                <span className="arr">→</span>
              </button>}
        </div>
      </form>
    </div>
  )
}
