'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Play, Flame, ClipboardCheck, BookOpen, User } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp, BrandMark } from './AppShell'
import { Ring, Spinner, Avatar } from '@/components/coach/ui'
import { addDays, parseYmd, weekStart, ymd } from '@/lib/coach/util'
import { adherence } from '@/lib/coach/fitness'

const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Today() {
  const { coach, clientId } = useCoach()
  const { client } = useApp()
  const today = ymd()
  const [sel, setSel] = useState(today)
  const { data } = useData(async s => {
    const [workouts, logs, checkins, messages, resources, plans] = await Promise.all([
      s.list('workouts', { clientId }), s.list('logs', { clientId }), s.list('checkins', { clientId }),
      s.list('messages', { clientId }), s.list('resources'), s.list('nutrition', { clientId }),
    ])
    return { workouts, logs, checkins, messages, resources: resources.filter(r => !r.clientId || r.clientId === clientId), plan: plans[0] ?? null }
  }, [clientId])

  const week = useMemo(() => { const w = weekStart(today); return Array.from({ length: 7 }, (_, i) => addDays(w, i)) }, [today])
  if (!data || !client) return <main className="ca-main"><Spinner /></main>

  const doneIds = new Set(data.logs.filter(l => l.finishedAt).map(l => l.workoutId))
  const byDay = (d: string) => data.workouts.filter(w => w.date === d)
  const dayWorkouts = byDay(sel)
  const wk = adherence(data.workouts, data.logs, week[0], week[6])
  const checkedThisWeek = data.checkins.some(c => c.date >= week[0])
  const lastCoach = [...data.messages].filter(m => m.from === 'coach').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const minutes = data.logs.filter(l => l.finishedAt && l.date >= week[0]).reduce((n, l) => n + (l.durationSec ?? 0), 0) / 60
  const upcoming = data.workouts.filter(w => w.date && w.date > today && !doneIds.has(w.id)).sort((a, b) => a.date!.localeCompare(b.date!))[0]
  const targets = data.plan?.targets ?? client.targets
  const first = client.name.split(' ')[0]

  return (
    <main className="ca-main ca-stack">
      <div className="ca-top">
        <BrandMark />
        <Link href="/app/profile" aria-label="Mi perfil" style={{ textDecoration: 'none' }}><Avatar name={client.name} url={client.avatarUrl} size={40} /></Link>
      </div>

      <div>
        <div className="ca-muted" style={{ fontWeight: 700 }}>{greeting()}, {first}</div>
        <h1 style={{ marginTop: 2 }}>{dayWorkouts.length ? 'Hoy toca entrenar' : sel === today ? 'Hoy es día de descanso' : parseYmd(sel).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
      </div>

      <div className="ca-card ca-card-tight">
        <div className="ca-week">
          {week.map((d, i) => {
            const ws = byDay(d)
            const done = ws.length > 0 && ws.every(w => doneIds.has(w.id))
            return (
              <button key={d} className={`ca-day${d === today ? ' today' : ''}${d === sel ? ' sel' : ''}`} onClick={() => setSel(d)} aria-pressed={d === sel}>
                <small>{DOW[i]}</small><b>{parseYmd(d).getDate()}</b>
                <span className={`ca-day-dot${done ? ' done' : ws.length ? ' plan' : ''}`} />
              </button>
            )
          })}
        </div>
      </div>

      {dayWorkouts.length ? dayWorkouts.map(w => {
        const exCount = w.blocks.reduce((n, b) => n + b.items.length, 0)
        const done = doneIds.has(w.id)
        return (
          <Link key={w.id} href={`/app/train/${w.id}`} className="ca-card ca-hero" style={{ textDecoration: 'none', display: 'block' }}>
            <div className="ca-eyebrow">{done ? 'Completado ✓' : 'Entreno del día'}</div>
            <h2 style={{ marginTop: 6, fontSize: 24 }}>{w.name}</h2>
            <div style={{ opacity: .85, marginTop: 4 }}>{exCount} ejercicios · {w.blocks.length} {w.blocks.length === 1 ? 'bloque' : 'bloques'}</div>
            <div className="ca-btn ca-btn-white" style={{ marginTop: 16 }}><Play size={18} fill="currentColor" /> {done ? 'Ver sesión' : 'Empezar'}</div>
          </Link>
        )
      }) : (
        <div className="ca-card ca-row">
          <div className="ca-thumb">🧘</div>
          <div className="ca-li-main">
            <div className="ca-li-title">Descanso activo</div>
            <div className="ca-li-sub">{upcoming ? `Próximo: ${upcoming.name}, ${parseYmd(upcoming.date!).toLocaleDateString('es', { weekday: 'long' })}` : 'Camina, estira y duerme bien.'}</div>
          </div>
          {upcoming && <Link href={`/app/train/${upcoming.id}`} className="ca-chev" aria-label="Ver"><ChevronRight /></Link>}
        </div>
      )}

      <div className="ca-section-title"><h2>Tu semana</h2></div>
      <div className="ca-card ca-row" style={{ gap: 18 }}>
        <Ring value={wk.planned ? wk.done / wk.planned : 0} size={84} stroke={9}>
          <div><b className="ca-display" style={{ fontSize: 20 }}>{wk.done}/{wk.planned}</b><div className="ca-muted" style={{ fontSize: 11 }}>entrenos</div></div>
        </Ring>
        <div className="ca-stack" style={{ gap: 8, flex: 1 }}>
          <div className="ca-between"><span className="ca-muted">Minutos entrenados</span><b>{Math.round(minutes)}</b></div>
          <div className="ca-between"><span className="ca-muted">Cumplimiento</span><b>{wk.pct}%</b></div>
          <div className="ca-between"><span className="ca-muted">Check-in</span>{checkedThisWeek ? <span className="ca-pill ca-pill-ok">Enviado</span> : <span className="ca-pill ca-pill-warn">Pendiente</span>}</div>
        </div>
      </div>

      {!checkedThisWeek && (
        <Link href="/app/progress?checkin=1" className="ca-card ca-row" style={{ textDecoration: 'none' }}>
          <div className="ca-thumb"><ClipboardCheck /></div>
          <div className="ca-li-main"><div className="ca-li-title">Haz tu check-in semanal</div><div className="ca-li-sub">1 minuto. {coach.name.split(' ')[0]} lo usa para ajustar tu plan.</div></div>
          <ChevronRight className="ca-chev" />
        </Link>
      )}

      {targets && (
        <Link href="/app/food" className="ca-card" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="ca-between" style={{ marginBottom: 12 }}><h3><Flame size={16} style={{ verticalAlign: -2, color: 'var(--brand)' }} /> Nutrición de hoy</h3><ChevronRight className="ca-chev" /></div>
          <div className="ca-macro">
            {[['kcal', targets.kcal, ''], ['Proteína', targets.protein, 'g'], ['Carbos', targets.carbs, 'g'], ['Grasa', targets.fat, 'g']].map(([l, v, u]) => <div key={l as string}><b>{v}{u}</b><small>{l}</small></div>)}
          </div>
        </Link>
      )}

      {lastCoach && (
        <Link href="/app/chat" className="ca-card ca-row" style={{ textDecoration: 'none', alignItems: 'flex-start' }}>
          <Avatar name={coach.name} url={coach.photoUrl} size={42} />
          <div className="ca-li-main">
            <div className="ca-between"><b style={{ color: 'var(--ink)' }}>{coach.name}</b>{!lastCoach.read && <span className="ca-pill">Nuevo</span>}</div>
            <div className="ca-li-sub" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{lastCoach.text}</div>
          </div>
        </Link>
      )}

      {client.intake?.why && (
        <div className="ca-card" style={{ background: 'var(--ice)', border: 0 }}>
          <div className="ca-eyebrow" style={{ color: 'var(--brand-deep)' }}>Tu porqué</div>
          <div style={{ marginTop: 6, color: 'var(--ink)', fontStyle: 'italic' }}>&ldquo;{client.intake.why}&rdquo;</div>
        </div>
      )}

      {data.resources.length > 0 && <>
        <div className="ca-section-title"><h2>Para ti</h2><Link href="/app/profile#recursos">Ver todo</Link></div>
        <div className="ca-card ca-list" style={{ padding: '4px 16px' }}>
          {data.resources.slice(0, 3).map(r => (
            <Link key={r.id} href={`/app/profile?r=${r.id}#recursos`} className="ca-li">
              <div className="ca-thumb" style={{ width: 44, height: 44 }}><BookOpen size={20} /></div>
              <div className="ca-li-main"><div className="ca-li-title">{r.title}</div><div className="ca-li-sub">{r.kind === 'video' ? 'Vídeo' : r.kind === 'link' ? 'Enlace' : 'Guía'}</div></div>
              <ChevronRight className="ca-chev" />
            </Link>
          ))}
        </div>
      </>}

      <Link href="/app/profile" className="ca-link" style={{ textAlign: 'center', padding: 10 }}><User size={14} style={{ verticalAlign: -2 }} /> Mi perfil y ficha</Link>
    </main>
  )
}
