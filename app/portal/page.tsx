import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { serviceDb } from '@/lib/os-supabase'
import { readSetting } from '@/lib/app-settings'
import { money } from '@/lib/email'
import { accessFor, loadPortal, readPortalSession, type PortalData } from '@/lib/portal-server'
import { DEFAULT_PORTAL, PORTAL_COOKIE, PORTAL_SETTING, type PortalSettings } from '@/lib/portal'
import { waLink } from '@/lib/site'
import PortalLogin from './PortalLogin'
import Questions from './Questions'
import AppCard from './AppCard'
import './portal.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Tu portal de cliente', robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: '#0C2A43', viewportFit: 'cover' }

const day = (v: string | null | undefined) => {
  if (!v) return ''
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T12:00:00' : v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
}

const STAGE: Record<string, [string, string]> = {
  signed: ['Contrato firmado', 'info'],
  active: ['Cliente activo', 'ok'],
  completed: ['Programa completado', 'ok'],
}

const INVOICE: Record<string, [string, string]> = {
  paid: ['Pagada', 'ok'],
  sent: ['Pendiente', 'warn'],
  overdue: ['Vencida', 'bad'],
}

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)
const I = {
  steps: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  card: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
}

// /portal: the client's home once signed in, or the sign-in screen.
export default async function PortalPage() {
  const email = await readPortalSession((await cookies()).get(PORTAL_COOKIE)?.value)
  const db = email ? await serviceDb() : null
  const access = db && email ? await accessFor(db, email) : null
  if (!db || !access?.active) return <PortalLogin />
  const [data, settings] = await Promise.all([
    loadPortal(db, access),
    readSetting<PortalSettings>(PORTAL_SETTING, DEFAULT_PORTAL),
  ])
  return <Home data={data} settings={settings} />
}

