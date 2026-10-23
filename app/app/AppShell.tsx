'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Home, Dumbbell, Salad, TrendingUp, MessageCircle } from 'lucide-react'
import { CoachProvider, useCoach } from '@/lib/coach/store'
import type { Client } from '@/lib/coach/types'
import { initials } from '@/lib/coach/util'

const AS_KEY = 'coachapp:as'

interface AppCtx {
  client: Client | null
  setClient: (c: Client) => void
  saveClient: (patch: Partial<Client>) => Promise<void>
  toast: (msg: string) => void
  unread: number
  refreshUnread: () => void
}
const Ctx = createContext<AppCtx | null>(null)
export function useApp(): AppCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside AppShell')
  return c
}

/** Keeps `?as=` (a coach opening one client's app) for the whole visit. */
function useViewAs(): string | null {
  const params = useSearchParams()
  const fromUrl = params.get('as')
  const [as, setAs] = useState<string | null>(fromUrl)
  useEffect(() => {
    try {
      if (fromUrl === 'off') { sessionStorage.removeItem(AS_KEY); setAs(null); return }
      if (fromUrl) { sessionStorage.setItem(AS_KEY, fromUrl); setAs(fromUrl); return }
      setAs(sessionStorage.getItem(AS_KEY))
    } catch { /* private mode */ }
  }, [fromUrl])
  return as
}

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const as = useViewAs()
  if (path === '/app/login') return <div className="ca">{children}</div>
  return (
    <CoachProvider as={as}>
      <Inner>{children}</Inner>
    </CoachProvider>
  )
}

const TABS = [
  { href: '/app', label: 'Hoy', Icon: Home },
  { href: '/app/train', label: 'Entrenos', Icon: Dumbbell },
  { href: '/app/food', label: 'Nutrición', Icon: Salad },
  { href: '/app/progress', label: 'Progreso', Icon: TrendingUp },
  { href: '/app/chat', label: 'Chat', Icon: MessageCircle },
]

function Inner({ children }: { children: ReactNode }) {
  const { ready, store, viewer, coach, clientId, viewingAs } = useCoach()
  const path = usePathname()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [missing, setMissing] = useState(false)
  const [toastMsg, setToast] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!ready) return
    if (!viewer) { router.replace('/app/login'); return }
    if (!clientId) { setMissing(true); return }
    store.get('clients', clientId).then(c => { if (c) setClient(c); else setMissing(true) }).catch(() => setMissing(true))
  }, [ready, viewer, clientId, store, router])

  // A client with no intake answers it first. A coach looking in never is.
  useEffect(() => {
    if (client && !client.intake && !viewingAs && path !== '/app/onboarding') router.replace('/app/onboarding')
  }, [client, viewingAs, path, router])

  const refreshUnread = useCallback(() => {
    if (!clientId) return
    store.list('messages', { clientId }).then(ms => setUnread(ms.filter(m => m.from === 'coach' && !m.read).length)).catch(() => {})
  }, [store, clientId])
  useEffect(() => { if (ready) refreshUnread() }, [ready, refreshUnread, path])

  const toast = useCallback((msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 2600) }, [])
  const saveClient = useCallback(async (patch: Partial<Client>) => {
    if (!client) return
    const next = { ...client, ...patch }
    setClient(next)
    await store.put('clients', next)
  }, [client, store])

  const style = useMemo(() => ({ ['--brand' as string]: coach.primary, ['--brand-deep' as string]: coach.accent }), [coach])
  const value = useMemo(() => ({ client, setClient, saveClient, toast, unread, refreshUnread }), [client, saveClient, toast, unread, refreshUnread])
  const bare = path === '/app/onboarding'

  return (
    <div className="ca" style={style}>
      {viewingAs && client && (
        <div className="ca-viewas">
          <span>Viendo la app de {client.name}</span>
          <a href={`/admin/coaching/${client.id}`} onClick={() => { try { sessionStorage.removeItem(AS_KEY) } catch {} }}>Volver al panel</a>
        </div>
      )}
      {!ready || (!client && !missing) ? <div className="ca-spin" /> : missing ? (
        <main className="ca-main"><div className="ca-card ca-empty">
          <div className="ca-empty-title">No encontramos tu cuenta</div>
          <div className="ca-muted" style={{ fontSize: 14 }}>Abre el enlace que te mandó tu entrenador, o pide uno nuevo.</div>
          <Link className="ca-btn" href="/app/login">Entrar con mi email</Link>
        </div></main>
      ) : (
        <Ctx.Provider value={value}>
          {children}
          {!bare && (
            <nav className="ca-tabs" aria-label="Menú">
              <div className="ca-tabs-in">
                {TABS.map(({ href, label, Icon }) => {
                  const on = href === '/app' ? path === '/app' : path.startsWith(href)
                  return (
                    <Link key={href} href={href} className={`ca-tab${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
                      <Icon strokeWidth={on ? 2.4 : 2} />
                      {label}
                      {href === '/app/chat' && unread > 0 && <span className="ca-tab-dot">{unread}</span>}
                    </Link>
                  )
                })}
              </div>
            </nav>
          )}
        </Ctx.Provider>
      )}
      {toastMsg && <div className="ca-toast" role="status">{toastMsg}</div>}
    </div>
  )
}

/** The coach's logo or initials, and the brand name. */
export function BrandMark({ small }: { small?: boolean }) {
  const { coach } = useCoach()
  return (
    <Link href="/app" className="ca-brand">
      <span className="ca-brand-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {coach.logoUrl ? <img src={coach.logoUrl} alt="" /> : initials(coach.brandName)}
      </span>
      {!small && <span className="ca-brand-name">{coach.brandName}</span>}
    </Link>
  )
}
