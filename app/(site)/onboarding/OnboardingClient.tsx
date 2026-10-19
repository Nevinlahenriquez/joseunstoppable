'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { jakarta } from '../font'
import heroImg from './hero.jpg'
import closeImg from './close.jpg'

const PHONE = '34649764886'
const KEY = 'ju-onboarding-v1'

// Every free-text / number / select field of the form, in document order.
const TEXT_NAMES = [
  'nombre', 'edad', 'peso', 'altura', 'cintura', 'cadera', 'pecho', 'brazo', 'pierna',
  'plazo', 'objetivo_detalle', 'salud', 'trabajo', 'comidas', 'sueno', 'dias', 'lugar',
  'gusta', 'no_gusta', 'cambiar', 'porque',
] as const
type TextName = (typeof TEXT_NAMES)[number]
type FieldName = TextName | 'objetivo' | 'salud_ok' | 'compromiso'

type Values = Record<TextName, string>
interface FormState {
  vals: Values
  objetivo: string[]
  saludOk: boolean
  compromiso: string
}

const OBJETIVOS = [
  'Perder grasa', 'Ganar músculo', 'Recomposición', 'Más energía', 'Salud y hábitos', 'Verme bien en fotos',
]
const SCALE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

// Required fields per fieldset (data-sec 1..7), in document order.
const REQUIRED: Record<number, FieldName[]> = {
  1: ['nombre', 'edad'],
  2: ['peso', 'altura'],
  3: ['plazo'],
  4: [],
  5: ['trabajo', 'comidas', 'sueno', 'dias', 'lugar'],
  6: ['gusta'],
  7: ['compromiso', 'cambiar', 'porque'],
}
const SECS = [1, 2, 3, 4, 5, 6, 7]

const emptyVals = (): Values =>
  TEXT_NAMES.reduce((acc, n) => { acc[n] = ''; return acc }, {} as Values)

const EMPTY: FormState = { vals: emptyVals(), objetivo: [], saludOk: false, compromiso: '' }

function wa(text: string) {
  return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text)
}
const WA_DIRECT = wa('Hola José, tengo una duda sobre mi onboarding')

function filled(s: FormState, name: FieldName): boolean {
  if (name === 'objetivo') return s.objetivo.length > 0
  if (name === 'salud_ok') return s.saludOk
  if (name === 'compromiso') return s.compromiso !== ''
  return s.vals[name].trim() !== ''
}

function secOk(s: FormState, sec: number): boolean {
  for (const n of REQUIRED[sec]) if (!filled(s, n)) return false
  if (sec === 3 && !s.objetivo.length && !s.vals.objetivo_detalle.trim()) return false
  if (sec === 4 && !s.saludOk && !s.vals.salud.trim()) return false
  return true
}

// Draft autosave (per-device convenience only). Same shape as the original:
// text fields by name, checkbox / radio groups as arrays of checked values.
function save(s: FormState) {
  try {
    const d: Record<string, string | string[]> = { ...s.vals }
    if (s.objetivo.length) d.objetivo = OBJETIVOS.filter(o => s.objetivo.includes(o))
    if (s.saludOk) d.salud_ok = ['1']
    if (s.compromiso) d.compromiso = [s.compromiso]
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {}
}

function load(preName: string): FormState {
  const s: FormState = { ...EMPTY, vals: { ...emptyVals(), nombre: preName } }
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null') as Record<string, unknown> | null
    if (!d) return s
    const arr = (k: string): string[] => (Array.isArray(d[k]) ? (d[k] as unknown[]).map(String) : [])
    for (const n of TEXT_NAMES) {
      if (!(n in d)) continue
      if (n === 'nombre' && preName && !d.nombre) continue
      s.vals[n] = typeof d[n] === 'string' ? (d[n] as string) : String(d[n] ?? '')
    }
    if ('objetivo' in d) s.objetivo = OBJETIVOS.filter(o => arr('objetivo').includes(o))
    if ('salud_ok' in d) s.saludOk = arr('salud_ok').includes('1')
    if ('compromiso' in d) {
      const picked = SCALE.filter(x => arr('compromiso').includes(x))
      s.compromiso = picked[picked.length - 1] || ''
    }
  } catch {}
  return s
}

