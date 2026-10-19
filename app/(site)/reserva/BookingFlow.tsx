'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useLang from '@/components/site/useLang'
import { LINKS, PRICE, WHATSAPP } from '@/lib/site'

type Opt = [es: string, en: string]
type Field = { k: string; es: string; en: string; rows: number }
type Step = {
  id: string
  type: 'fields' | 'scale' | 'choice' | 'multi' | 'contact' | 'slot'
  tagEs: string; tagEn: string
  es: string; en: string
  hintEs?: string; hintEn?: string
  fields?: Field[]
  options?: Opt[]
  req: string[]
}

const STEPS: Step[] = [
  { id: 'name', type: 'fields', tagEs: 'Sobre ti', tagEn: 'About you', es: 'Tu nombre y apellido', en: 'Your first and last name', fields: [{ k: 'name', es: '', en: '', rows: 1 }], req: ['name'] },
  { id: 'urgency', type: 'scale', tagEs: 'Urgencia', tagEn: 'Urgency', es: 'Del 1 al 10, ¿qué tan urgente es para ti cambiar tu físico ahora mismo?', en: 'From 1 to 10, how urgent is it for you to change your body right now?', fields: [{ k: 'urgencyWhy', es: '¿Por qué ese número y no uno más bajo?', en: 'Why that number and not a lower one?', rows: 3 }], req: ['urgency'] },
  { id: 'history', type: 'fields', tagEs: 'Tu historia', tagEn: 'Your history', es: '¿Cuánto tiempo llevas intentando cambiar tu físico y qué has probado hasta hoy?', en: 'How long have you been trying to change your body, and what have you tried so far?', hintEs: 'Dietas, gimnasio, apps…', hintEn: 'Diets, gym, apps…', fields: [{ k: 'tried', es: 'Lo que he probado', en: 'What I have tried', rows: 3 }, { k: 'whyFailed', es: '¿Por qué crees que no te funcionó a largo plazo?', en: "Why do you think it didn't work long term?", rows: 3 }], req: ['tried'] },
  { id: 'blocker', type: 'choice', tagEs: 'Obstáculos', tagEn: 'Obstacles', es: '¿Qué es lo que más te frena hoy?', en: "What's holding you back the most today?", options: [['Falta de tiempo', 'Lack of time'], ['No sé qué hacer', "I don't know what to do"], ['Falta de constancia', 'Lack of consistency'], ['Falta de motivación o apoyo', 'Lack of motivation or support'], ['Otra cosa', 'Something else']], req: ['blocker'] },
  { id: 'cost', type: 'multi', tagEs: 'Lo que te cuesta', tagEn: 'The cost', es: '¿Qué te está costando seguir como estás?', en: 'What is staying the same costing you?', hintEs: 'Puedes elegir varias.', hintEn: 'Choose as many as apply.', options: [['Energía', 'Energy'], ['Autoestima', 'Self-esteem'], ['Salud', 'Health'], ['Evito las fotos', 'I avoid photos'], ['Mi pareja / mi vida íntima', 'My partner / intimacy'], ['Otra cosa', 'Something else']], req: ['cost'] },
  { id: 'future', type: 'fields', tagEs: 'Visión', tagEn: 'Vision', es: 'Si dentro de 6 meses nada ha cambiado, ¿cómo te vas a sentir contigo?', en: 'If nothing has changed in 6 months, how will you feel about yourself?', fields: [{ k: 'feelNo', es: '', en: '', rows: 3 }, { k: 'feelWant', es: '¿Y cómo quieres sentirte en cambio?', en: 'And how do you want to feel instead?', rows: 3 }], req: ['feelNo'] },
  { id: 'date', type: 'fields', tagEs: 'Fecha clave', tagEn: 'Key date', es: '¿Tienes una fecha o algo importante para el que quieras notar cambios?', en: 'Do you have a date or something important you want to see changes for?', hintEs: 'Viaje, evento, cumpleaños… (opcional)', hintEn: 'Trip, event, birthday… (optional)', fields: [{ k: 'keyDate', es: '', en: '', rows: 2 }], req: [] },
  { id: 'ready', type: 'choice', tagEs: 'Compromiso', tagEn: 'Commitment', es: 'Si tuvieras un método hecho para ti, que se adapte a tu rutina, sin pasar hambre ni horas en el gimnasio, ¿estás dispuesto a comprometerte ahora mismo?', en: 'If you had a method made for you, that fits your routine, without starving or hours at the gym, would you commit right now?', options: [['Sí, estoy dispuesto', "Yes, I'm ready"], ['Lo tengo que pensar', 'I need to think about it'], ['Todavía no', 'Not yet']], req: ['ready'] },
  { id: 'commit', type: 'scale', tagEs: 'Compromiso', tagEn: 'Commitment', es: 'Del 1 al 10, ¿qué tan comprometido estás a poner de tu parte si yo me encargo del plan y el acompañamiento?', en: 'From 1 to 10, how committed are you to doing your part if I take care of the plan and support?', fields: [], req: ['commit'] },
  { id: 'invest', type: 'choice', tagEs: 'Inversión', tagEn: 'Investment', es: `El programa tiene una inversión de ${PRICE} €. Si en la llamada todo encaja, ¿estás en condiciones de invertir hoy en tu cambio?`, en: `The program is a ${PRICE} € investment. If everything fits on the call, are you in a position to invest in your change today?`, options: [['Sí, puedo invertirlo hoy', 'Yes, I can invest today'], ['Sí, pero necesitaría ver opciones de pago', "Yes, but I'd need payment options"], ['No ahora mismo', 'Not right now']], req: ['invest'] },
  { id: 'contact', type: 'contact', tagEs: 'Contacto', tagEn: 'Contact', es: '¿Dónde te escribo para confirmar la llamada?', en: 'Where should I message you to confirm the call?', req: ['phone', 'consent'] },
  { id: 'slot', type: 'slot', tagEs: 'Agenda', tagEn: 'Schedule', es: 'Elige día y hora para tu llamada', en: 'Pick a day and time for your call', req: ['day', 'time'] },
]

