'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { jakarta } from '../font'
import { LangBoot, useLang, type Lang } from '@/lib/site/lang'
import { SiteTrack } from '@/lib/site/track'
import { sitePost } from '@/lib/site/post'

// Template defaults (data-props of the original DC page).
const PRICE = 497
const WHATSAPP = '34649764886'

const F = 'var(--f)'

type StepType = 'fields' | 'scale' | 'choice' | 'multi' | 'contact' | 'slot'
type Field = { k: string; es: string; en: string; rows: number }
type Step = {
  id: string
  type: StepType
  tagEs: string
  tagEn: string
  es: string
  en: string
  hintEs?: string
  hintEn?: string
  fields?: Field[]
  options?: [string, string][]
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
  { id: 'ready', type: 'choice', tagEs: 'Compromiso', tagEn: 'Commitment', es: 'Si tuvieras un método hecho para ti, que se adapte a tu rutina, sin pasar hambre ni horas en el gimnasio, ¿estás dispuesto/a a comprometerte ahora mismo?', en: 'If you had a method made for you, that fits your routine, without starving or hours at the gym, would you commit right now?', options: [['Sí, estoy dispuesto/a', "Yes, I'm ready"], ['Lo tengo que pensar', 'I need to think about it'], ['Todavía no', 'Not yet']], req: ['ready'] },
  { id: 'commit', type: 'scale', tagEs: 'Compromiso', tagEn: 'Commitment', es: 'Del 1 al 10, ¿qué tan comprometido/a estás a poner de tu parte si yo me encargo del plan y el acompañamiento?', en: 'From 1 to 10, how committed are you to doing your part if I take care of the plan and support?', fields: [], req: ['commit'] },
  { id: 'invest', type: 'choice', tagEs: 'Inversión', tagEn: 'Investment', es: 'El programa tiene una inversión de ' + PRICE + ' €. Si en la llamada todo encaja, ¿estás en condiciones de invertir hoy en tu cambio?', en: 'The program is a ' + PRICE + ' € investment. If everything fits on the call, are you in a position to invest in your change today?', options: [['Sí, puedo invertirlo hoy', 'Yes, I can invest today'], ['Sí, pero necesitaría ver opciones de pago', "Yes, but I'd need payment options"], ['No ahora mismo', 'Not right now']], req: ['invest'] },
  { id: 'contact', type: 'contact', tagEs: 'Contacto', tagEn: 'Contact', es: '¿Dónde te escribo para confirmar la llamada?', en: 'Where should I message you to confirm the call?', req: ['phone'] },
  { id: 'slot', type: 'slot', tagEs: 'Agenda', tagEn: 'Schedule', es: 'Elige día y hora para tu llamada', en: 'Pick a day and time for your call', req: ['day', 'time'] },
]
const TIMES = ['10:00', '12:00', '17:00', '19:00']

type Answers = {
  name?: string; urgency?: number; urgencyWhy?: string; tried?: string; whyFailed?: string
  blocker?: number; cost: number[]; feelNo?: string; feelWant?: string; keyDate?: string
  ready?: number; commit?: number; invest?: number
}
type AnswerKey = keyof Answers
type AvailDay = { date: string; slots: { label: string; start: string }[] }
type Result = 'booked' | 'notFit' | null

const stepById = (id: string) => STEPS.find(x => x.id === id) as Step
const optLabel = (id: string, i: number | undefined | null, li: 0 | 1) => (i == null ? '—' : (stepById(id).options as [string, string][])[i][li])

function buildDays(avail: AvailDay[] | null): Date[] {
  if (avail) return avail.map(x => new Date(x.date + 'T12:00:00'))
  const out: Date[] = []
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  while (out.length < 5) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() % 6 !== 0) out.push(new Date(d))
  }
  return out
}

// Navigation and clock helpers live outside the component: they only ever
// run from click handlers.
function openWhatsApp(url: string) {
  try { if (!window.open(url, '_blank')) window.location.assign(url) } catch { window.location.assign(url) }
}
const newLeadId = () => 'w' + Date.now()
const nowIso = () => new Date().toISOString()

const ON = { bg: '#E2F2FB', fg: '#0C2A43', border: '#0E71AC' }
const OFF = { bg: '#FFFFFF', fg: '#0C2A43', border: '#DDE9F2' }

