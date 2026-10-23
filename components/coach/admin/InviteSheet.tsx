'use client'

import { useEffect, useState } from 'react'
import { Copy, Mail, MessageCircle } from 'lucide-react'
import type { Client } from '@/lib/coach/types'
import { Sheet, Spinner } from '@/components/coach/ui'
import { useCoach } from '@/lib/coach/store'
import { useArea } from './CoachArea'

/** The personal link a client signs in with. WhatsApp is how José sends it. */
export default function InviteSheet({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const { store, coach } = useCoach()
  const { toast } = useArea()
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mailing, setMailing] = useState(false)

  useEffect(() => {
    setUrl(null); setErr(null)
    if (!client) return
    if (store.mode === 'demo') { setUrl(`${location.origin}/app?as=${client.id}`); return }
    fetch('/api/coach/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: client.id }) })
      .then(r => r.json()).then(j => (j.ok ? setUrl(j.url) : setErr(j.error ?? 'No se pudo crear el enlace.'))).catch(() => setErr('Sin conexión.'))
  }, [client, store.mode])

  if (!client) return null
  const first = client.name.split(' ')[0]
  const text = `Hola ${first}! Aquí tienes tu acceso a la app de ${coach.brandName}: entrenos, nutrición y tu progreso en un sitio. Entra con este enlace personal: ${url ?? ''}`
  const phone = (client.phone ?? '').replace(/[^\d]/g, '')

  async function email() {
    if (!client) return
    setMailing(true)
    try {
      const j = await fetch('/api/coach/invite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: client.id, email: true }) }).then(r => r.json())
      toast(j.emailed ? `Email enviado a ${client.email}` : (j.error ?? 'El email no salió. Envía el enlace por WhatsApp.'))
    } catch { toast('Sin conexión.') } finally { setMailing(false) }
  }

  return (
    <Sheet open onClose={onClose} title={`Invitar a ${first}`}>
      <div className="ca-stack">
        {store.mode === 'demo' && <div className="ca-alert info">Demo: este enlace abre su app en este navegador. Con la base de datos conectada, aquí aparece su enlace personal de acceso (válido 14 días).</div>}
        {err && <div className="ca-alert">{err}</div>}
        {!url && !err && <Spinner />}
        {url && <>
          <div className="ca-card ca-card-tight" style={{ wordBreak: 'break-all', fontSize: 14, background: 'var(--mist)' }}>{url}</div>
          <a className="ca-btn ca-btn-block" href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener"><MessageCircle size={18} /> Enviar por WhatsApp</a>
          <button className="ca-btn ca-btn-soft ca-btn-block" onClick={() => { navigator.clipboard?.writeText(text).then(() => toast('Mensaje copiado'), () => toast('No se pudo copiar')) }}><Copy size={18} /> Copiar mensaje</button>
          {store.mode === 'live' && <button className="ca-btn ca-btn-ghost ca-btn-block" onClick={email} disabled={mailing}><Mail size={18} /> {mailing ? 'Enviando…' : `Enviar por email a ${client.email}`}</button>}
        </>}
      </div>
    </Sheet>
  )
}