// Shown when the agenda can't be reached: weekdays and José's usual hours.
const FALLBACK_TIMES = ['10:00', '12:00', '17:00', '19:00']

type Answers = Record<string, string | number | number[] | undefined> & { cost: number[] }
type Avail = { date: string; slots: { label: string; start: string }[] }[]

const opt = (id: string, i: unknown, li: 0 | 1) => typeof i === 'number' ? STEPS.find(x => x.id === id)!.options![i][li] : ''
const clip = (t: unknown) => { const s = String(t ?? '').trim(); return !s ? '—' : s.length > 300 ? s.slice(0, 300) + '…' : s }
// Both languages are rendered and CSS shows one, so the first paint is
// already in the visitor's language.
const T = ({ es, en }: { es: string; en: string }) => <><span data-es>{es}</span><span data-en>{en}</span></>

const cookie = (n: string) => { const m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : '' }

function post(path: string, body: Record<string, unknown>) {
  try {
    fetch(path, {
      method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, pageUrl: location.href, referrer: document.referrer || '', fbc: cookie('_fbc'), fbp: cookie('_fbp'), landing: cookie('ju_src'), visitorId: cookie('ju_vid') }),
    }).catch(() => {})
  } catch {}
}

function fallbackDays() {
  const out: Date[] = []
  const d = new Date(); d.setHours(0, 0, 0, 0)
  while (out.length < 5) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0) out.push(new Date(d)) }
  return out
}

