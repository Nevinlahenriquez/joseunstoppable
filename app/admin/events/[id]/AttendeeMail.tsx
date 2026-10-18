'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import EvIcon from '../EvIcon'

type Stage = { kind: string; label: string; dueAt: string | null }
type Person = {
  id: string; name: string; email: string; paid: boolean; status: string
  block: '' | 'unpaid' | 'cancelled'; sent: Record<string, boolean>
}

const fmt = (iso: string) => new Date(iso).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function AttendeeMail({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [people, setPeople] = useState<Person[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [armed, setArmed] = useState('')
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/os/event-attendee-mail?eventId=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) { setErr(j.error || `No se pudo cargar (${res.status})`); return }
      setErr(''); setStages(j.stages); setPeople(j.people); setNow(Date.now())
    } catch { setErr('No se pudo cargar la lista.') }
  }, [eventId])

  useEffect(() => {
    const first = setTimeout(() => { void load() }, 0)

    const on = () => { void load() }
    window.addEventListener('ju:attendee-email', on)
    return () => { clearTimeout(first); window.removeEventListener('ju:attendee-email', on) }
  }, [load])

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(''), 5000)
    return () => clearTimeout(t)
  }, [armed])

  function say(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  async function fire(p: Person, kind: string) {
    const key = `${p.id}:${kind}`
    if (armed !== key) { setArmed(key); return }
    setArmed(''); setBusy(key)
    try {
      const res = await fetch('/api/os/event-attendee-mail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendeeId: p.id, kind }),
      })
      const j = await res.json().catch(() => ({}))
      const who = p.name || p.email
      if (!res.ok || !j.ok) say(j.error || `No se envió a ${who}.`)
      else if (kind === 'sequence') say(j.failed ? `${j.sent} enviados a ${who}, ${j.failed} fallaron.` : `Secuencia enviada a ${who} (${j.sent} ${j.sent === 1 ? 'email' : 'emails'}).`)
      else say(`Enviado a ${who}.`)
      await load()
    } catch { say('Error de red, no se envió nada.') }
    finally { setBusy('') }
  }

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = people ?? []
    return s ? list.filter(p => `${p.name} ${p.email}`.toLowerCase().includes(s)) : list
  }, [people, q])

  return (
    <div className="evx-mail">
      <div className="evx-mail-head">
        <div>
          <div className="evx-mail-title">Quién recibió qué</div>
          <div className="evx-mail-sub">Un check es un email que el servicio de correo aceptó. Pulsa cualquier email para reenviarlo o reenvía toda la secuencia.</div>
        </div>
        <input className="evx-mail-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Busca un nombre o email" />
      </div>

      {err && <div className="evx-mail-note evx-mail-bad">{err}</div>}
      {!err && !people && <div className="evx-mail-note">Cargando…</div>}
      {people && people.length === 0 && <div className="evx-mail-note">Aún no se ha inscrito nadie.</div>}

      {people && people.length > 0 && (
        <div className="evx-mail-scroll">
          <table className="evx-mail-table">
            <thead>
              <tr>
                <th className="evx-mail-who">Asistente</th>
                {stages.map(s => (
                  <th key={s.kind} title={s.dueAt ? fmt(s.dueAt) : 'Al inscribirse'}>{s.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map(p => {
                const blocked = p.block !== ''
                return (
                  <tr key={p.id} className={blocked ? 'is-blocked' : ''}>
                    <td className="evx-mail-who">
                      <div className="evx-mail-name">{p.name || 'Sin nombre'}</div>
                      <div className="evx-mail-email">{p.email}</div>
                    </td>
                    {stages.map(s => {
                      const key = `${p.id}:${s.kind}`
                      const sent = p.sent[s.kind]
                      const due = s.dueAt ? Date.parse(s.dueAt) : null
                      const future = due !== null && due > now
                      const state = sent ? 'sent' : future ? 'later' : 'missed'
                      const tip = blocked
                        ? (p.block === 'unpaid' ? 'Esperando el pago' : 'Cancelado')
                        : `${s.label}: ${sent ? 'enviado' : future ? `sale el ${fmt(s.dueAt!)}` : 'no enviado'}. Pulsa para enviarlo ahora.`
                      return (
                        <td key={s.kind}>
                          {armed === key ? (
                            <button className="evx-mail-cell is-armed" onClick={() => fire(p, s.kind)}>Enviar</button>
                          ) : (
                            <button
                              className={`evx-mail-cell is-${state}`}
                              disabled={blocked || busy === key}
                              onClick={() => fire(p, s.kind)}
                              title={tip}
                              aria-label={tip}
                            >
                              {busy === key ? '…' : state === 'sent' ? <EvIcon name="ti-check" size={14} /> : state === 'later' ? <EvIcon name="ti-clock" size={13} /> : <span className="evx-mail-dash" />}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="evx-mail-act">
                      {blocked ? (
                        <span className="evx-mail-wait">{p.block === 'unpaid' ? 'Esperando el pago' : 'Cancelado'}</span>
                      ) : (
                        <button
                          className={`evx-btn ${armed === `${p.id}:sequence` ? 'evx-btn-primary' : 'evx-btn-ghost'} evx-mail-seq`}
                          disabled={busy === `${p.id}:sequence`}
                          onClick={() => fire(p, 'sequence')}
                          title="La confirmación con el enlace para unirse, más el recordatorio que toca ahora (o el seguimiento si ya terminó)."
                        >
                          <EvIcon name="ti-refresh" size={14} />
                          {busy === `${p.id}:sequence` ? 'Enviando…' : armed === `${p.id}:sequence` ? 'Enviar ahora' : 'Reenviar secuencia'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="evx-mail-legend">
        <span><span className="evx-mail-cell is-sent"><EvIcon name="ti-check" size={12} /></span> Enviado</span>
        <span><span className="evx-mail-cell is-later"><EvIcon name="ti-clock" size={11} /></span> Sale más tarde</span>
        <span><span className="evx-mail-cell is-missed"><span className="evx-mail-dash" /></span> No enviado</span>
      </div>

      {toast && <div className="evx-mail-toast" role="status">{toast}</div>}
    </div>
  )
}
