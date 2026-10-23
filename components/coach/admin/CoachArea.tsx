'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CoachProvider, useCoach } from '@/lib/coach/store'
import { Spinner } from '@/components/coach/ui'

interface AreaCtx { toast: (m: string) => void }
const Ctx = createContext<AreaCtx>({ toast: () => {} })
export const useArea = () => useContext(Ctx)

/** The coach side lives inside /admin but uses the app's own light design, so
 *  every chart and photo looks exactly as the client sees it. */
export default function CoachArea({ children }: { children: ReactNode }) {
  return <CoachProvider as="coach"><Inner>{children}</Inner></CoachProvider>
}

function Inner({ children }: { children: ReactNode }) {
  const { ready, coach, store } = useCoach()
  const [msg, setMsg] = useState<string | null>(null)
  const toast = useCallback((m: string) => { setMsg(m); window.setTimeout(() => setMsg(x => (x === m ? null : x)), 2600) }, [])
  const style = useMemo(() => ({ ['--brand' as string]: coach.primary, ['--brand-deep' as string]: coach.accent }), [coach])
  return (
    <Ctx.Provider value={{ toast }}>
      <div className="ca ca-admin" style={style}>
        {store.mode === 'demo' && ready && (
          <div className="ca-demo-bar">Modo demo: los datos se guardan solo en este navegador hasta que conectes la base de datos (Supabase) en Vercel.</div>
        )}
        {ready ? children : <Spinner />}
        {msg && <div className="ca-toast" role="status">{msg}</div>}
      </div>
    </Ctx.Provider>
  )
}