export default function BookingFlow() {
  const lang = useLang()
  const es = lang !== 'en'
  const [step, setStep] = useState(0)
  const [a, setAns] = useState<Answers>({ cost: [] })
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [avail, setAvail] = useState<Avail | null>(null)
  const [result, setResult] = useState<null | 'booked' | 'notFit'>(null)
  const [waUrl, setWaUrl] = useState('')

  useEffect(() => {
    fetch('/api/booking').then(r => r.json()).then(j => {
      if (j?.ok && Array.isArray(j.days) && j.days.length) setAvail(j.days)
    }).catch(() => {})
  }, [])

  const setA = (k: string, v: Answers[string]) => setAns(s => ({ ...s, [k]: v }))
  const days = useMemo(() => avail ? avail.map(x => new Date(x.date + 'T12:00:00')) : fallbackDays(), [avail])
  const times = avail ? (day !== null && avail[day] ? avail[day].slots.map(x => x.label) : []) : FALLBACK_TIMES
  const slotStart = avail && day !== null && time !== null ? avail[day]?.slots[time]?.start ?? null : null

  const st = STEPS[step]
  const total = STEPS.length
  const loc = es ? 'es-ES' : 'en-GB'
  const qualified = a.ready !== 2 && a.invest !== 2 && Number(a.commit || 0) >= 6
  const filled = (k: string) =>
    k === 'phone' ? phone.replace(/\D/g, '').length >= 9
    : k === 'consent' ? consent
    : k === 'day' ? day !== null
    : k === 'time' ? time !== null
    : k === 'cost' ? a.cost.length > 0
    : a[k] !== undefined && a[k] !== null && String(a[k]).trim() !== ''
  const valid = st.req.every(filled)
  const isSlot = st.id === 'slot'
  const notFitNow = st.id === 'contact' && !qualified
  const dayLabel = day !== null && days[day] ? days[day].toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const slotLabel = dayLabel && time !== null ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1) + ' · ' + times[time] : ''
  const firstName = String(a.name || '').trim().split(' ')[0]

  function summary(label: string) {
    const name = String(a.name || '').trim()
    const rows: [string, unknown][] = es ? [
      ['WhatsApp', phone], ['Email', email],
      ['Urgencia', (a.urgency || '—') + '/10 — ' + clip(a.urgencyWhy)], ['Lo que he probado', a.tried], ['Por qué no me funcionó', a.whyFailed],
      ['Lo que más me frena', opt('blocker', a.blocker, 0)], ['Me está costando', a.cost.map(i => opt('cost', i, 0)).join(', ')],
      ['Si nada cambia', a.feelNo], ['Cómo quiero sentirme', a.feelWant], ['Fecha clave', a.keyDate],
      ['Dispuesto a comprometerme', opt('ready', a.ready, 0)], ['Compromiso', (a.commit || '—') + '/10'], ['Inversión ' + PRICE + ' €', opt('invest', a.invest, 0)],
    ] : [
      ['WhatsApp', phone], ['Email', email],
      ['Urgency', (a.urgency || '—') + '/10 — ' + clip(a.urgencyWhy)], ["What I've tried", a.tried], ["Why it didn't work", a.whyFailed],
      ['What holds me back most', opt('blocker', a.blocker, 1)], ["What it's costing me", a.cost.map(i => opt('cost', i, 1)).join(', ')],
      ['If nothing changes', a.feelNo], ['How I want to feel', a.feelWant], ['Key date', a.keyDate],
      ['Ready to commit', opt('ready', a.ready, 1)], ['Commitment', (a.commit || '—') + '/10'], ['Investment ' + PRICE + ' €', opt('invest', a.invest, 1)],
    ]
    const head = label
      ? (es ? `Hola José, soy ${name}. Acabo de reservar mi llamada gratuita: ${label}.` : `Hi José, I'm ${name}. I just booked my free call: ${label}.`)
      : (es ? `Hola José, soy ${name}. Acabo de rellenar el formulario.` : `Hi José, I'm ${name}. I just filled in the form.`)
    return head + '\n\n' + (es ? 'Mis respuestas:' : 'My answers:') + '\n' + rows.map(r => '• ' + r[0] + ': ' + clip(r[1])).join('\n')
  }

  function sendWa(text: string) {
    const url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text)
    setWaUrl(url)
    try { if (!window.open(url, '_blank')) location.href = url } catch { location.href = url }
  }

  // José's copy of the answers always goes in Spanish.
  function saveLead(booked: boolean, call: string | null) {
    const answers = [
      ['Urgencia', a.urgency + '/10 — ' + (a.urgencyWhy || '')], ['Qué ha probado', a.tried || ''], ['Por qué no funcionó', a.whyFailed || ''],
      ['Lo que más le frena', opt('blocker', a.blocker, 0)], ['Le está costando', a.cost.map(i => opt('cost', i, 0)).join(', ')],
      ['Si nada cambia', a.feelNo || ''], ['Cómo quiere sentirse', a.feelWant || ''], ['Fecha clave', a.keyDate || '—'],
      ['Dispuesto a comprometerse', opt('ready', a.ready, 0)], ['Compromiso', (a.commit || '') + '/10'], ['Inversión ' + PRICE + ' €', opt('invest', a.invest, 0)],
    ].map(r => r[0] + ': ' + r[1]).join('\n')
    const name = String(a.name || '')
    if (booked) post('/api/booking', { name, email, whatsapp: phone, lang, start: slotStart, slotLabel: call, answers, qualified: true })
    else post('/api/lead', { name, email, whatsapp: phone, lang, source: 'reserva', message: 'No encaja ahora (formulario de llamada).\n' + answers })
  }

  function next() {
    if (!valid) return
    if (notFitNow) { saveLead(false, null); setResult('notFit'); sendWa(summary('')); return }
    if (isSlot && day !== null && time !== null) {
      saveLead(true, days[day].toISOString().slice(0, 10) + ' ' + times[time])
      setResult('booked'); sendWa(summary(slotLabel)); return
    }
    setStep(s => s + 1)
  }

  const fallbackWa = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(summary(result === 'booked' ? slotLabel : ''))
  const nextLabel = isSlot || notFitNow ? <T es="Enviar por WhatsApp" en="Send on WhatsApp" /> : st.id === 'contact' ? <T es="Continuar" en="Continue" /> : <T es="Siguiente" en="Next" />

  if (result === 'booked') return (
    <div className="bk-card">
      <div className="bk-body bk-done">
        <span className="bk-ok" aria-hidden="true">✓</span>
        <h2 className="disp bk-title">{es ? `Listo, ${firstName}. Nos vemos pronto.` : `Done, ${firstName}. Talk soon.`}</h2>
        <p className="bk-p">
          {es ? 'Tu llamada:' : 'Your call:'} <strong>{slotLabel}</strong>.{' '}
          {es ? <>Se ha abierto WhatsApp con tus respuestas: <strong>pulsa enviar</strong> para confirmar tu llamada.</> : <>WhatsApp has opened with your answers: <strong>press send</strong> to confirm your call.</>}
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
        <p className="bk-p">{es ? 'Parece que ahora mismo no es el momento ideal para la llamada. Te escribo por WhatsApp con algo que te va a ayudar a empezar, y cuando estés listo, aquí estaré.' : "It looks like right now isn't the ideal moment for the call. I'll send you something on WhatsApp to help you get started, and when you're ready, I'll be here."}</p>
        <a className="btn bk-wa" href={waUrl || fallbackWa} target="_blank" rel="noopener">{es ? 'Enviar mis respuestas a José' : 'Send my answers to José'}</a>
        <Link className="btn btn-line bk-full" href={LINKS.webinar}>{es ? 'Ver la masterclass gratuita' : 'Watch the free masterclass'}</Link>
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

        {st.type === 'scale' && (
          <div className="bk-scale" role="radiogroup" aria-label={es ? st.es : st.en}>
            {Array.from({ length: 10 }, (_, i) => (
              <button key={i} type="button" role="radio" aria-checked={a[st.id] === i + 1} className="bk-opt bk-num" onClick={() => setA(st.id, i + 1)}>{i + 1}</button>
            ))}
          </div>
        )}

        {(st.type === 'choice' || st.type === 'multi') && (
          <div className="bk-list" role={st.type === 'multi' ? 'group' : 'radiogroup'}>
            {st.options!.map((o, i) => {
              const sel = st.type === 'multi' ? a.cost.includes(i) : a[st.id] === i
              return (
                <button key={i} type="button" role={st.type === 'multi' ? 'checkbox' : 'radio'} aria-checked={sel}
                  className={'bk-opt bk-choice' + (st.type === 'multi' ? ' multi' : '')}
                  onClick={() => st.type === 'multi' ? setA('cost', sel ? a.cost.filter(x => x !== i) : [...a.cost, i]) : setA(st.id, i)}>
                  <span className="bk-dot" aria-hidden="true" /><T es={o[0]} en={o[1]} />
                </button>
              )
            })}
          </div>
        )}

        {(st.fields || []).map((f, fi) => (
          <label key={f.k} className="bk-field">
            {f.es && <span><T es={f.es} en={f.en} /></span>}
            {f.rows === 1
              ? <input value={String(a[f.k] ?? '')} onChange={e => setA(f.k, e.target.value)} autoComplete="name" autoFocus={fi === 0} aria-label={es ? st.es : st.en} />
              : <textarea value={String(a[f.k] ?? '')} onChange={e => setA(f.k, e.target.value)} rows={f.rows} aria-label={(es ? f.es : f.en) || (es ? st.es : st.en)} />}
          </label>
        ))}

        {st.type === 'contact' && (
          <>
            <label className="bk-field"><span>WhatsApp</span><input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+34 600 000 000" autoFocus /></label>
            <label className="bk-field"><span><T es="Email (opcional)" en="Email (optional)" /></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
            <label className="bk-consent">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>{es ? <>He leído y acepto la <Link href={LINKS.privacy} target="_blank">política de privacidad</Link>. José usará mis respuestas solo para preparar la llamada.</> : <>I have read and accept the <Link href={LINKS.privacy} target="_blank">privacy policy</Link>. José will only use my answers to prepare the call.</>}</span>
            </label>
          </>
        )}

        {isSlot && (
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
            <span className="bk-hint">{es ? 'Hora de España (CET). José te envía el enlace por WhatsApp.' : 'Spain time (CET). José sends the link by WhatsApp.'}</span>
          </>
        )}

        <div className="bk-nav">
          {step > 0 && <button type="button" className="bk-back" aria-label={es ? 'Atrás' : 'Back'} onClick={() => setStep(s => Math.max(0, s - 1))}>←</button>}
          <button type="submit" className="btn btn-y bk-next" disabled={!valid}>{nextLabel}<span className="arr">→</span></button>
        </div>
      </form>
    </div>
  )
}
