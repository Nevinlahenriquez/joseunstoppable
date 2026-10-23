'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, ChefHat } from 'lucide-react'
import { useCoach } from '@/lib/coach/store'
import { useData } from '@/lib/coach/hooks'
import { useApp, BrandMark } from '../AppShell'
import { Empty, Ring, Sheet, Spinner } from '@/components/coach/ui'
import { mealTotals, shoppingList, fmtQty } from '@/lib/coach/fitness'

export default function Food() {
  const { clientId, coach } = useCoach()
  const { client } = useApp()
  const { data } = useData(async s => (await s.list('nutrition', { clientId })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [clientId])
  const plan = data?.[0] ?? null
  const key = plan ? `coachapp:picks:${plan.id}` : ''
  const [picks, setPicks] = useState<Record<number, number>>({})
  const [open, setOpen] = useState<number | null>(null)
  const [shop, setShop] = useState(false)
  const [days, setDays] = useState(7)
  const [have, setHave] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!key) return
    try { setPicks(JSON.parse(localStorage.getItem(key) || '{}')); setHave(JSON.parse(localStorage.getItem(key + ':have') || '{}')) } catch {}
  }, [key])
  const pick = (mi: number, oi: number) => setPicks(p => { const n = { ...p, [mi]: oi }; try { localStorage.setItem(key, JSON.stringify(n)) } catch {} return n })
  const toggleHave = (k: string) => setHave(h => { const n = { ...h, [k]: !h[k] }; try { localStorage.setItem(key + ':have', JSON.stringify(n)) } catch {} return n })

  if (!data) return <main className="ca-main"><Spinner /></main>
  const targets = plan?.targets ?? client?.targets

  if (!plan) {
    return (
      <main className="ca-main ca-stack">
        <div className="ca-top"><BrandMark /></div>
        <h1>Nutrición</h1>
        {targets && <div className="ca-card ca-macro">{[['kcal', targets.kcal, ''], ['Proteína', targets.protein, 'g'], ['Carbos', targets.carbs, 'g'], ['Grasa', targets.fat, 'g']].map(([l, v, u]) => <div key={l as string}><b>{v}{u}</b><small>{l}</small></div>)}</div>}
        <div className="ca-card"><Empty icon="🥗" title="Tu plan de comidas está en camino" text={`${coach.name.split(' ')[0]} lo prepara con lo que contaste en tu ficha. Mientras, apunta a tus macros de arriba.`} /></div>
      </main>
    )
  }

  const chosen = plan.meals.map((m, mi) => m.options[picks[mi] ?? 0] ?? m.options[0])
  const total = mealTotals(chosen.flatMap(o => o?.foods ?? []))
  const list = shoppingList(plan, picks, days)

  return (
    <main className="ca-main ca-stack">
      <div className="ca-top"><BrandMark /><button className="ca-btn ca-btn-soft ca-btn-sm" onClick={() => setShop(true)}><ShoppingCart size={16} /> Lista de la compra</button></div>
      <div><div className="ca-eyebrow">Tu plan</div><h1 style={{ marginTop: 4 }}>{plan.name}</h1></div>

      <div className="ca-card ca-row" style={{ gap: 18 }}>
        <Ring value={targets?.kcal ? total.kcal / targets.kcal : 0} size={92} stroke={9}>
          <div><b className="ca-display" style={{ fontSize: 20 }}>{Math.round(total.kcal)}</b><div className="ca-muted" style={{ fontSize: 11 }}>de {targets?.kcal ?? '–'} kcal</div></div>
        </Ring>
        <div className="ca-stack" style={{ gap: 10, flex: 1 }}>
          {([['Proteína', total.p, targets?.protein], ['Carbos', total.c, targets?.carbs], ['Grasa', total.f, targets?.fat]] as const).map(([l, v, t]) => (
            <div key={l}>
              <div className="ca-between" style={{ fontSize: 13 }}><span className="ca-muted" style={{ fontWeight: 700 }}>{l}</span><b>{Math.round(v)} / {t ?? '–'} g</b></div>
              <div className="ca-progress" style={{ height: 6, marginTop: 4 }}><i style={{ width: `${t ? Math.min(100, (v / t) * 100) : 0}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      {plan.notes && <div className="ca-card" style={{ background: 'var(--ice)', border: 0 }}><div className="ca-eyebrow" style={{ color: 'var(--brand-deep)' }}>Nota de {coach.name.split(' ')[0]}</div><div style={{ marginTop: 4, color: 'var(--ink)' }}>{plan.notes}</div></div>}

      {plan.meals.map((m, mi) => {
        const oi = picks[mi] ?? 0
        const opt = m.options[oi] ?? m.options[0]
        const t = mealTotals(opt?.foods ?? [])
        return (
          <div key={mi} className="ca-card ca-stack" style={{ gap: 12 }}>
            <div className="ca-between">
              <div><h3>{m.name}</h3>{m.time && <div className="ca-muted" style={{ fontSize: 13 }}>{m.time}</div>}</div>
              <span className="ca-pill">{Math.round(t.kcal)} kcal</span>
            </div>
            {m.options.length > 1 && (
              <div className="ca-tabbar-inline">
                {m.options.map((o, i) => <button key={i} className={i === oi ? 'on' : ''} onClick={() => pick(mi, i)}>{o.name || `Opción ${i + 1}`}</button>)}
              </div>
            )}
            <div className="ca-list">
              {(opt?.foods ?? []).map((f, i) => (
                <div key={i} className="ca-li" style={{ cursor: 'default', padding: '9px 0' }}>
                  <div className="ca-li-main"><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{f.name}</div><div className="ca-li-sub">{f.p}P · {f.c}C · {f.f}G</div></div>
                  <b style={{ fontSize: 14 }}>{fmtQty(f.qty, f.unit)}</b>
                </div>
              ))}
            </div>
            {opt?.recipe && <button className="ca-link" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(mi)}><ChefHat size={15} style={{ verticalAlign: -3 }} /> Ver receta</button>}
          </div>
        )
      })}

      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open !== null ? (plan.meals[open].options[picks[open] ?? 0]?.name || plan.meals[open].name) : ''}>
        {open !== null && <div style={{ whiteSpace: 'pre-wrap' }}>{plan.meals[open].options[picks[open] ?? 0]?.recipe}</div>}
      </Sheet>

      <Sheet open={shop} onClose={() => setShop(false)} title="Lista de la compra">
        <div className="ca-stack">
          <div className="ca-chips">{[3, 7, 14].map(n => <button key={n} className={`ca-chip${days === n ? ' on' : ''}`} onClick={() => setDays(n)}>{n} días</button>)}</div>
          <div className="ca-muted" style={{ fontSize: 13 }}>Con las opciones que tienes elegidas en cada comida.</div>
          <div className="ca-list">
            {list.map(it => {
              const k = `${it.name}|${it.unit}`
              return (
                <label key={k} className="ca-li" style={{ padding: '10px 0' }}>
                  <input type="checkbox" checked={!!have[k]} onChange={() => toggleHave(k)} style={{ width: 22, height: 22, accentColor: coach.primary }} />
                  <div className="ca-li-main" style={{ textDecoration: have[k] ? 'line-through' : undefined, opacity: have[k] ? .55 : 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{it.name}</div><div className="ca-li-sub">{it.meals.join(', ')}</div>
                  </div>
                  <b>{fmtQty(it.qty, it.unit)}</b>
                </label>
              )
            })}
          </div>
        </div>
      </Sheet>
    </main>
  )
}
