'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Coach } from '../types'
import type { Store } from './types'
import { demoStore, ensureSeeded } from './demo'
import { liveStore } from './live'
import { DEMO_CLIENT_ID, DEMO_COACH_ID } from './seed'

export const DEFAULT_COACH: Coach = {
  id: DEMO_COACH_ID, name: 'José Sánchez', email: 'hola@joseunstoppable.com', brandName: 'José Unstoppable',
  tagline: 'Entrena con propósito', primary: '#2D6BFF', accent: '#0B3A8F', lang: 'es',
}

export interface AppViewer { role: 'coach' | 'client'; coachId: string; clientId?: string; email: string; name?: string }

interface Ctx {
  ready: boolean
  store: Store
  viewer: AppViewer | null
  coach: Coach
  setCoach: (c: Coach) => void
  /** The client this screen is about (their own id, or the one a coach opened). */
  clientId: string | null
  /** A coach looking at a client's app. */
  viewingAs: boolean
}

const CoachCtx = createContext<Ctx | null>(null)

export function useCoach(): Ctx {
  const c = useContext(CoachCtx)
  if (!c) throw new Error('useCoach outside CoachProvider')
  return c
}

/**
 * Picks the store once: live when the server has a database, the demo
 * otherwise. `as` lets a coach open one client's app (demo: anyone may).
 */
export function CoachProvider({ children, as }: { children: ReactNode; as?: string | null }) {
  const [state, setState] = useState<Omit<Ctx, 'setCoach'>>({
    ready: false, store: demoStore, viewer: null, coach: DEFAULT_COACH, clientId: null, viewingAs: false,
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const me = await fetch('/api/coach/me', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ live: false }))
      let store: Store = demoStore
      let viewer: AppViewer | null
      if (me.live) {
        store = liveStore
        viewer = me.viewer ?? null
      } else {
        ensureSeeded()
        viewer = as === 'coach'
          ? { role: 'coach', coachId: DEMO_COACH_ID, email: DEFAULT_COACH.email }
          : { role: 'client', coachId: DEMO_COACH_ID, clientId: DEMO_CLIENT_ID, email: 'nevin@example.com', name: 'Nevin Henriquez' }
      }
      const coaches = viewer ? await store.list('coaches').catch(() => []) : []
      const coach = coaches[0] ?? DEFAULT_COACH
      const viewingAs = !!as && as !== 'coach' && (viewer?.role === 'coach' || !me.live)
      const clientId = viewingAs ? as! : viewer?.role === 'client' ? viewer.clientId ?? null : null
      if (alive) setState({ ready: true, store, viewer, coach, clientId, viewingAs })
    })()
    return () => { alive = false }
  }, [as])

  return (
    <CoachCtx.Provider value={{ ...state, setCoach: coach => setState(s => ({ ...s, coach })) }}>
      {children}
    </CoachCtx.Provider>
  )
}