function buildMessage(s: FormState): string {
  const v = (n: TextName) => s.vals[n].trim()
  const cm = (n: TextName, label: string) => (v(n) ? label + ' ' + v(n) + ' cm' : null)
  const meds = [cm('cintura', 'Cintura'), cm('cadera', 'Cadera'), cm('pecho', 'Pecho'), cm('brazo', 'Brazo'), cm('pierna', 'Pierna')]
    .filter(Boolean)
  const obj = OBJETIVOS.filter(o => s.objetivo.includes(o))
  const L: string[] = []
  L.push('*ONBOARDING · JOSÉ UNSTOPPABLE*')
  L.push('')
  L.push('*Nombre:* ' + v('nombre') + ' (' + v('edad') + ' años)')
  L.push('')
  L.push('*📏 Medidas*')
  L.push('Peso ' + v('peso') + ' kg · Altura ' + v('altura') + ' cm')
  L.push(meds.length ? meds.join(' · ') : 'Perímetros: te los mando luego')
  L.push('')
  L.push('*🎯 Objetivos*')
  if (obj.length) L.push(obj.join(', '))
  L.push('Plazo: ' + v('plazo'))
  if (v('objetivo_detalle')) L.push(v('objetivo_detalle'))
  L.push('')
  L.push('*🩺 Salud*')
  L.push(s.saludOk ? 'Nada que destacar' : v('salud'))
  L.push('')
  L.push('*🕒 Rutina*')
  L.push('Trabajo: ' + v('trabajo'))
  L.push('Comidas/día: ' + v('comidas') + ' · Sueño: ' + v('sueno'))
  L.push('Puede entrenar: ' + v('dias') + ' · Dónde: ' + v('lugar'))
  L.push('')
  L.push('*🍽️ Alimentación*')
  L.push('Le gusta: ' + v('gusta'))
  if (v('no_gusta')) L.push('No le gusta / no puede: ' + v('no_gusta'))
  L.push('')
  L.push('*🔥 Compromiso:* ' + (s.compromiso || '-') + '/10')
  L.push('Dispuesto/a a cambiar: ' + v('cambiar'))
  L.push('')
  L.push('*¿Por qué ahora?*')
  L.push('“' + v('porque') + '”')
  L.push('')
  L.push('📸 Ahora te mando mis 3 fotos de inicio (frontal, perfil y espalda).')
  return L.join('\n')
}