const s = {
  langBtn: { minWidth: 50, height: 44, border: 0, borderRadius: 999, fontFamily: F, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  stepDot: { flex: 'none', width: 34, height: 34, borderRadius: '50%', background: '#5BBCEE', border: '1.5px solid #DDE9F2', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15 },
  stepRow: { display: 'flex', gap: 14, alignItems: 'center' },
  label: { display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600, fontSize: 15 },
  input: { height: 58, padding: '0 18px', borderRadius: 14, border: '1.5px solid #DDE9F2', fontSize: 18, fontFamily: 'inherit', background: '#FFFFFF' },
  highlight: { background: '#5BBCEE', padding: '0 8px', borderRadius: 10 },
  waBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 60, borderRadius: 999, background: '#25D366', color: '#FFFFFF', textDecoration: 'none', fontFamily: F, fontWeight: 700, fontSize: 18 },
  endBox: { display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start', padding: '10px 0' },
} satisfies Record<string, CSSProperties>

export default function ReservaClient() {
  const [lang, setLang] = useLang()
  const [step, setStep] = useState(0)
  const [a, setAnswers] = useState<Answers>({ cost: [] })
  const [phoneInput, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [day, setDay] = useState<number | null>(null)
  const [time, setTime] = useState<number | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [avail, setAvail] = useState<AvailDay[] | null>(null)
  const [waUrl, setWaUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/booking')
      .then(r => r.json())
      .then((j: { ok?: boolean; days?: AvailDay[] }) => {
        if (j && j.ok && Array.isArray(j.days) && j.days.length) setAvail(j.days)
      })
      .catch(() => {})
  }, [])

  const setA = <K extends AnswerKey>(k: K, v: Answers[K]) => setAnswers(prev => ({ ...prev, [k]: v }))

  const es = lang !== 'en'
  const slotTimes = (): string[] => {
    if (!avail) return TIMES
    const d = day !== null ? avail[day] : null
    return d ? d.slots.map(x => x.label) : []
  }
  const slotStart = (): string | null => {
    if (!avail || day === null || time === null) return null
    const d = avail[day]
    return d && d.slots[time] ? d.slots[time].start : null
  }
  const qualified = () => a.ready !== 2 && a.invest !== 2 && (a.commit || 0) >= 6

  const waSummary = (slotLabel: string) => {
    const li: 0 | 1 = es ? 0 : 1
    const opt = (id: string, i: number | undefined) => optLabel(id, i, li)
    const txt = (t: unknown) => {
      const v = String(t == null ? '' : t).trim()
      return !v ? '—' : v.length > 300 ? v.slice(0, 300) + '…' : v
    }
    const rows: [string, unknown][] = es ? [
      ['WhatsApp', phoneInput], ['Email', email],
      ['Urgencia', (a.urgency || '—') + '/10 — ' + txt(a.urgencyWhy)], ['Lo que he probado', txt(a.tried)], ['Por qué no me funcionó', txt(a.whyFailed)],
      ['Lo que más me frena', opt('blocker', a.blocker)], ['Me está costando', (a.cost || []).map(i => opt('cost', i)).join(', ') || '—'],
      ['Si nada cambia', txt(a.feelNo)], ['Cómo quiero sentirme', txt(a.feelWant)], ['Fecha clave', txt(a.keyDate)],
      ['Dispuesto/a a comprometerme', opt('ready', a.ready)], ['Compromiso', (a.commit || '—') + '/10'], ['Inversión ' + PRICE + ' €', opt('invest', a.invest)],
    ] : [
      ['WhatsApp', phoneInput], ['Email', email],
      ['Urgency', (a.urgency || '—') + '/10 — ' + txt(a.urgencyWhy)], ["What I've tried", txt(a.tried)], ["Why it didn't work", txt(a.whyFailed)],
      ['What holds me back most', opt('blocker', a.blocker)], ["What it's costing me", (a.cost || []).map(i => opt('cost', i)).join(', ') || '—'],
      ['If nothing changes', txt(a.feelNo)], ['How I want to feel', txt(a.feelWant)], ['Key date', txt(a.keyDate)],
      ['Ready to commit', opt('ready', a.ready)], ['Commitment', (a.commit || '—') + '/10'], ['Investment ' + PRICE + ' €', opt('invest', a.invest)],
    ]
    const name = (a.name || '').trim()
    const head = slotLabel
      ? (es ? 'Hola José, soy ' + name + '. Acabo de reservar mi llamada gratuita: ' + slotLabel + '.' : "Hi José, I'm " + name + '. I just booked my free call: ' + slotLabel + '.')
      : (es ? 'Hola José, soy ' + name + '. Acabo de rellenar el formulario.' : "Hi José, I'm " + name + '. I just filled in the form.')
    return head + '\n\n' + (es ? 'Mis respuestas:' : 'My answers:') + '\n' + rows.map(r => '• ' + r[0] + ': ' + txt(r[1])).join('\n')
  }

  const sendWa = (text: string) => {
    const phone = WHATSAPP.replace(/\D/g, '')
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text)
    setWaUrl(url)
    openWhatsApp(url)
  }

  const saveLead = (stage: 'new' | 'booked', call: string | null) => {
    const opt = (id: string, i: number | undefined) => (i == null ? '' : (stepById(id).options as [string, string][])[i][0])
    const answers: [string, string][] = [
      ['Urgencia', a.urgency + '/10 — ' + (a.urgencyWhy || '')], ['Qué ha probado', a.tried || ''], ['Por qué no funcionó', a.whyFailed || ''],
      ['Lo que más le frena', opt('blocker', a.blocker)], ['Le está costando', (a.cost || []).map(i => (stepById('cost').options as [string, string][])[i][0]).join(', ')],
      ['Si nada cambia', a.feelNo || ''], ['Cómo quiere sentirse', a.feelWant || ''], ['Fecha clave', a.keyDate || '—'],
      ['Dispuesto/a a comprometerse', opt('ready', a.ready)], ['Compromiso', (a.commit || '') + '/10'], ['Inversión 497 €', opt('invest', a.invest)],
    ]
    const lead = { id: newLeadId(), name: a.name || '', phone: phoneInput, email, goal: opt('blocker', a.blocker), age: '—', source: 'Meta Ads', stage, lang, created: nowIso(), call, qualified: stage === 'booked', urgency: a.urgency, commit: a.commit, answers }
    const text = answers.map(r => r[0] + ': ' + r[1]).join('\n')
    if (stage === 'booked') sitePost('/api/booking', { name: lead.name, email, whatsapp: phoneInput, lang, start: slotStart(), slotLabel: call, answers: text, qualified: true })
    else sitePost('/api/lead', { name: lead.name, email, whatsapp: phoneInput, lang, source: 'reserva', message: 'No encaja ahora (formulario de llamada).\n' + text })
    try {
      const arr: unknown[] = JSON.parse(localStorage.getItem('unstoppable_leads') || '[]')
      arr.unshift(lead)
      localStorage.setItem('unstoppable_leads', JSON.stringify(arr))
    } catch {}
  }

  // Values the original template computed in renderVals().
  const inFlow = result === null
  const total = STEPS.length
  const st = STEPS[Math.min(step, total - 1)]
  const loc = es ? 'es-ES' : 'en-GB'
  const days = buildDays(avail)
  const filled = (k: string) =>
    k === 'phone' ? phoneInput.replace(/\D/g, '').length >= 9
      : k === 'day' ? day !== null
        : k === 'time' ? time !== null
          : k === 'cost' ? (a.cost || []).length > 0
            : (() => { const v = a[k as AnswerKey]; return v !== undefined && v !== null && String(v).trim() !== '' })()
  const valid = (st.req || []).every(filled)
  const isSlot = st.id === 'slot'
  const phone = WHATSAPP.replace(/\D/g, '')
  const slotLabel = day !== null && time !== null ? days[day].toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + slotTimes()[time] : ''
  const firstName = (a.name || '').trim().split(' ')[0]
  const waText = result === 'booked'
    ? (es ? 'Hola José, soy ' + (a.name || '') + '. Acabo de reservar mi llamada: ' + slotLabel : "Hi José, I'm " + (a.name || '') + '. I just booked my call: ' + slotLabel)
    : (es ? 'Hola José, soy ' + (a.name || '') + '. Acabo de rellenar el formulario.' : "Hi José, I'm " + (a.name || '') + '. I just filled in the form.')
  const waLink = waUrl || ('https://wa.me/' + phone + '?text=' + encodeURIComponent(waText))

  const next = () => {
    if (!valid) return
    if (st.id === 'contact' && !qualified()) { saveLead('new', null); setResult('notFit'); sendWa(waSummary('')); return }
    if (isSlot && day !== null && time !== null) {
      saveLead('booked', days[day].toISOString().slice(0, 10) + ' ' + slotTimes()[time])
      setResult('booked')
      sendWa(waSummary(slotLabel))
      return
    }
    setStep(step + 1)
  }

  const sendLabel = isSlot || (st.id === 'contact' && !qualified())
  const nextEs = sendLabel ? 'Enviar por WhatsApp' : st.id === 'contact' ? 'Continuar' : 'Siguiente'
  const nextEn = sendLabel ? 'Send on WhatsApp' : st.id === 'contact' ? 'Continue' : 'Next'

  const choiceSelected = (i: number) => (st.type === 'multi' ? (a.cost || []).includes(i) : a[st.id as AnswerKey] === i)
  const pickChoice = (i: number) => {
    if (st.type === 'multi') {
      const sel = (a.cost || []).includes(i)
      setA('cost', sel ? a.cost.filter(x => x !== i) : [...(a.cost || []), i])
    } else setA(st.id as AnswerKey, i as never)
  }

  const langBtn = (on: boolean): CSSProperties => ({ ...s.langBtn, background: on ? '#0C2A43' : 'transparent', color: on ? '#FFFFFF' : '#0C2A43' })
  const setL = (l: Lang) => () => setLang(l)

  return (
    <div className={`pg-reserva ${jakarta.variable}`}>
      <LangBoot />
      <SiteTrack />
      <div style={{ minHeight: '100vh', fontSize: 17, lineHeight: 1.55, display: 'flex', flexDirection: 'column' }}>

        <header style={{ background: '#FFFFFF', borderBottom: '1px solid #DDE9F2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px clamp(18px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <span style={{ fontFamily: F, fontWeight: 800, fontSize: 28, lineHeight: 1 }}>JOSÉ</span>
              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', background: '#5BBCEE', padding: '4px 8px', borderRadius: 5 }}>Unstoppable</span>
            </Link>
            <div style={{ marginLeft: 'auto', display: 'flex', padding: 4, borderRadius: 999, background: '#F1F8FD' }}>
              <button onClick={setL('es')} style={langBtn(es)}>ES</button>
              <button onClick={setL('en')} style={langBtn(!es)}>EN</button>
            </div>
          </div>
        </header>

        <section data-screen-label="Assessment" style={{ flex: 1, padding: 'clamp(28px,5vw,72px) clamp(18px,4vw,40px) clamp(48px,7vw,96px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 'clamp(28px,6vw,88px)', alignItems: 'start' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
              <span style={{ alignSelf: 'flex-start', display: 'flex', gap: 8, fontFamily: F, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#0C2A43', color: '#5BBCEE', padding: '8px 12px', borderRadius: 8 }}><span data-es="">Formulario previo · Llamada privada 30 min</span><span data-en="">Pre-call form · Private 30-min call</span></span>
              <h1 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 'clamp(34px,5vw,64px)', lineHeight: 1, letterSpacing: '-0.03em', textWrap: 'balance' }}>
                <span data-es="">Agenda tu llamada <span style={s.highlight}>gratuita</span> con José</span>
                {' '}
                <span data-en="">Book your <span style={s.highlight}>free</span> call with José</span>
              </h1>
              <p style={{ margin: 0, fontSize: 'clamp(17px,1.4vw,19px)', color: '#344A5E', maxWidth: 520, textWrap: 'pretty' }}><span data-es="">10 preguntas rápidas. Me ayudan a preparar tu llamada y a saber si de verdad puedo ayudarte. Todo es confidencial.</span><span data-en="">10 quick questions. They help me prepare your call and know whether I can truly help you. Everything is confidential.</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={s.stepRow}><span style={s.stepDot}>1</span><span><span data-es="">Respondes el formulario (2 min)</span><span data-en="">You answer the form (2 min)</span></span></div>
                <div style={s.stepRow}><span style={s.stepDot}>2</span><span><span data-es="">Eliges día y hora para tu llamada</span><span data-en="">You pick a day and time</span></span></div>
                <div style={s.stepRow}><span style={s.stepDot}>3</span><span><span data-es="">José te confirma por WhatsApp</span><span data-en="">José confirms on WhatsApp</span></span></div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 18, background: '#FFFFFF', borderRadius: 22, border: '1px solid #DDE9F2' }}>
                <Image src="/images/site/jose-avatar.jpg" alt="José" width={60} height={60} style={{ width: 60, height: 60, flex: 'none', borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}><span data-es="">«Sin presión. Si no es para ti, te lo diré con sinceridad.»</span><span data-en="">“No pressure. If it&apos;s not for you, I&apos;ll tell you honestly.”</span></span>
                  <span style={{ fontSize: 14, color: '#5D6E7E' }}>José Sánchez · <span data-es="">+100 personas ayudadas</span><span data-en="">100+ people helped</span></span>
                </div>
              </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1.5px solid #DDE9F2', borderRadius: 28, boxShadow: '0 24px 60px -28px rgba(12,42,67,.22)', overflow: 'hidden', minWidth: 0 }}>
              {inFlow && (
                <div style={{ padding: '22px clamp(20px,3vw,34px) 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5D6E7E' }}>
                    <span>{step + 1} / {total}</span>
                    <span>{es ? st.tagEs : st.tagEn}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: '#F1F8FD', overflow: 'hidden' }}><div style={{ height: '100%', width: ((step + 1) / total * 100) + '%', background: '#5BBCEE', transition: 'width .35s' }} /></div>
                </div>
              )}

              <div style={{ padding: '26px clamp(20px,3vw,34px) 30px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {inFlow && (
                  <>
                    <h2 style={{ margin: 0, fontFamily: F, fontWeight: 700, fontSize: 'clamp(21px,2vw,25px)', lineHeight: 1.25, letterSpacing: '-0.01em', textWrap: 'pretty' }}><span data-es="">{st.es}</span><span data-en="">{st.en}</span></h2>
                    {!!st.hintEs && <span style={{ fontSize: 15, color: '#5D6E7E', marginTop: -8 }}><span data-es="">{st.hintEs}</span><span data-en="">{st.hintEn}</span></span>}
                  </>
                )}

                {inFlow && st.type === 'scale' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 8 }}>
                    {Array.from({ length: 10 }, (_, i) => {
                      const c = a[st.id as AnswerKey] === i + 1 ? ON : OFF
                      return <button key={i} onClick={() => setA(st.id as AnswerKey, (i + 1) as never)} style={{ height: 56, borderRadius: 14, border: `2px solid ${c.border}`, background: c.bg, color: c.fg, fontFamily: F, fontSize: 20, fontWeight: 700, cursor: 'pointer' }}>{i + 1}</button>
                    })}
                  </div>
                )}

                {inFlow && (st.type === 'choice' || st.type === 'multi') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(st.options || []).map((o, i) => {
                      const sel = choiceSelected(i)
                      const c = sel ? ON : OFF
                      return (
                        <button key={st.id + i} onClick={() => pickChoice(i)} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 58, padding: '12px 18px', borderRadius: 14, border: `2px solid ${c.border}`, background: c.bg, color: c.fg, fontFamily: F, fontSize: 17, fontWeight: 600, textAlign: 'left', cursor: 'pointer' }}>
                          <span style={{ flex: 'none', width: 20, height: 20, borderRadius: st.type === 'multi' ? '5px' : '50%', border: '1.5px solid #DDE9F2', background: sel ? '#0C2A43' : '#FFFFFF' }} />
                          <span data-es="">{o[0]}</span><span data-en="">{o[1]}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {inFlow && (st.fields || []).map(f => (
                  <label key={st.id + f.k} style={s.label}>
                    <span><span data-es="">{f.es}</span><span data-en="">{f.en}</span></span>
                    <textarea
                      value={String(a[f.k as AnswerKey] ?? '')}
                      onChange={e => setA(f.k as AnswerKey, e.target.value as never)}
                      rows={f.rows}
                      style={{ padding: '14px 16px', borderRadius: 14, border: '1.5px solid #DDE9F2', fontSize: 17, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.45, background: '#FFFFFF' }}
                    />
                  </label>
                ))}

                {inFlow && st.type === 'contact' && (
                  <>
                    <label style={s.label}><span>WhatsApp</span><input value={phoneInput} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+34 600 000 000" style={s.input} /></label>
                    <label style={s.label}><span><span data-es="">Email (opcional)</span><span data-en="">Email (optional)</span></span><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" style={s.input} /></label>
                  </>
                )}

                {inFlow && isSlot && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
                      {days.map((d, i) => {
                        const c = day === i ? ON : OFF
                        return (
                          <button key={i} onClick={() => { setDay(i); setTime(null) }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 72, borderRadius: 14, border: `2px solid ${c.border}`, background: c.bg, color: c.fg, cursor: 'pointer', fontFamily: F, padding: 0 }}>
                            <span style={{ fontSize: 13, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{d.toLocaleDateString(loc, { weekday: 'short' })}</span>
                            <span style={{ fontFamily: F, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
                      {slotTimes().map((t, i) => {
                        const c = time === i ? ON : OFF
                        return <button key={t + i} onClick={() => setTime(i)} style={{ minHeight: 56, borderRadius: 14, border: `2px solid ${c.border}`, background: c.bg, color: c.fg, fontFamily: F, fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>{t}</button>
                      })}
                    </div>
                    <span style={{ fontSize: 14, color: '#5D6E7E' }}><span data-es="">Hora de España (CET). José te envía el enlace por WhatsApp.</span><span data-en="">Spain time (CET). José sends the link by WhatsApp.</span></span>
                  </>
                )}

                {inFlow && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 4 }}>
                    {step > 0 && (
                      <button onClick={() => setStep(Math.max(0, step - 1))} aria-label="Atrás" style={{ flex: 'none', width: 60, height: 60, borderRadius: 999, border: '1.5px solid #DDE9F2', background: '#FFFFFF', fontSize: 20, cursor: 'pointer', color: '#0C2A43' }}>←</button>
                    )}
                    <button onClick={next} disabled={!valid} style={{ flex: 1, minHeight: 60, borderRadius: 999, border: '2px solid #5BBCEE', background: '#5BBCEE', color: '#0C2A43', fontFamily: F, fontWeight: 800, fontSize: 19, cursor: 'pointer', opacity: valid ? 1 : 0.35, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><span data-es="">{nextEs}</span><span data-en="">{nextEn}</span><span>→</span></button>
                  </div>
                )}

                {result === 'booked' && (
                  <div style={s.endBox}>
                    <span style={{ width: 64, height: 64, borderRadius: '50%', background: '#5BBCEE', border: '1.5px solid #DDE9F2', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800 }}>✓</span>
                    <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 30, lineHeight: 1.08, letterSpacing: '-0.02em' }}><span data-es="">Listo, {firstName}. Nos vemos pronto.</span><span data-en="">Done, {firstName}. Talk soon.</span></h2>
                    <p style={{ margin: 0, fontSize: 18, color: '#344A5E' }}><span data-es="">Tu llamada:</span><span data-en="">Your call:</span> <strong style={{ textTransform: 'capitalize' }}>{slotLabel}</strong>. <span data-es="">Se ha abierto WhatsApp con tus respuestas: <strong>pulsa enviar</strong> para confirmar tu llamada.</span><span data-en="">WhatsApp has opened with your answers: <strong>press send</strong> to confirm your call.</span></p>
                    <a href={waLink} target="_blank" rel="noreferrer" style={{ ...s.waBtn, gap: 10 }}><span data-es="">¿No se abrió? Enviar por WhatsApp</span><span data-en="">Didn&apos;t open? Send on WhatsApp</span></a>
                    <Link href="/" style={{ fontWeight: 600, fontSize: 15 }}><span data-es="">Volver a la web</span><span data-en="">Back to the site</span></Link>
                  </div>
                )}

                {result === 'notFit' && (
                  <div style={s.endBox}>
                    <h2 style={{ margin: 0, fontFamily: F, fontWeight: 800, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em' }}><span data-es="">Gracias por tu sinceridad, {firstName}.</span><span data-en="">Thank you for your honesty, {firstName}.</span></h2>
                    <p style={{ margin: 0, fontSize: 18, color: '#344A5E', textWrap: 'pretty' }}><span data-es="">Parece que ahora mismo no es el momento ideal para la llamada. Te escribo por WhatsApp con algo que te va a ayudar a empezar, y cuando estés listo/a, aquí estaré.</span><span data-en="">It looks like right now isn&apos;t the ideal moment for the call. I&apos;ll send you something on WhatsApp to help you get started — and when you&apos;re ready, I&apos;ll be here.</span></p>
                    <a href={waLink} target="_blank" rel="noreferrer" style={s.waBtn}><span data-es="">Enviar mis respuestas a José</span><span data-en="">Send my answers to José</span></a>
                    <Link href="/masterclass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, borderRadius: 999, border: '1.5px solid #DDE9F2', textDecoration: 'none', fontFamily: F, fontWeight: 700, fontSize: 16 }}><span data-es="">Ver la masterclass gratuita</span><span data-en="">Watch the free masterclass</span></Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="m-foot-pad" style={{ padding: '24px clamp(18px,4vw,40px)', textAlign: 'center', fontSize: 14, color: '#5D6E7E' }}>© José Sánchez · José Unstoppable · <span data-es="">Tus respuestas son confidenciales.</span><span data-en="">Your answers are confidential.</span></footer>
      </div>
    </div>
  )
}
