import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { serviceDb } from '@/lib/os-supabase'
import { readSetting } from '@/lib/app-settings'
import { DEFAULT_WELCOME, WELCOME_SETTING, youtubeId, waLink, type WelcomeSettings } from '@/lib/onboarding'
import '../../onboarding/onboarding.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Bienvenido/a al programa', robots: { index: false, follow: false } }
export const viewport: Viewport = { themeColor: '#FFFFFF', viewportFit: 'cover' }

// The page a new client lands on from the welcome email: José's video, what
// happens next, and the button into their onboarding form.
export default async function WelcomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!/^[a-z0-9]{8,40}$/.test(token)) notFound()
  const db = await serviceDb()
  const { data } = db ? await db.from('onboardings').select('name, status').eq('token', token).maybeSingle() : { data: null }
  if (db && !data) notFound()
  const welcome = await readSetting<WelcomeSettings>(WELCOME_SETTING, DEFAULT_WELCOME)
  const video = youtubeId(welcome.videoUrl)
  const raw = (data?.name ?? '').trim().split(/\s+/)[0] ?? ''
  const first = raw ? raw[0].toUpperCase() + raw.slice(1) : ''
  const done = data?.status === 'completed'

  return (
    <div className="ob ob-welcome">
      <header className="bar">
        <div className="wrap">
          <span className="brand"><img src="/icon.png" alt="" width={30} height={30} style={{ borderRadius: 9 }} />JOSÉ UNSTOPPABLE</span>
          <a className="bar-link" href={waLink('Hola José, acabo de entrar al programa')} target="_blank" rel="noopener">¿Dudas? Escríbeme</a>
        </div>
      </header>
      <main>
        <div className="hero">
          <div className="wrap">
            <div>
              <span className="kicker">Bienvenido/a al programa</span>
              <h1>{first ? `${first}, ya` : 'Ya'} estás dentro.<br /><span>Empezamos.</span></h1>
              <p className="lead">{welcome.message || `Gracias por confiar en mí. A partir de hoy trabajamos juntos con un plan de entrenamiento y nutrición hecho para ti. ${video ? 'Mira este vídeo y rellena' : 'Rellena'} tu onboarding para que pueda preparar tu plan.`}</p>
              <div className="cta-row">
                <a className="btn btn-sky" href={`/onboarding/${token}`}>{done ? 'Ver mis respuestas' : 'Empezar mi onboarding →'}</a>
                <a className="btn btn-ghost" href={waLink('Hola José, acabo de entrar al programa')} target="_blank" rel="noopener">Escribir a José</a>
              </div>
              <div className="meta"><span><b>5 min</b> de formulario</span><span>Se guarda solo</span><span>Plan en <b>48–72 h</b></span></div>
            </div>
            {video ? (
              <div className="video">
                <iframe src={`https://www.youtube-nocookie.com/embed/${video}?rel=0`} title="Bienvenida de José" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
              </div>
            ) : (
              <div className="hero-img"><img src="/images/onboarding-jose.jpg" alt="José, tu coach" width={696} height={900} /></div>
            )}
          </div>
        </div>
        <section>
          <div className="wrap">
            <h2>Tus primeros pasos</h2>
            <ol className="welcome-steps">
              <li className={done ? 'done' : undefined}><div className="num">{done ? '✓' : '01'}</div><div><b>Rellena tu onboarding</b><span>{done ? 'Hecho. Ya tengo tus respuestas.' : '5 minutos: tus datos, objetivo, salud y rutina. Se guarda mientras escribes.'}</span></div></li>
              <li><div className="num">02</div><div><b>Mándame 3 fotos por WhatsApp</b><span>Frontal, perfil y espalda, con buena luz.</span></div></li>
              <li><div className="num">03</div><div><b>Llamada de bienvenida</b><span>Te escribo para agendarla y fijamos tu objetivo a 30 días.</span></div></li>
              <li><div className="num">04</div><div><b>Tu plan en 48–72 h</b><span>Entrenamiento y nutrición a tu medida, dentro de Harbiz.</span></div></li>
            </ol>
          </div>
        </section>
      </main>
      <footer>© José Unstoppable Coaching</footer>
    </div>
  )
}
