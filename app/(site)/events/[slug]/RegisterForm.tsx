'use client'

import { useEffect, useRef, useState } from 'react'
import { T } from '@/components/site/bits'
import { currentLang } from '@/components/site/LangToggle'
import { trackMeta } from '@/components/site/MetaPixel'
import { registrationEventId } from '@/lib/registration-event-id'

type Props = { eventId: string; paid: boolean; priceLabel: string; seatsLeft: number | null; capacity: number; full: boolean; waitlist: boolean }

function cookie(name: string): string {
  const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)')
  return m ? decodeURIComponent(m[1]) : ''
}

export default function RegisterForm({ eventId, paid, priceLabel, seatsLeft, capacity, full, waitlist }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hp, setHp] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const [ticket, setTicket] = useState('')
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending'); setMsg('')
    const es = currentLang() === 'es'
    try {
      const res = await fetch('/api/event-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId, name: name.trim(), email: email.trim(), phone: phone.trim(),
          ref: new URLSearchParams(location.search).get('ref') || undefined,
          visitorId: cookie('ju_vid'), hp, elapsedMs: Date.now() - startedAt.current,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) {
        setState('error')
        const already = typeof d.error === 'string' && /already registered/i.test(d.error)
        setMsg(already
          ? (es ? 'Ya estás inscrito con este email. Revisa tu correo.' : "You're already registered with this email. Check your inbox.")
          : (es ? 'No se pudo completar la inscripción. Inténtalo de nuevo.' : "We couldn't complete your registration. Please try again."))
        return
      }
      setWaitlisted(d.waitlisted === true)
      setTicket(typeof d.ticketCode === 'string' ? d.ticketCode : '')
      if (typeof d.ticketCode === 'string' && d.ticketCode) trackMeta('CompleteRegistration', registrationEventId(d.ticketCode))
      setState('done')
    } catch {
      setState('error')
      setMsg(es ? 'Sin conexión. Inténtalo de nuevo.' : 'No connection. Please try again.')
    }
  }

  if (state === 'done') {
    return (
      <>
        <span className="done-mark" aria-hidden="true">✓</span>
        <h2>{waitlisted ? <T es="Estás en la lista de espera" en="You're on the waitlist" /> : <T es={`¡Tu plaza está reservada, ${name.trim()}!`} en={`Your seat is saved, ${name.trim()}!`} />}</h2>
        <p className="card-sub">
          {waitlisted
            ? <T es="Las plazas están completas. Si se libera una, te aviso por email." en="Seats are full. If one frees up, I'll email you." />
            : paid
              ? <T es="Inscripción recibida. Te escribo con los datos para pagar la entrada y, en cuanto se confirme el pago, recibes el enlace por email." en="Registration received. I'll send you the payment details, and once payment is confirmed you'll get the link by email." />
              : <T es="Te he enviado un email con todos los detalles. Revisa también la carpeta de spam." en="I've emailed you all the details. Check your spam folder too." />}
        </p>
        {ticket && !waitlisted && <p className="micro"><T es="Tu código:" en="Your code:" /> <strong>{ticket}</strong></p>}
      </>
    )
  }

  const closed = full && !waitlist
  const taken = seatsLeft === null ? 0 : capacity - seatsLeft

  return (
    <form onSubmit={submit} style={{ display: 'contents' }}>
      <h2>{full ? <T es="Plazas completas" en="Seats are full" /> : <T es="Reserva tu plaza" en="Save your seat" />}</h2>
      <p className="card-sub">
        {full
          ? (waitlist ? <T es="Apúntate a la lista de espera y te aviso si se libera una." en="Join the waitlist and I'll let you know if one frees up." /> : <T es="Ya no quedan plazas para este evento." en="There are no seats left for this event." />)
          : paid ? <T es={`Entrada: ${priceLabel}`} en={`Ticket: ${priceLabel}`} /> : <T es="Gratis · plazas limitadas" en="Free · limited seats" />}
      </p>
      {seatsLeft !== null && !full && (
        <div className="seats">
          <div className="seats-r"><T es="Plazas libres" en="Seats left" /><span>{seatsLeft} / {capacity}</span></div>
          <div className="seats-bar"><i style={{ width: `${Math.max(4, (taken / capacity) * 100)}%` }} /></div>
        </div>
      )}
      {!closed && (
        <>
          <label className="fld"><T es="Nombre" en="Name" /><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="fld">Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="fld"><T es="WhatsApp (opcional)" en="WhatsApp (optional)" /><input type="tel" autoComplete="tel" placeholder="+34 600 000 000" value={phone} onChange={e => setPhone(e.target.value)} /></label>
          <input className="hp" tabIndex={-1} aria-hidden="true" autoComplete="off" name="company_website" value={hp} onChange={e => setHp(e.target.value)} />
          {state === 'error' && <p role="alert" className="err">{msg}</p>}
          <button className="btn btn-y btn-wide" type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? <T es="Reservando…" en="Saving…" /> : full ? <T es="Apuntarme a la lista" en="Join the waitlist" /> : <T es="Reservar mi plaza" en="Save my seat" />}
            <span className="arr">→</span>
          </button>
          <p className="micro" style={{ textAlign: 'center' }}><T es="Tus datos solo se usan para este evento." en="Your details are only used for this event." /></p>
        </>
      )}
    </form>
  )
}
