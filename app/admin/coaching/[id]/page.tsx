'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ExternalLink, Send } from 'lucide-react'
import { useData } from '@/lib/coach/hooks'
import { Avatar, Spinner } from '@/components/coach/ui'
import InviteSheet from '@/components/coach/admin/InviteSheet'
import { Summary, Trainings, Progress, Nutrition, PhotosTab, Profile, Checkins, ChatTab, type ClientData } from '@/components/coach/admin/client/Tabs'

const TABS = [
  ['summary', 'Resumen'], ['train', 'Entrenos'], ['progress', 'Progreso'], ['food', 'Nutrición'],
  ['photos', 'Fotos'], ['checkins', 'Check-ins'], ['chat', 'Chat'], ['profile', 'Ficha'],
] as const
type Tab = typeof TABS[number][0]

export default function CoachClient() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('summary')
  const [invite, setInvite] = useState(false)
  const { data, reload, setData, error } = useData<ClientData | false>(async s => {
    const client = await s.get('clients', id)
    if (!client) return false
    const [workouts, logs, metrics, photos, nutrition, messages, checkins, exercises, templates, foodTemplates] = await Promise.all([
      s.list('workouts', { clientId: id }), s.list('logs', { clientId: id }), s.list('metrics', { clientId: id }), s.list('photos', { clientId: id }),
      s.list('nutrition', { clientId: id }), s.list('messages', { clientId: id }), s.list('checkins', { clientId: id }), s.list('exercises'),
      s.list('workouts', { clientId: null }), s.list('nutrition', { clientId: null }),
    ])
    return { client, workouts, logs, metrics, photos, nutrition, messages, checkins, exercises, templates, foodTemplates }
  }, [id])

  if (error) return <div className="ca-alert">{error}</div>
  if (data === null) return <Spinner />
  if (data === false) return <div className="ca-stack"><Link href="/admin/coaching" className="ca-link">← Clientes</Link><div className="ca-alert">No encontramos a este cliente.</div></div>
  const c = data.client
  const unread = data.messages.filter(m => m.from === 'client' && !m.read).length
  const props = { d: data, reload, patch: (p: Partial<ClientData>) => setData(x => (x ? { ...x, ...p } : x)) }

  return (
    <div className="ca-stack" style={{ gap: 18 }}>
      <Link href="/admin/coaching" className="ca-link" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontWeight: 700 }}><ArrowLeft size={16} /> Clientes</Link>
      <div className="ca-page-head" style={{ marginBottom: 0 }}>
        <div className="ca-row" style={{ gap: 14 }}>
          <Avatar name={c.name} size={56} />
          <div>
            <h1 style={{ fontSize: 26 }}>{c.name}</h1>
            <div className="ca-muted" style={{ fontSize: 14 }}>{c.email}{c.plan ? ` · ${c.plan}` : ''}</div>
          </div>
        </div>
        <div className="ca-row" style={{ flexWrap: 'wrap' }}>
          <button className="ca-btn ca-btn-ghost" onClick={() => setInvite(true)}><Send size={17} /> Invitar</button>
          <a className="ca-btn ca-btn-soft" href={`/app?as=${c.id}`} target="_blank" rel="noopener"><ExternalLink size={17} /> Abrir su app</a>
        </div>
      </div>
      <div className="ca-tabbar-inline" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'chat' && unread ? ` (${unread})` : ''}</button>)}
      </div>
      {tab === 'summary' && <Summary {...props} go={setTab} />}
      {tab === 'train' && <Trainings {...props} />}
      {tab === 'progress' && <Progress {...props} />}
      {tab === 'food' && <Nutrition {...props} />}
      {tab === 'photos' && <PhotosTab {...props} />}
      {tab === 'checkins' && <Checkins {...props} />}
      {tab === 'chat' && <ChatTab {...props} />}
      {tab === 'profile' && <Profile {...props} />}
      {invite && <InviteSheet client={c} onClose={() => setInvite(false)} />}
    </div>
  )
}