function Home({ data, settings }: { data: PortalData; settings: PortalSettings }) {
  const { access, deal, contracts, invoices, onboarding, messages } = data
  const name = deal?.client_name || access.name || ''
  const first = name.trim().split(/\s+/)[0]
  const stage = STAGE[deal?.stage ?? ''] ?? ['Cliente', 'info']
  const signed = contracts.find(c => c.status === 'signed')
  const since = day(signed?.signed_at || deal?.close_date || access.created_at)
  const appUrl = access.app_url || settings.appUrl
  const obDone = onboarding?.status === 'completed'
  const toPay = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')

  return (
    <div className="pt pt-home">
      <header className="pt-bar">
        <div className="in">
          <Link className="brand" href="/portal"><img src="/icon.png" alt="" width={30} height={30} />JOSÉ UNSTOPPABLE</Link>
          <a className="out" href="/api/portal/logout">Salir</a>
        </div>
      </header>

      <section className="pt-hero">
        <div className="pt-wrap">
          <span className="pt-kicker"><i />{stage[0]}</span>
          <h1>{first ? <>Hola, <span>{first}</span></> : <>Tu <span>portal</span></>}</h1>
          <p>{settings.note || 'Todo tu programa en un sitio: tu plan en la app, tu contrato, tus facturas y línea directa con José.'}</p>
          <div className="pt-stats">
            <div className="pt-stat"><span>Programa</span><b>{deal?.service || 'Coaching 1:1'}</b></div>
            <div className="pt-stat"><span>Desde</span><b>{since || '—'}</b></div>
            <div className="pt-stat"><span>Onboarding</span><b>{onboarding ? (obDone ? 'Completado' : 'Pendiente') : '—'}</b></div>
          </div>
        </div>
      </section>

      <main className="pt-wrap pt-main">
        <AppCard settings={settings} appUrl={appUrl} ready={!!access.app_ready} />

        <div className="pt-box">
          <h2><span className="ic"><Icon d={I.steps} /></span>Tus siguientes pasos</h2>
          <p className="lead">Lo que toca ahora para arrancar con buen pie.</p>
          <div className="pt-steps">
            <div className={`pt-step${obDone ? ' done' : ''}`}>
              <span className="n">{obDone ? '✓' : '1'}</span>
              <div><b>Rellena tu onboarding</b>
                <span>{obDone ? 'Hecho. José ya tiene tus respuestas.' : onboarding ? <>5 minutos. <a href={`/bienvenida/${onboarding.token}`}>Abrir mi onboarding →</a></> : 'José te mandará el enlace en cuanto confirme tu pago.'}</span>
              </div>
            </div>
            <div className="pt-step">
              <span className="n">2</span>
              <div><b>{access.app_ready ? `Abre ${settings.appName}` : `Crea tu cuenta en ${settings.appName}`}</b><span>Ahí recibirás tu plan de entrenamiento y nutrición.</span></div>
            </div>
            <div className="pt-step">
              <span className="n">3</span>
              <div><b>Mándale a José 3 fotos por WhatsApp</b><span>Frontal, perfil y espalda, con buena luz. <a href={waLink('Hola José, te mando mis fotos de inicio')} target="_blank" rel="noopener">Abrir WhatsApp →</a></span></div>
            </div>
          </div>
        </div>

        <div className="pt-two">
          <div className="pt-box">
            <h2><span className="ic"><Icon d={I.doc} /></span>Tu contrato</h2>
            <p className="lead">Lo que acordasteis, firmado y siempre a mano.</p>
            {contracts.length ? (
              <ul className="pt-list">
                {contracts.map(c => (
                  <li key={c.id}>
                    <a className="pt-item" href={`/proposal/${c.token}`} target="_blank" rel="noopener">
                      <div className="t">
                        <b>{c.title || 'Contrato de coaching'}</b>
                        <span>{c.status === 'signed' ? `Firmado el ${day(c.signed_at)}` : 'Pendiente de tu firma'}{c.total ? ` · ${money(c.total, c.currency || 'EUR')}` : ''}</span>
                      </div>
                      <span className={`pt-pill ${c.status === 'signed' ? 'ok' : 'warn'}`}>{c.status === 'signed' ? 'Firmado' : 'Firmar'}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <div className="pt-empty">Tu contrato aparecerá aquí en cuanto José te lo envíe.</div>}
          </div>

          <div className="pt-box">
            <h2><span className="ic"><Icon d={I.card} /></span>Pagos</h2>
            <p className="lead">{toPay.length ? `Tienes ${toPay.length} ${toPay.length === 1 ? 'factura pendiente' : 'facturas pendientes'}.` : 'Tus facturas y recibos.'}</p>
            {invoices.length ? (
              <ul className="pt-list">
                {invoices.map(i => {
                  const s = INVOICE[i.status ?? ''] ?? ['Emitida', 'info']
                  return (
                    <li key={i.id}>
                      <a className="pt-item" href={`/invoice/${i.id}`} target="_blank" rel="noopener">
                        <div className="t"><b>Factura {i.number || ''}</b><span>{day(i.issue_date)}</span></div>
                        <span className="amt">{money(i.total, i.currency || 'EUR')}</span>
                        <span className={`pt-pill ${s[1]}`}>{s[0]}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : <div className="pt-empty">Aún no hay facturas.</div>}
          </div>
        </div>

        <div className="pt-box">
          <h2><span className="ic"><Icon d={I.chat} /></span>Pregúntale a José</h2>
          <p className="lead">Dudas sobre tu plan, tus comidas o tu horario. Te responde aquí y te avisa por email.</p>
          <Questions initial={messages} />
        </div>

        <div className="pt-box">
          <h2>¿Algo urgente?</h2>
          <p className="lead">Escríbele directamente.</p>
          <div className="pt-contact">
            <a className="pt-btn sky" href={waLink(`Hola José, soy ${name || 'un cliente'}`)} target="_blank" rel="noopener">WhatsApp</a>
            <a className="pt-btn ghost" href="mailto:hola@joseunstoppable.com">hola@joseunstoppable.com</a>
          </div>
        </div>

        <p className="pt-foot">Has entrado como {access.email} · © José Unstoppable Coaching</p>
      </main>
    </div>
  )
}
