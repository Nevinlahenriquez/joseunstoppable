'use client'

import { useEffect, useRef, useState } from 'react'

const NAVY = '#0C2A43'
const SKY = '#0E71AC'

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12, border: '1.5px solid #CFE3F1',
  fontSize: 16, fontFamily: 'inherit', color: NAVY, outline: 'none', background: '#fff',
}
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: NAVY }

export default function RegisterForm({ eventId, paid, priceLabel }: { eventId: string; paid: boolean; priceLabel: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [waitlisted, setWaitlisted] = useState(false)
  const startedAt = useRef(0)
  useEffect(() => { startedAt.current = Date.now() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending'); setMsg('')
    try {
      const res = await fetch('/api/event-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: name.trim(), email: email.trim(), phone: phone.trim(), hp: website, elapsedMs: Date.now() - startedAt.current }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.success) {
        setState('error')
        setMsg(typeof d.error === 'string' && d.error ? d.error : 'No se pudo completar la inscripción. Inténtalo de nuevo.')
        return
      }
      setWaitlisted(d.waitlisted === true)
      setState('done')
    } catch {
      setState('error'); setMsg('Sin conexión. Inténtalo de nuevo.')
    }
  }

  if (state === 'done') {
    return (
      <div>
        <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>{waitlisted ? 'Estás en la lista de espera' : '¡Tu plaza está reservada!'}</h2>
        <p style={{ color: '#3F5A70', lineHeight: 1.6, margin: 0 }}>
          {waitlisted
            ? 'Las plazas están completas. Si se libera una, te aviso por email.'
            : paid
              ? 'Inscripción recibida. Te escribiré con los datos para pagar la entrada y, en cuanto se confirme el pago, recibirás el enlace por email.'
              : 'Te he enviado un email con todos los detalles. Revisa también la carpeta de spam.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <h2 style={{ fontSize: 22, margin: '0 0 4px' }}>Reserva tu plaza</h2>
      <p style={{ color: '#3F5A70', margin: '0 0 18px', fontSize: 14.5 }}>{paid ? `Entrada: ${priceLabel}` : 'Gratis · plazas limitadas'}</p>
      <div style={{ display: 'grid', gap: 14 }}>
        <div><label style={label} htmlFor="ev-name">Nombre</label><input id="ev-name" style={input} required autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label style={label} htmlFor="ev-email">Email</label><input id="ev-email" style={input} type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label style={label} htmlFor="ev-phone">WhatsApp (opcional)</label><input id="ev-phone" style={input} type="tel" autoComplete="tel" placeholder="+34 600 000 000" value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} name="company_website" />
      </div>
      {state === 'error' && <p role="alert" style={{ color: '#B42318', fontSize: 14, margin: '12px 0 0' }}>{msg}</p>}
      <button type="submit" disabled={state === 'sending'} style={{ width: '100%', marginTop: 18, background: SKY, color: '#fff', border: 'none', borderRadius: 999, padding: '15px 18px', fontWeight: 800, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer', opacity: state === 'sending' ? 0.7 : 1 }}>
        {state === 'sending' ? 'Reservando…' : 'Reservar mi plaza'}
      </button>
      <p style={{ color: '#6B8396', fontSize: 12.5, margin: '12px 0 0', textAlign: 'center' }}>Tus datos solo se usan para este evento.</p>
    </form>
  )
}
