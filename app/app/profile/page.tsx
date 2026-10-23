'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, LogOut, Camera } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp } from '../AppShell'
import { Avatar, Sheet, Spinner } from '@/components/coach/ui'
import VideoPlayer from '@/components/coach/VideoPlayer'
import { ageFrom, shrinkImage } from '@/lib/coach/util'
import { bmi } from '@/lib/coach/fitness'

const GOAL: Record<string, string> = { lose_fat: 'Perder grasa', recomp: 'Recomposición', gain_muscle: 'Ganar músculo', strength: 'Fuerza', health: 'Salud y energía', performance: 'Rendimiento' }

export default function Profile() {
  const params = useSearchParams()
  const { store, clientId, coach, viewingAs } = useCoach()
  const { client, saveClient, toast } = useApp()
  const [openId, setOpenId] = useState<string | null>(params.get('r'))
  const fileRef = useRef<HTMLInputElement>(null)
  const [phone, setPhone] = useState(client?.phone ?? '')
  const { data } = useData(async s => (await s.list('resources')).filter(r => !r.clientId || r.clientId === clientId), [clientId])
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  useEffect(() => { if (client?.avatarUrl) store.fileUrl(client.avatarUrl).then(setAvatar).catch(() => {}) }, [client?.avatarUrl, store])

  if (!client) return <main className="ca-main"><Spinner /></main>
  const i = client.intake
  const res = data?.find(r => r.id === openId)

  async function onAvatar(f?: File) {
    if (!f || !client) return
    try { const b = await shrinkImage(f, 400); const path = await store.upload(b, client.id); await saveClient({ avatarUrl: path }); toast('Foto actualizada') }
    catch { toast('No se pudo subir la foto.') }
  }

  return (
    <main className="ca-main ca-stack">
      <div className="ca-top"><Link href="/app" className="ca-icon-btn" aria-label="Volver"><ArrowLeft /></Link></div>
      <div className="ca-row">
        <button onClick={() => !viewingAs && fileRef.current?.click()} style={{ position: 'relative', border: 0, background: 'none', padding: 0, cursor: 'pointer' }} aria-label="Cambiar foto">
          <Avatar name={client.name} url={avatar} size={72} />
          {!viewingAs && <span style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center' }}><Camera size={14} /></span>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => onAvatar(e.target.files?.[0])} />
        <div><h1 style={{ fontSize: 24 }}>{client.name}</h1><div className="ca-muted">{client.email}</div>{client.plan && <span className="ca-pill" style={{ marginTop: 6 }}>{client.plan}</span>}</div>
      </div>

      {i && (
        <div className="ca-card">
          <div className="ca-between" style={{ marginBottom: 10 }}><h3>Tu ficha</h3>{!viewingAs && <Link href="/app/onboarding" className="ca-link">Editar</Link>}</div>
          <div className="ca-list">
            {([
              ['Objetivo', GOAL[i.goal]], ['Edad', ageFrom(i.birthDate) ? `${ageFrom(i.birthDate)} años` : '–'], ['Altura', `${i.heightCm} cm`],
              ['Peso inicial', `${i.weightKg} kg`], ['Objetivo de peso', `${i.targetWeightKg} kg`], ['IMC', String(bmi(i))],
              ['Días por semana', String(i.daysPerWeek)], ['Lesiones', i.injuries || 'Ninguna'], ['Alergias', i.allergies || 'Ninguna'],
            ] as [string, string][]).map(([k, v]) => <div key={k} className="ca-li" style={{ cursor: 'default', padding: '9px 0' }}><span className="ca-muted" style={{ flex: 1 }}>{k}</span><b style={{ color: 'var(--ink)', textAlign: 'right' }}>{v}</b></div>)}
          </div>
        </div>
      )}

      {client.targets && <div className="ca-card"><h3 style={{ marginBottom: 10 }}>Tus objetivos diarios</h3>
        <div className="ca-macro">{[['kcal', client.targets.kcal, ''], ['Proteína', client.targets.protein, 'g'], ['Carbos', client.targets.carbs, 'g'], ['Grasa', client.targets.fat, 'g']].map(([l, v, u]) => <div key={l as string}><b>{v}{u}</b><small>{l}</small></div>)}</div></div>}

      {!viewingAs && <div className="ca-card ca-stack">
        <h3>Contacto</h3>
        <label className="ca-field"><span className="ca-label">Teléfono / WhatsApp</span><input className="ca-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} onBlur={() => phone !== (client.phone ?? '') && saveClient({ phone }).then(() => toast('Guardado'))} /></label>
      </div>}

      <div id="recursos" className="ca-section-title"><h2>Recursos de {coach.name.split(' ')[0]}</h2></div>
      {!data ? <Spinner /> : data.length ? (
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {data.map(r => (
            <button key={r.id} className="ca-li" onClick={() => r.kind === 'link' && r.url ? window.open(r.url, '_blank', 'noopener') : setOpenId(r.id)}>
              <div className="ca-thumb" style={{ width: 44, height: 44, fontSize: 18 }}>{r.kind === 'video' ? '▶' : r.kind === 'link' ? '🔗' : '📄'}</div>
              <div className="ca-li-main"><div className="ca-li-title">{r.title}</div><div className="ca-li-sub">{r.kind === 'video' ? 'Vídeo' : r.kind === 'link' ? 'Enlace' : 'Guía'}</div></div>
              {r.kind === 'link' && <ExternalLink size={16} className="ca-chev" />}
            </button>
          ))}
        </div>
      ) : <div className="ca-card ca-muted" style={{ fontSize: 14 }}>Aquí aparecerán guías y vídeos de tu entrenador.</div>}

      {!viewingAs && <a href="/api/auth/logout?next=/app/login" className="ca-btn ca-btn-ghost ca-btn-block" style={{ marginTop: 10 }}><LogOut size={18} /> Cerrar sesión</a>}

      <Sheet open={!!res} onClose={() => setOpenId(null)} title={res?.title} wide>
        {res && <div className="ca-stack">
          {res.kind === 'video' && res.url && <VideoPlayer url={res.url} />}
          {res.body && <div style={{ whiteSpace: 'pre-wrap' }}>{res.body}</div>}
        </div>}
      </Sheet>
    </main>
  )
}
