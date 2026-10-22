'use client'

import { useEffect, useRef, useState } from 'react'
import { T, WHATSAPP } from '@/components/site/bits'
import { currentLang } from '@/components/site/LangToggle'

type Props = { startISO: string; minutes: number; time: string; dateEs: string; dateEn: string; taken: number; capacity: number; eventId: string }

function cookie(name: string): string {
  const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)')
  return m ? decodeURIComponent(m[1]) : ''
}

const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

export default function MasterclassForm(p: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [done, setDone] = useState(false)
  const [waUrl, setWaUrl] = useState('')
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])

  const valid = name.trim() !== '' && phone.replace(/\D/g, '').length >= 9

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const lang = currentLang()
    const es = lang === 'es'
    const dateLabel = es ? p.dateEs : p.dateEn
    const text = (es
      ? `Hola Jose, soy ${name.trim()}. Me apunto a la masterclass gratuita del ${dateLabel} a las ${p.time} CET.`
      : `Hi Jose, I'm ${name.trim()}. Please save my seat for the free masterclass on ${dateLabel} at ${p.time} CET.`)
      + `\n\n• WhatsApp: ${phone.trim()}\n• Email: ${email.trim() || '—'}`
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`

    fetch('/api/lead', {
      method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), email: email.trim(), whatsapp: phone.trim(), lang, source: 'masterclass',
        message: `Masterclass: ${p.dateEs} · ${p.time} CET`, eventId: p.eventId,
        pageUrl: location.href, referrer: document.referrer || '', fbc: cookie('_fbc'), fbp: cookie('_fbp'),
        landing: cookie('ju_src'), visitorId: cookie('ju_vid'), hp, elapsedMs: Date.now() - startedAt.current,
      }),
    }).catch(() => {})

    setWaUrl(url)
    setDone(true)
    try { if (!window.open(url, '_blank')) location.href = url } catch { location.href = url }
  }

  if (done) {
    const start = new Date(p.startISO)
    const end = new Date(start.getTime() + p.minutes * 6e4)
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Masterclass Jose Unstoppable')}&dates=${gcalStamp(start)}/${gcalStamp(end)}`
    return (
      <>
        <span className="done-mark" aria-hidden="true">✓</span>
        <h2><T es={`¡Tienes tu plaza, ${name.trim()}!`} en={`Your seat is saved, ${name.trim()}!`} /></h2>
        <p className="card-sub"><T es="Nos vemos el" en="See you on" /> <strong className="cap"><T es={p.dateEs} en={p.dateEn} /></strong> · {p.time} CET.</p>
        <a className="btn btn-y btn-wide" href={waUrl}><T es="¿No se abrió? Enviar por WhatsApp" en="Didn't open? Send on WhatsApp" /><span className="arr">→</span></a>
        <a className="btn btn-line" href={gcal} target="_blank" rel="noopener"><T es="Añadir a mi calendario" en="Add to my calendar" /></a>
      </>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'contents' }}>
      <h2><T es="Reserva tu plaza gratis" en="Save your free seat" /></h2>
      <div className="seats">
        <div className="seats-r"><T es="Plazas ocupadas" en="Seats taken" /><span>{p.taken} / {p.capacity}</span></div>
        <div className="seats-bar"><i style={{ width: `${(p.taken / p.capacity) * 100}%` }} /></div>
      </div>
      <label className="fld"><T es="Nombre" en="Name" /><input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required /></label>
      <label className="fld">WhatsApp<input value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+34 600 000 000" required /></label>
      <label className="fld"><T es="Email (opcional)" en="Email (optional)" /><input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
      <input className="hp" tabIndex={-1} aria-hidden="true" autoComplete="off" name="company_website" value={hp} onChange={e => setHp(e.target.value)} />
      <button className="btn btn-y btn-wide" type="submit" disabled={!valid}><T es="Reservar plaza por WhatsApp" en="Save my seat on WhatsApp" /><span className="arr">→</span></button>
      <p className="micro" style={{ textAlign: 'center' }}><T es="100% gratis. Se abrirá WhatsApp: pulsa enviar y te mandamos el enlace." en="100% free. WhatsApp will open: press send and we'll send you the link." /></p>
    </form>
  )
}