function Tick() {
  return (
    <span className="tick">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Section({ sec, done, title, hint, children }: {
  sec: number; done: boolean; title: string; hint?: ReactNode; children: ReactNode
}) {
  return (
    <fieldset data-sec={sec} className={done ? 'done' : undefined}>
      <legend><Tick />{title}</legend>
      {hint ? <p className="hint">{hint}</p> : null}
      <div className="fields">{children}</div>
    </fieldset>
  )
}

export default function OnboardingClient() {
  const [s, setS] = useState<FormState>(EMPTY)
  const [preName, setPreName] = useState('')
  const [invalid, setInvalid] = useState<Set<FieldName>>(() => new Set())
  const [showErr, setShowErr] = useState(false)
  const [sent, setSent] = useState(false)
  const [waAgain, setWaAgain] = useState('#')
  const formRef = useRef<HTMLFormElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // Personalised greeting from the link (?nombre=Ana), then the saved draft.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const pre = (params.get('nombre') || params.get('n') || '').trim().slice(0, 60)
    const loaded = load(pre)
    /* eslint-disable react-hooks/set-state-in-effect -- reads the URL and localStorage, browser only */
    setPreName(pre)
    setS(loaded)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const commit = (next: FormState, name: FieldName) => {
    setInvalid(prev => {
      const out = new Set(prev)
      out.delete(name)
      if (name === 'objetivo') out.delete('objetivo_detalle')
      if (name === 'salud_ok') out.delete('salud')
      return out
    })
    setS(next)
    save(next)
  }

  const onText = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const name = e.target.name as TextName
    const value = e.target.value
    const next: FormState = { ...s, vals: { ...s.vals, [name]: value } }
    if (name === 'salud' && value.trim()) next.saludOk = false
    commit(next, name)
  }
  const onObjetivo = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    const objetivo = checked ? [...s.objetivo, value] : s.objetivo.filter(o => o !== value)
    commit({ ...s, objetivo }, 'objetivo')
  }
  const onSaludOk = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    const next: FormState = { ...s, saludOk: checked }
    if (checked) next.vals = { ...s.vals, salud: '' }
    commit(next, 'salud_ok')
  }
  const onCompromiso = (e: ChangeEvent<HTMLInputElement>) => {
    commit({ ...s, compromiso: e.target.value }, 'compromiso')
  }

  const doneCount = SECS.filter(sec => secOk(s, sec)).length
  const inv = (n: FieldName) => (invalid.has(n) ? 'invalid' : undefined)
  const heroName = preName ? ', ' + preName.split(/\s+/)[0] : ''

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const bad = new Set<FieldName>()
    let firstBad: HTMLElement | null = null
    const fieldsets = Array.from(form.querySelectorAll('fieldset'))
    for (const [i, sec] of SECS.entries()) {
      for (const n of REQUIRED[sec]) {
        if (!filled(s, n)) {
          bad.add(n)
          firstBad = firstBad || form.querySelector<HTMLElement>(`[name="${n}"]`)
        }
      }
      if (!secOk(s, sec) && !firstBad) firstBad = fieldsets[i]?.querySelector<HTMLElement>('textarea, input') ?? null
    }
    if (!s.objetivo.length && !s.vals.objetivo_detalle.trim()) bad.add('objetivo_detalle')
    if (!s.saludOk && !s.vals.salud.trim()) bad.add('salud')
    setInvalid(bad)
    if (firstBad || SECS.some(sec => !secOk(s, sec))) {
      setShowErr(true)
      const target: HTMLElement | null = firstBad || form.querySelector<HTMLElement>('.invalid')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { try { target.focus({ preventScroll: true }) } catch {} }, 400)
      }
      return
    }
    setShowErr(false)
    const url = wa(buildMessage(s))
    setWaAgain(url)
    setSent(true)
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' })
    try { if (!window.open(url, '_blank')) location.href = url } catch { location.href = url }
  }

  const unitField = (name: TextName, label: string, unit: string, mode: 'decimal' | 'numeric', required = false, step?: string) => (
    <label className="f">
      {label}
      <div className="unit">
        <input
          type="number" name={name} inputMode={mode} step={step} required={required} placeholder="0"
          className={inv(name)} value={s.vals[name]} onChange={onText}
        />
        <span>{unit}</span>
      </div>
    </label>
  )

  return (
    <div className={`pg-onboarding ${jakarta.variable}`}>
      <header className="bar">
        <div className="wrap">
          <a className="brand" href="#top"><i>J</i>JOSÉ UNSTOPPABLE</a>
          <div className="prog" aria-live="polite">
            <span>{doneCount}/{SECS.length}</span>
            <div className="prog-track"><div className="prog-fill" style={{ width: (doneCount / SECS.length * 100) + '%' }} /></div>
          </div>
        </div>
      </header>

      <main id="top">
        <div className="hero">
          <div className="wrap">
            <div>
              <span className="kicker">Tu onboarding</span>
              <h1>Bienvenido/a<span>{heroName}</span>.<br /><span>Empezamos.</span></h1>
              <p className="lead">Enhorabuena por dar el paso. A partir de ahora vamos a trabajar juntos para que dejes de apartarte en las fotos y recuperes el control de tu cuerpo, con un plan hecho a tu medida, no una plantilla genérica.</p>
              <p className="lead">Aquí tienes tu hoja de ruta: qué vas a hacer, en qué orden y qué vas a recibir de mí en cada paso. Sin sorpresas, sin líos: solo sigue el proceso.</p>
              <a className="btn btn-sky" href="#form">Rellenar mi formulario →</a>
              <div className="meta"><span><b>10–15 min</b> de formulario</span><span>Plan listo en <b>48–72 h</b></span></div>
            </div>
            <div className="hero-img">
              <Image src={heroImg} alt="José, tu coach" priority sizes="(max-width: 720px) 100vw, 280px" />
            </div>
          </div>
        </div>

        <section>
          <div className="wrap">
            <h2>El proceso en 5 pasos</h2>
            <p className="sub">Ahora mismo estás en el primero. El resto lo hacemos juntos.</p>
            <ol className="overview">
              <li className="now">Formulario inicial</li>
              <li>Llamada de bienvenida</li>
              <li>Tu plan a medida</li>
              <li>Primeros 7 días</li>
              <li>Seguimiento continuo</li>
            </ol>
          </div>
        </section>

        <section id="form" ref={sectionRef} style={{ paddingTop: 8 }}>
          <div className="wrap">
            <div className="formcard">
              <div className="formhead">
                <div className="num">01</div>
                <div><h2>Cuéntame tu caso</h2><p>Cuanto más completo, más preciso será tu plan.</p></div>
              </div>

              <form ref={formRef} noValidate onSubmit={onSubmit} style={sent ? { display: 'none' } : undefined}>
                <Section sec={1} done={secOk(s, 1)} title="Tus datos">
                  <div className="row2">
                    <label className="f">Nombre y apellidos<input type="text" name="nombre" autoComplete="name" required placeholder="Tu nombre" className={inv('nombre')} value={s.vals.nombre} onChange={onText} /></label>
                    <label className="f">Edad<input type="number" name="edad" inputMode="numeric" min={14} max={99} required placeholder="Ej. 34" className={inv('edad')} value={s.vals.edad} onChange={onText} /></label>
                  </div>
                </Section>

                <Section sec={2} done={secOk(s, 2)} title="Medidas corporales" hint="Con una cinta métrica, por la mañana y en ayunas. Si no tienes cinta ahora, pon peso y altura y el resto me lo mandas luego.">
                  <div className="row2">
                    {unitField('peso', 'Peso', 'kg', 'decimal', true, '0.1')}
                    {unitField('altura', 'Altura', 'cm', 'numeric', true)}
                  </div>
                  <div className="row3">
                    {unitField('cintura', 'Cintura', 'cm', 'decimal', false, '0.1')}
                    {unitField('cadera', 'Cadera', 'cm', 'decimal', false, '0.1')}
                    {unitField('pecho', 'Pecho', 'cm', 'decimal', false, '0.1')}
                    {unitField('brazo', 'Brazo', 'cm', 'decimal', false, '0.1')}
                    {unitField('pierna', 'Pierna', 'cm', 'decimal', false, '0.1')}
                  </div>
                </Section>

                <Section sec={3} done={secOk(s, 3)} title="Objetivos y expectativas" hint="¿Qué quieres conseguir y en qué plazo? Marca lo que aplique.">
                  <div className="chips" data-group="objetivo">
                    {OBJETIVOS.map(o => (
                      <label className="chip" key={o}>
                        <input type="checkbox" name="objetivo" value={o} checked={s.objetivo.includes(o)} onChange={onObjetivo} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                  <label className="f">Plazo
                    <select name="plazo" required className={inv('plazo')} value={s.vals.plazo} onChange={onText}>
                      <option value="">Elige un plazo</option>
                      <option>1 mes</option><option>3 meses</option><option>6 meses</option><option>1 año o más</option>
                    </select>
                  </label>
                  <label className="f">Cuéntamelo con tus palabras<textarea name="objetivo_detalle" placeholder="Ej. Bajar 8 kg y quitarme la barriga antes del verano" className={inv('objetivo_detalle')} value={s.vals.objetivo_detalle} onChange={onText} /></label>
                </Section>

                <Section sec={4} done={secOk(s, 4)} title="Historial de salud" hint="Lesiones, patologías o medicación. Si no hay nada, pulsa “Nada que destacar”.">
                  <div className="chips"><label className="chip"><input type="checkbox" name="salud_ok" value="1" data-clears="salud" checked={s.saludOk} onChange={onSaludOk} /><span>Nada que destacar</span></label></div>
                  <label className="f">Detalles<textarea name="salud" placeholder="Ej. Hernia L5 hace 2 años, tomo eutirox 50 mg…" className={inv('salud')} value={s.vals.salud} onChange={onText} /></label>
                </Section>

                <Section sec={5} done={secOk(s, 5)} title="Tu rutina diaria" hint="Para que el plan encaje en tu vida, no al revés.">
                  <label className="f">Horario de trabajo<input type="text" name="trabajo" required placeholder="Ej. L–V de 9 a 18, teletrabajo" className={inv('trabajo')} value={s.vals.trabajo} onChange={onText} /></label>
                  <div className="row2">
                    <label className="f">Comidas al día
                      <select name="comidas" required className={inv('comidas')} value={s.vals.comidas} onChange={onText}><option value="">Elige</option><option>2</option><option>3</option><option>4</option><option>5 o más</option><option>Muy irregular</option></select>
                    </label>
                    <label className="f">Horas de sueño
                      <select name="sueno" required className={inv('sueno')} value={s.vals.sueno} onChange={onText}><option value="">Elige</option><option>Menos de 6 h</option><option>6–7 h</option><option>7–8 h</option><option>Más de 8 h</option></select>
                    </label>
                  </div>
                  <div className="row2">
                    <label className="f">Días que puedes entrenar
                      <select name="dias" required className={inv('dias')} value={s.vals.dias} onChange={onText}><option value="">Elige</option><option>2 días</option><option>3 días</option><option>4 días</option><option>5 días o más</option></select>
                    </label>
                    <label className="f">Dónde entrenas
                      <select name="lugar" required className={inv('lugar')} value={s.vals.lugar} onChange={onText}><option value="">Elige</option><option>Gimnasio</option><option>Casa</option><option>Casa y gimnasio</option><option>Aún no lo sé</option></select>
                    </label>
                  </div>
                </Section>

                <Section sec={6} done={secOk(s, 6)} title="Alimentación" hint="Lo que te encanta y lo que no puedes ni ver. Alergias o intolerancias también.">
                  <div className="row2">
                    <label className="f">Me gusta<textarea name="gusta" required placeholder="Ej. arroz, pollo, huevos, fruta…" className={inv('gusta')} value={s.vals.gusta} onChange={onText} /></label>
                    <label className="f">No me gusta / no puedo tomar<textarea name="no_gusta" placeholder="Ej. pescado, lactosa…" value={s.vals.no_gusta} onChange={onText} /></label>
                  </div>
                </Section>

                <Section sec={7} done={secOk(s, 7)} title="Compromiso y motivación">
                  <div>
                    <span className="f" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Del 1 al 10, ¿cuánto compromiso tienes ahora mismo?</span>
                    <div className="scale" data-group="compromiso">
                      {SCALE.map(n => (
                        <label className="chip" key={n}>
                          <input type="radio" name="compromiso" value={n} required className={inv('compromiso')} checked={s.compromiso === n} onChange={onCompromiso} />
                          <span>{n}</span>
                        </label>
                      ))}
                    </div>
                    <div className="scale-l"><span>Poco</span><span>A tope</span></div>
                  </div>
                  <label className="f">¿Qué estás dispuesto/a a cambiar?<textarea name="cambiar" required placeholder="Ej. Dejar el picoteo por la noche, entrenar 4 días…" className={inv('cambiar')} value={s.vals.cambiar} onChange={onText} /></label>
                  <label className="f">Una frase: ¿por qué ahora? <small>¿Qué te ha hecho decidirte?</small><textarea name="porque" required placeholder="Ej. Me vi en las fotos de la boda y dije basta." className={inv('porque')} value={s.vals.porque} onChange={onText} /></label>
                </Section>

                <div className="photonote">
                  <div className="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C2A43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg></div>
                  <div><b>Fotos de inicio:</b> al enviar se abrirá mi WhatsApp con tus respuestas. Justo después mándame ahí 3 fotos: <b>frontal, perfil y espalda</b>, con buena luz y ropa ajustada.</div>
                </div>

                <div className="submit">
                  <div className={showErr ? 'err show' : 'err'}>Te falta algún dato. Te lo he marcado en rojo.</div>
                  <button type="submit" className="btn btn-sky">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0C2A43"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.8-1.1-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4z" /></svg>
                    Enviar a José por WhatsApp
                  </button>
                  <p>Tus respuestas se guardan en este móvil mientras rellenas, por si cierras la página.</p>
                </div>
              </form>

              <div className={sent ? 'thanks show' : 'thanks'}>
                <div className="big"><svg width="30" height="30" viewBox="0 0 12 12"><path d="M2 6.5l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>¡Paso 1 casi listo!</h3>
                <p>Si se ha abierto WhatsApp, solo te queda pulsar <b>enviar</b>. Después, en ese mismo chat:</p>
                <ul className="checklist">
                  <li><em>1</em>Envía el mensaje con tus respuestas</li>
                  <li><em>2</em>Mándame 3 fotos: frontal, perfil y espalda</li>
                  <li><em>3</em>Te escribo para agendar la llamada de bienvenida</li>
                </ul>
                <div className="btns">
                  <a className="btn btn-sky" href={waAgain} target="_blank" rel="noopener">Abrir WhatsApp de nuevo</a>
                  <button type="button" className="btn btn-ghost" onClick={() => setSent(false)}>Editar respuestas</button>
                </div>
              </div>
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
              <Image src={closeImg} alt="" sizes="(max-width: 760px) 100vw, 720px" />
              <div>
                <small>YA ESTÁ TODO LISTO</small>
                <h2>Vamos a por ello.</h2>
                <p>Cualquier duda, escríbeme. Estoy aquí para acompañarte en cada paso.</p>
                <a className="btn btn-sky" href={WA_DIRECT} target="_blank" rel="noopener">Escribir a José</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>© José Unstoppable Coaching</footer>
    </div>
  )
}
