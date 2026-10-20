'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { list, missingIn, parqYes, sectionDone, str, waLink, EMAIL_RE, PARQ, SECTIONS, type Answers } from '@/lib/onboarding'
import './onboarding.css'

const DRAFT_KEY = 'ju-onboarding-v1'
// José's Harbiz invite link. Empty: José sends each client their own invitation.
const HARBIZ_JOIN_URL = ''
const STEPS = ['Formulario inicial', 'Llamada de bienvenida', 'Tu plan a medida', 'Primeros 7 días', 'Seguimiento continuo']

const Tick = () => (
  <span className="tick">
    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
)

type Saved = 'idle' | 'saving' | 'saved' | 'failed'

// The client onboarding: hero, the 5-step process, the 7-section form and
// what comes next. With a token (a link José activated from the dashboard)
// the answers are saved to his dashboard and the client portal opens.
export default function OnboardingPage({ token, presetName = '' }: { token?: string; presetName?: string }) {
  const [a, setA] = useState<Answers>({})
  const [name, setName] = useState(presetName)
  const [bad, setBad] = useState<Set<string>>(new Set())
  const [showErr, setShowErr] = useState(false)
  const [done, setDone] = useState(false)
  // Where their client portal opens once the onboarding is sent.
  const [portal, setPortal] = useState('')
  const [saved, setSaved] = useState<Saved>('idle')
  const [linkGone, setLinkGone] = useState(false)
  const hp = useRef('')
  const startedAt = useRef(0)
  const formRef = useRef<HTMLElement>(null)
  const draftKey = token ? `${DRAFT_KEY}:${token}` : DRAFT_KEY
  // The row these answers save to: the link's token, or one created as soon as
  // a visitor of the generic link has typed their name and email.
  const [liveToken, setLiveToken] = useState(token ?? '')
  const lastSaved = useRef('')

  // Draft from this device first, then what the dashboard already has.
  useEffect(() => {
    startedAt.current = Date.now()
    let draft: Answers | null = null
    try { draft = JSON.parse(localStorage.getItem(draftKey) || 'null') } catch { /* private mode */ }
    if (draft) setA(draft)
    else if (presetName) setA({ nombre: presetName })
    if (!token) {
      try { const t = localStorage.getItem(`${DRAFT_KEY}:token`); if (t) setLiveToken(t) } catch { /* private mode */ }
      return
    }
    fetch(`/api/onboarding?token=${encodeURIComponent(token)}`)
      .then(r => r.json().then(d => ({ status: r.status, d })))
      .then(({ status, d }) => {
        if (status === 404) { setLinkGone(true); return }
        if (!d.ok) return
        if (d.name) setName(d.name)
        const known: Answers = { ...(d.name ? { nombre: d.name } : {}), ...(d.email ? { email: d.email } : {}), ...(d.phone ? { whatsapp: d.phone } : {}) }
        if (!draft) setA({ ...known, ...(d.answers ?? {}) })
        else setA(prev => ({ ...known, ...prev }))
      })
      .catch(() => {})
  }, [token, presetName, draftKey])

  const set = (k: string, v: string | string[]) => {
    setA(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'salud' && typeof v === 'string' && v.trim()) delete next.salud_ok
      if (k === 'salud_ok' && v.length) next.salud = ''
      try { localStorage.setItem(draftKey, JSON.stringify(next)) } catch { /* private mode */ }
      return next
    })
    setBad(prev => {
      if (!prev.size) return prev
      const n = new Set(prev)
      n.delete(k)
      if (k === 'objetivo') n.delete('objetivo_detalle')
      if (k === 'salud_ok') n.delete('salud')
      return n
    })
  }
  const toggle = (k: string, v: string) => {
    const cur = list(a, k)
    set(k, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])
  }

  // Save as they go, so José keeps what they typed even if they never finish.
  useEffect(() => {
    if (done || linkGone) return
    const canStart = !liveToken && str(a, 'nombre') && EMAIL_RE.test(str(a, 'email'))
    if (!liveToken && !canStart) return
    const body = JSON.stringify(a)
    if (body === lastSaved.current) return
    const t = setTimeout(() => {
      lastSaved.current = body
      fetch('/api/onboarding', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: liveToken || undefined, answers: a, partial: true, hp: hp.current }),
      }).then(r => r.json()).then(d => {
        if (d?.ok && d.token && !liveToken) {
          setLiveToken(d.token)
          try { localStorage.setItem(`${DRAFT_KEY}:token`, d.token) } catch { /* private mode */ }
        }
      }).catch(() => { lastSaved.current = '' })
    }, 1500)
    return () => clearTimeout(t)
  }, [a, liveToken, done, linkGone])

  const doneCount = SECTIONS.filter((_, i) => sectionDone(a, i + 1)).length
  const firstName = (name || '').trim().split(/\s+/)[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const missing = SECTIONS.flatMap((_, i) => missingIn(a, i + 1))
    if (missing.length) {
      setBad(new Set(missing))
      setShowErr(true)
      const el = document.querySelector<HTMLElement>(`.ob [name="${missing[0]}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { try { el.focus({ preventScroll: true }) } catch { /* old browsers */ } }, 400)
      }
      return
    }
    setShowErr(false)
    setSaved('saving')
    // Only a confirmed save counts as sent: on failure the form stays, answers intact.
    try {
      const r = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: linkGone ? undefined : liveToken || undefined, answers: a, hp: hp.current, elapsedMs: Date.now() - startedAt.current }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.ok) { setSaved('failed'); return }
      if (typeof d.portal === 'string') setPortal(d.portal)
      setSaved('saved')
      setDone(true)
      formRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch {
      setSaved('failed')
    }
  }

  const cls = (k: string) => (bad.has(k) ? 'invalid' : undefined)
  // What the field shows: the raw text, never trimmed, or a typed space vanishes
  // on the next render and the space bar seems dead.
  const raw = (k: string) => {
    const v = a[k]
    return Array.isArray(v) ? v.join(', ') : v ?? ''
  }
  const input = (k: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input name={k} className={cls(k)} value={raw(k)} onChange={e => set(k, e.target.value)} {...props} />
  )
  const unit = (k: string, u: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="unit">{input(k, { type: 'number', inputMode: 'decimal', step: '0.1', placeholder: '0', ...props })}<span>{u}</span></div>
  )
  const area = (k: string, placeholder: string) => (
    <textarea name={k} className={cls(k)} value={raw(k)} onChange={e => set(k, e.target.value)} placeholder={placeholder} />
  )
  const select = (k: string, first: string, opts: string[]) => (
    <select name={k} className={cls(k)} value={raw(k)} onChange={e => set(k, e.target.value)}>
      <option value="">{first}</option>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  )
  const chip = (k: string, v: string, type: 'checkbox' | 'radio' = 'checkbox') => (
    <label className="chip" key={v}>
      <input type={type} name={k} value={v} checked={list(a, k).includes(v)}
        onChange={() => (type === 'radio' ? set(k, v) : toggle(k, v))} />
      <span className={cls(k)}>{v}</span>
    </label>
  )
  const section = (n: number, title: string, hint: ReactNode, body: ReactNode) => (
    <fieldset className={sectionDone(a, n) ? 'done' : undefined}>
      <legend><Tick />{title}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="fields">{body}</div>
    </fieldset>
  )

  const waDirect = waLink('Hola José, tengo una duda sobre mi onboarding')

  return (
    <div className="ob">
      <header className="bar">
        <div className="wrap">
          <a className="brand" href="#top"><img src="/icon.png" alt="" width={30} height={30} style={{ borderRadius: 9 }} />JOSÉ UNSTOPPABLE</a>
          <div className="prog" aria-live="polite">
            <span>{doneCount}/{SECTIONS.length}</span>
            <div className="prog-track"><div className="prog-fill" style={{ width: `${(doneCount / SECTIONS.length) * 100}%` }} /></div>
          </div>
        </div>
      </header>

      <main id="top">
        <div className="hero">
          <div className="wrap">
            <div>
              <span className="kicker">Tu onboarding</span>
              <h1>Bienvenido/a{firstName ? `, ${firstName}` : ''}.<br /><span>Empezamos.</span></h1>
              <p className="lead">Enhorabuena por dar el paso. A partir de ahora vamos a trabajar juntos para que dejes de apartarte en las fotos y recuperes el control de tu cuerpo, con un plan hecho a tu medida, no una plantilla genérica.</p>
              <p className="lead">Aquí tienes tu hoja de ruta: qué vas a hacer, en qué orden y qué vas a recibir de mí en cada paso. Sin sorpresas, sin líos: solo sigue el proceso.</p>
              <a className="btn btn-sky" href="#form" onClick={e => { e.preventDefault(); formRef.current?.scrollIntoView({ behavior: 'smooth' }) }}>Rellenar mi formulario →</a>
              <div className="meta"><span><b>5 min</b> de formulario</span><span>Plan listo en <b>48–72 h</b></span></div>
            </div>
            <div className="hero-img"><img src="/images/onboarding-jose.jpg" alt="José, tu coach" width={696} height={900} fetchPriority="high" /></div>
          </div>
        </div>

        <section>
          <div className="wrap">
            <h2>El proceso en 5 pasos</h2>
            <p className="sub">Ahora mismo estás en el primero. El resto lo hacemos juntos.</p>
            <ol className="overview">
              {STEPS.map((s, i) => <li key={s} className={i === 0 ? 'now' : undefined}>{s}</li>)}
            </ol>
          </div>
        </section>

        <section id="form" ref={formRef} style={{ paddingTop: 8 }}>
          <div className="wrap">
            <div className="formcard">
              <div className="formhead">
                <div className="num">01</div>
                <div><h2>Cuéntame tu caso</h2><p>Cuanto más completo, más preciso será tu plan.</p></div>
              </div>

              {!done ? (
                <form noValidate onSubmit={submit}>
                  <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" onChange={e => { hp.current = e.target.value }} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />

                  {section(1, 'Tus datos', 'Con tu nombre y email ya se guarda todo lo que escribas, aunque lo termines luego.', (
                    <>
                      <div className="row2">
                        <label className="f">Nombre y apellidos{input('nombre', { type: 'text', autoComplete: 'name', placeholder: 'Tu nombre' })}</label>
                        <label className="f">Email{input('email', { type: 'email', autoComplete: 'email', inputMode: 'email', placeholder: 'tu@email.com' })}</label>
                      </div>
                      <div className="chips" style={{ marginTop: 0 }}>{chip('sexo', 'Mujer', 'radio')}{chip('sexo', 'Hombre', 'radio')}</div>
                      <div className="row3">
                        <label className="f">Edad{input('edad', { type: 'number', inputMode: 'numeric', min: 14, max: 99, placeholder: '34' })}</label>
                        <label className="f">Peso{unit('peso', 'kg')}</label>
                        <label className="f">Altura{unit('altura', 'cm', { inputMode: 'numeric', step: '1' })}</label>
                      </div>
                      <details className="more">
                        <summary>Añadir perímetros (opcional)</summary>
                        <div className="row3" style={{ marginTop: 10 }}>
                          <label className="f">Cintura{unit('cintura', 'cm')}</label>
                          <label className="f">Cadera{unit('cadera', 'cm')}</label>
                          <label className="f">Pecho{unit('pecho', 'cm')}</label>
                          <label className="f">Brazo{unit('brazo', 'cm')}</label>
                          <label className="f">Pierna{unit('pierna', 'cm')}</label>
                        </div>
                      </details>
                    </>
                  ))}

                  {section(2, 'Tu objetivo', 'Marca lo que aplique y en qué plazo.', (
                    <>
                      <div className="chips">
                        {['Perder grasa', 'Ganar músculo', 'Recomposición', 'Más energía', 'Ganar confianza', 'Salud y hábitos', 'Verme bien en fotos'].map(v => chip('objetivo', v))}
                      </div>
                      <label className="f">Plazo{select('plazo', 'Elige un plazo', ['1 mes', '3 meses', '6 meses', '1 año o más'])}</label>
                      <label className="f">En tus palabras <small>(opcional)</small>{area('objetivo_detalle', 'Ej. Bajar 8 kg y quitarme la barriga antes del verano')}</label>
                    </>
                  ))}

                  {section(3, 'Salud', 'Las mismas preguntas que hace cualquier entrenador antes de empezar. Contesta Sí o No.', (
                    <>
                      <div className="parq">
                        {PARQ.map(p => (
                          <div className="parq-q" key={p.k}>
                            <span>{p.q}</span>
                            <div className="chips">{chip(p.k, 'Sí', 'radio')}{chip(p.k, 'No', 'radio')}</div>
                          </div>
                        ))}
                      </div>
                      {parqYes(a).length > 0 ? (
                        <label className="f">Cuéntame qué te pasa y qué te ha dicho el médico{area('salud', 'Ej. Tomo enalapril para la tensión desde 2022, el médico me deja entrenar…')}</label>
                      ) : (
                        <label className="f">Lesiones, molestias o medicación <small>(opcional)</small>{area('salud', 'Ej. Me molesta la rodilla derecha al correr…')}</label>
                      )}
                    </>
                  ))}

                  {section(4, 'Rutina y alimentación', 'Para que el plan encaje en tu vida, no al revés.', (
                    <>
                      <div className="row2">
                        <label className="f">Días que puedes entrenar{select('dias', 'Elige', ['2 días', '3 días', '4 días', '5 días o más'])}</label>
                        <label className="f">Dónde entrenas{select('lugar', 'Elige', ['Gimnasio', 'Casa', 'Casa y gimnasio', 'Aún no lo sé'])}</label>
                      </div>
                      <div className="row2">
                        <label className="f">Comidas al día <small>(opcional)</small>{select('comidas', 'Elige', ['2', '3', '4', '5 o más', 'Muy irregular'])}</label>
                        <label className="f">Horas de sueño <small>(opcional)</small>{select('sueno', 'Elige', ['Menos de 6 h', '6–7 h', '7–8 h', 'Más de 8 h'])}</label>
                      </div>
                      <label className="f">Alergias o comida que no tomas <small>(opcional)</small>{area('no_gusta', 'Ej. lactosa, pescado…')}</label>
                      <details className="more">
                        <summary>Más detalles (opcional)</summary>
                        <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
                          <label className="f">Horario de trabajo{input('trabajo', { type: 'text', placeholder: 'Ej. L–V de 9 a 18, teletrabajo' })}</label>
                          <label className="f">Comida que te encanta{area('gusta', 'Ej. arroz, pollo, huevos, fruta…')}</label>
                        </div>
                      </details>
                    </>
                  ))}

                  {section(5, 'Compromiso', null, (
                    <>
                      <div>
                        <span className="f" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Del 1 al 10, ¿cuánto compromiso tienes ahora mismo?</span>
                        <div className="scale">{Array.from({ length: 10 }, (_, i) => chip('compromiso', String(i + 1), 'radio'))}</div>
                        <div className="scale-l"><span>Poco</span><span>A tope</span></div>
                      </div>
                      <label className="f">Una frase: ¿por qué ahora?{area('porque', 'Ej. Me vi en las fotos de la boda y dije basta.')}</label>
                    </>
                  ))}

                  <div className="photonote">
                    <div className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C2A43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg></div>
                    <div><b>Fotos de inicio:</b> cuando tengas tu acceso a Harbiz, sube ahí 3 fotos: <b>frontal, perfil y espalda</b>, con buena luz y ropa ajustada.</div>
                  </div>

                  <div className="submit">
                    <div className={`err${showErr ? ' show' : ''}`}>Te falta algún dato. Te lo he marcado en rojo.</div>
                    <div className={`err${saved === 'failed' ? ' show' : ''}`}>No se ha podido enviar. Tus respuestas siguen aquí: vuelve a pulsar el botón.</div>
                    <button type="submit" className="btn btn-sky" disabled={saved === 'saving'}>
                      {saved === 'saving' ? 'Enviando…' : 'Enviar mis respuestas'}
                    </button>
                    <p>Tus respuestas se guardan en este móvil mientras rellenas, por si cierras la página.</p>
                  </div>
                </form>
              ) : (
                <div className="thanks show">
                  <div className="big"><svg width="30" height="30" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <h3>¡Paso 1 completado!</h3>
                  <p>Tus respuestas ya le han llegado a José. Estos son tus siguientes pasos:</p>
                  <ul className="checklist">
                    <li><em>1</em>{portal ? 'Entra en tu portal de cliente: ahí tienes tus facturas, tu contrato y un sitio para escribirme' : 'Te llega un email para entrar en tu portal de cliente'}</li>
                    <li><em>2</em>{HARBIZ_JOIN_URL ? <>Crea tu perfil en <a href={HARBIZ_JOIN_URL} target="_blank" rel="noopener">Harbiz</a>, la app de tu seguimiento diario</> : 'Te mando tu invitación a Harbiz, la app de tu seguimiento diario, para que crees tu perfil'}</li>
                    <li><em>3</em>Sube en Harbiz tus 3 fotos de inicio: frontal, perfil y espalda</li>
                    <li><em>4</em>Te escribo para agendar la llamada de bienvenida</li>
                  </ul>
                  <div className="btns">
                    {portal && <a className="btn btn-sky" href={portal}>Entrar a mi portal de cliente →</a>}
                    {HARBIZ_JOIN_URL && <a className={`btn ${portal ? 'btn-ghost' : 'btn-sky'}`} href={HARBIZ_JOIN_URL} target="_blank" rel="noopener">Crear mi perfil en Harbiz</a>}
                    <button type="button" className="btn btn-ghost" onClick={() => { setDone(false); setSaved('idle') }}>Editar respuestas</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <h2>Lo que viene después</h2>
            <p className="sub">Así es cómo seguimos una vez reciba tu formulario.</p>

            <div className="step">
              <div className="num">02</div>
              <div>
                <h3>Llamada / vídeo de bienvenida</h3>
                <p>Una vez recibido tu formulario, nos ponemos cara a cara (o pantalla a pantalla):</p>
                <ul>
                  <li>Repasamos juntos tus respuestas y resolvemos cualquier duda.</li>
                  <li>Fijamos tu <b>primer objetivo a 30 días</b>, concreto y medible.</li>
                  <li>Te explico cómo vamos a trabajar y cómo usar <b>Harbiz</b> para tu seguimiento diario.</li>
                </ul>
                <div className="box">Es tu oportunidad de preguntarme lo que necesites antes de arrancar. Ven con todas tus dudas.</div>
              </div>
            </div>

            <div className="step">
              <div className="num">03</div>
              <div>
                <h3>Tu plan a medida</h3>
                <p>En un plazo máximo de <b>48–72 h</b> tras la llamada recibirás, dentro de Harbiz:</p>
                <ul>
                  <li>Tu <b>plan de entrenamiento</b> personalizado, adaptado a tu nivel y a tu disponibilidad.</li>
                  <li>Tu <b>plan de nutrición</b> personalizado, con opciones reales para tu día a día.</li>
                  <li>Un documento con las “reglas del juego”: cómo y cuándo reportar tu progreso.</li>
                </ul>
                <div className="box">
                  <strong>Reglas del juego</strong>
                  Reporta tus entrenos y comidas en Harbiz cada día · Escríbeme cuando lo necesites: te respondo en menos de 24 h en días laborables · Revisamos tu progreso (fotos, medidas, peso) cada semana · Si un día no puedes entrenar o comer como toca, avísame: <b>ajustamos, no abandonamos.</b>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="num">04</div>
              <div>
                <h3>Tus primeros 7 días</h3>
                <div className="days">
                  <div className="day"><b>Día 1</b><span>Revisa tu plan completo y prepara tu semana (compra, horarios de entreno).</span></div>
                  <div className="day"><b>Día 1–2</b><span>Primer entrenamiento siguiendo el plan.</span></div>
                  <div className="day"><b>Día 3–4</b><span>Primer check-in conmigo: ¿cómo va todo?</span></div>
                  <div className="day"><b>Día 7</b><span>Primera revisión semanal: fotos, medidas, sensaciones.</span></div>
                </div>
              </div>
            </div>

            <div className="step">
              <div className="num">05</div>
              <div>
                <h3>Seguimiento continuo</h3>
                <p>A partir de aquí entramos en ritmo de crucero: seguimiento semanal, ajustes de plan cuando tu cuerpo lo pida, y yo pendiente de que no tires la toalla en el peor momento. Este es solo el principio.</p>
              </div>
            </div>

            <div className="close">
              <img src="/images/onboarding-close.jpg" alt="" loading="lazy" />
              <div>
                <small>YA ESTÁ TODO LISTO</small>
                <h2>Vamos a por ello.</h2>
                <p>Cualquier duda, escríbeme. Estoy aquí para acompañarte en cada paso.</p>
                <a className="btn btn-sky" href={waDirect} target="_blank" rel="noopener">Escribir a José</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>© José Unstoppable Coaching</footer>
    </div>
  )
}
