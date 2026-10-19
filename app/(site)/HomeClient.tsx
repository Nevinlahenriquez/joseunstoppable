'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { jakarta } from './font'
import { LangBoot, useLang } from '@/lib/site/lang'
import { SiteTrack } from '@/lib/site/track'

// Defaults from the original page's data-props.
const PRICE = 497
const WHATSAPP = '34649764886'
const ASSESS = '/reserva'
const NAVY = '#0C2A43'


function Tick() {
  return (
    <span className="tick" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5.1" /></svg>
    </span>
  )
}

export default function HomeClient() {
  const [lang, setLang] = useLang()
  const es = lang !== 'en'
  const [showSticky, setShowSticky] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowSticky(window.scrollY > 720 && (window.innerHeight + window.scrollY) < document.body.scrollHeight - 400)
    }
    const onResize = () => setMobile(window.innerWidth < 900)
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const showNav = !mobile
  const phone = WHATSAPP.replace(/\D/g, '')
  const msg = es ? 'Hola José, quiero saber más sobre el programa' : 'Hi José, I want to know more about the program'
  const waLink = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg)

  return (
    <div className={`pg-home ${jakarta.variable}`}>
      <LangBoot />
      <SiteTrack />
      <header className="hdr">
        <div className="wrap">
          <a href="#top" className="logo" aria-label="José Unstoppable">José <b>Unstoppable</b></a>
          {showNav && (<nav className="nav">
            <a href="#story"><span data-es>Mi historia</span><span data-en>My story</span></a>
            <a href="#method"><span data-es>El método</span><span data-en>The method</span></a>
            <a href="#offer"><span data-es>Precio</span><span data-en>Pricing</span></a>
            <a href="#faq"><span data-es>Preguntas</span><span data-en>FAQ</span></a>
          </nav>)}
          <div className="hdr-r">
            <div className="lang" role="group" aria-label="Idioma / Language">
              <button type="button" onClick={() => setLang('es')} style={{ background: es ? NAVY : 'transparent', color: es ? '#FFFFFF' : NAVY }}>ES</button>
              <button type="button" onClick={() => setLang('en')} style={{ background: es ? 'transparent' : NAVY, color: es ? NAVY : '#FFFFFF' }}>EN</button>
            </div>
            {showNav && <Link className="hdr-cta" href={ASSESS}><span data-es>Reservar llamada</span><span data-en>Book a call</span></Link>}
          </div>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="wrap">
          <div className="hero-copy">
            <span className="eyebrow"><span data-es>Coaching 1:1 online · Hombres de 30 a 50</span><span data-en>1:1 online coaching · Men 30 to 50</span></span>
            <h1 className="disp">
              <span data-es>Vuelve a gustarte <span className="hl">en 90&nbsp;días.</span></span>
              <span data-en>Like what you see again <span className="hl">in 90&nbsp;days.</span></span>
            </h1>
            <p className="lead">
              <span data-es>Para hombres cansados de no reconocerse en el espejo. Con 3 horas de entreno a la semana, una nutrición que encaja en tu vida y yo a tu lado cada día, esta vez lo consigues.</span>
              <span data-en>For men who are tired of not recognising themselves in the mirror. With 3 hours of training a week, nutrition that fits your life and me by your side every day — this time, you make it.</span>
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-y" href={ASSESS}><span data-es>Reserva tu llamada gratuita</span><span data-en>Book your free call</span><span className="arr">→</span></Link>
              <a className="btn btn-line" href="#story"><span data-es>Conoce mi historia</span><span data-en>Read my story</span></a>
            </div>
            <ul className="ticks">
              <li><Tick /><span data-es>+100 personas acompañadas</span><span data-en>100+ people coached</span></li>
              <li><Tick /><span data-es>Garantía de resultados</span><span data-en>Results guarantee</span></li>
              <li><Tick /><span data-es>En español o inglés</span><span data-en>Spanish or English</span></li>
            </ul>
          </div>
          <div className="hero-media">
            <div className="hero-photo"><Image src="/images/site/jose.jpg" alt="José Sánchez" fill priority sizes="(max-width: 900px) 100vw, 46vw" /></div>
            <div className="hero-card">
              <div><strong>José Sánchez</strong><span data-es>Tu coach. Yo también empecé de cero.</span><span data-en>Your coach. I started from zero too.</span></div>
              <div className="big">90<small data-es>días</small><small data-en>days</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="Datos">
        <div className="wrap">
          <div className="stat"><b>+100</b><span data-es>personas acompañadas en su cambio</span><span data-en>people coached through their change</span></div>
          <div className="stat"><b>3 h</b><span data-es>de entreno a la semana. Ni una más.</span><span data-en>of training a week. Not one more.</span></div>
          <div className="stat"><b>1:1</b><span data-es>contacto diario conmigo por WhatsApp</span><span data-en>daily contact with me on WhatsApp</span></div>
          <div className="stat"><b>100%</b><span data-es>de tu dinero de vuelta si cumples y no funciona</span><span data-en>money back if you follow it and it doesn&apos;t work</span></div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow"><span data-es>Seamos sinceros</span><span data-en>Let&apos;s be honest</span></span>
            <h2 className="disp"><span data-es>Sabes que <span className="hl">no estás bien.</span> Y estás cansado de fingir que sí.</span><span data-en>You know <span className="hl">you&apos;re not okay.</span> And you&apos;re tired of pretending you are.</span></h2>
          </div>
          <div className="pains">
            <div className="pain"><span className="n">01</span><h3><span data-es>Evitas el espejo.</span><span data-en>You avoid the mirror.</span></h3><p><span data-es>Sales de la ducha y apartas la mirada. Esa barriga que iba a ser «temporal» ya lleva años contigo.</span><span data-en>You step out of the shower and look away. That belly that was going to be &quot;temporary&quot; has been with you for years.</span></p></div>
            <div className="pain"><span className="n">02</span><h3><span data-es>Prefieres la luz apagada.</span><span data-en>You&apos;d rather keep the lights off.</span></h3><p><span data-es>En la intimidad estás más pendiente de tu cuerpo que de tu pareja. Y se nota: en las ganas, en la seguridad y en la conexión.</span><span data-en>In bed you&apos;re thinking more about your body than about your partner. And it shows — in your drive, your confidence and your connection.</span></p></div>
            <div className="pain"><span className="n">03</span><h3><span data-es>Llegas a casa vacío.</span><span data-en>You get home running on empty.</span></h3><p><span data-es>Tus hijos quieren jugar contigo y tú solo piensas en el sofá. No es el padre que querías ser.</span><span data-en>Your kids want to play and all you can think about is the couch. It&apos;s not the dad you wanted to be.</span></p></div>
            <div className="pain"><span className="n">04</span><h3><span data-es>Siempre haces tú la foto.</span><span data-en>You&apos;re always the one taking the photo.</span></h3><p><span data-es>Así no sales. Y en verano, la camiseta no te la quitas ni en la playa.</span><span data-en>That way you&apos;re not in it. And in summer, the shirt stays on — even at the beach.</span></p></div>
            <div className="pain"><span className="n">05</span><h3><span data-es>Has empezado mil veces.</span><span data-en>You&apos;ve started a thousand times.</span></h3><p><span data-es>Dietas, gimnasio por tu cuenta, apps, retos de 30 días. Empiezas el lunes con ganas y el jueves ya lo has dejado.</span><span data-en>Diets, the gym on your own, apps, 30-day challenges. You start Monday fired up and you&apos;ve quit by Thursday.</span></p></div>
            <div className="pain"><span className="n">06</span><h3><span data-es>Vives en piloto automático.</span><span data-en>You&apos;re living on autopilot.</span></h3><p><span data-es>Trabajo, cansancio, repetir. Sin energía, sin ilusión y con la sensación de que te mereces mucho más.</span><span data-en>Work, exhaustion, repeat. No energy, no spark — and the feeling that you deserve so much more.</span></p></div>
          </div>
          <div className="verdict">
            <p><span data-es>El problema no eres tú. No te falta fuerza de voluntad: <span className="hl">te ha faltado un plan que encaje en tu vida y alguien que no te deje abandonar.</span></span><span data-en>The problem isn&apos;t you. You&apos;re not short on willpower — <span className="hl">you&apos;ve been missing a plan that fits your life and someone who won&apos;t let you quit.</span></span></p>
            <Link className="btn btn-y" href={ASSESS}><span data-es>Quiero cambiar esto</span><span data-en>I want to change this</span><span className="arr">→</span></Link>
          </div>
        </div>
      </section>

      <section id="story" className="sec">
        <div className="wrap">
          <div className="story">
            <div className="story-side">
              <span className="eyebrow"><span data-es>Mi historia</span><span data-en>My story</span></span>
              <h2 className="disp"><span data-es>Yo también me escondía de <span className="hl">las fotos.</span></span><span data-en>I used to hide from <span className="hl">photos too.</span></span></h2>
              <blockquote className="quote">
                <span data-es>«Pensaba que mi problema era la calvicie. Me equivocaba: el problema era cómo me estaba tratando a mí mismo.»</span>
                <span data-en>&quot;I thought my problem was going bald. I was wrong: the problem was how I was treating myself.&quot;</span>
                <cite>— José Sánchez</cite>
              </blockquote>
            </div>
            <div className="story-body">
              <p className="lead"><span data-es>Me llamo José, tengo 31 años y hoy ayudo a hombres a reconstruirse desde cero. Pero no hace tanto, el que necesitaba ayuda era yo.</span><span data-en>I&apos;m José, I&apos;m 31, and today I help men rebuild themselves from scratch. But not long ago, I was the one who needed help.</span></p>
              <p><span data-es>Trabajaba de camarero en Marbella. Ganaba dinero, pero esa vida no me llenaba y no era la que yo quería. Bebía demasiado, mis hábitos eran un desastre y eso me costó más de una multa de tráfico. <strong>Tenía un físico del que me avergonzaba, cero propósito, cero ahorros y la autoestima por los suelos.</strong></span><span data-en>I was a waiter in Marbella. I made money, but that life didn&apos;t fulfil me and it wasn&apos;t the one I wanted. I drank too much, my habits were a mess, and it cost me more than one traffic fine. <strong>I was ashamed of my body, with zero purpose, zero savings and my self-esteem on the floor.</strong></span></p>
              <p className="basta"><span data-es>A principios de 2025, después de otra multa, dije basta.</span><span data-en>In early 2025, after yet another fine, I said enough.</span></p>
              <p><span data-es>Durante mucho tiempo creí que si arreglaba lo del pelo, volvería la seguridad. Nada más lejos de la realidad. Lo que de verdad me hizo sentirme orgulloso al mirarme al espejo fue construir <strong>un físico que admiro, unos hábitos que admiro y una mentalidad que no se rinde.</strong></span><span data-en>For a long time I believed that if I fixed my hair, the confidence would come back. Couldn&apos;t have been more wrong. What actually made me proud of the man in the mirror was building <strong>a body I admire, habits I admire and a mindset that doesn&apos;t quit.</strong></span></p>
              <p><span data-es>Hoy voy por la calle sin camiseta sin pensármelo, viajo donde quiero y hablo con cualquier chica sin vergüenza. Mi vida sexual cambió por completo, porque por fin me gusto a mí mismo. Y ya no me aparto en las fotos.</span><span data-en>Today I walk down the street shirtless without a second thought, travel wherever I want and talk to any woman without feeling awkward. My sex life changed completely, because I finally like myself. And I no longer step out of photos.</span></p>
              <p><span data-es>A mí me costó años de prueba y error. <strong>A ti no tiene por qué.</strong> Sé lo que es vivir amargado con tu cuerpo, sin confianza y sin ganas de nada, porque yo estuve ahí. Por eso hago esto: para que recorras el mismo camino en tiempo récord, sabiendo que vas en la dirección correcta y con alguien al lado que te entiende de verdad.</span><span data-en>It took me years of trial and error. <strong>It doesn&apos;t have to take you that long.</strong> I know what it&apos;s like to live bitter about your body, with no confidence and no drive, because I&apos;ve been there. That&apos;s why I do this: so you can walk the same road in record time, knowing you&apos;re heading the right way, with someone beside you who truly gets it.</span></p>
              <p><span data-es>Quiero que seas imparable, como lo soy yo hoy. Que vivas tu mejor vida y disfrutes de tu cuerpo. Porque te lo mereces.</span><span data-en>I want you to become unstoppable, like I am today. To live your best life and enjoy your body. Because you deserve it.</span></p>
              <div className="sign"><b>José Sánchez</b><span data-es>Fundador de José Unstoppable</span><span data-en>Founder, José Unstoppable</span></div>
            </div>
          </div>
          <div className="ba">
            <div className="ba-col">
              <span className="tag"><span data-es>Antes</span><span data-en>Before</span></span>
              <ul>
                <li><i>—</i><span data-es>Camarero en una vida que no me llenaba</span><span data-en>A waiter in a life that didn&apos;t fulfil me</span></li>
                <li><i>—</i><span data-es>Alcohol y malos hábitos cada semana</span><span data-en>Alcohol and bad habits every week</span></li>
                <li><i>—</i><span data-es>Me apartaba en todas las fotos</span><span data-en>I stepped out of every photo</span></li>
                <li><i>—</i><span data-es>Inseguro con las mujeres y en la cama</span><span data-en>Insecure with women and in bed</span></li>
                <li><i>—</i><span data-es>Sin propósito, sin dinero, sin autoestima</span><span data-en>No purpose, no money, no self-esteem</span></li>
              </ul>
            </div>
            <div className="ba-col now">
              <span className="tag"><span data-es>Hoy</span><span data-en>Today</span></span>
              <ul>
                <li><i>→</i><span data-es>Coach online, viviendo de lo que me apasiona</span><span data-en>Online coach, living from what I love</span></li>
                <li><i>→</i><span data-es>Hábitos que admiro, todos los días</span><span data-en>Habits I admire, every single day</span></li>
                <li><i>→</i><span data-es>Sin camiseta en la calle o en la playa, sin pensarlo</span><span data-en>Shirtless on the street or the beach, no second thought</span></li>
                <li><i>→</i><span data-es>Seguro de mí, también en la intimidad</span><span data-en>Confident in myself — in bed too</span></li>
                <li><i>→</i><span data-es>+100 personas ayudadas a cambiar su vida</span><span data-en>100+ people helped to change their lives</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="sec tint">
        <div className="wrap">
          <div className="split-head">
            <div className="head">
              <span className="eyebrow"><span data-es>El método Imparable</span><span data-en>The Unstoppable method</span></span>
              <h2 className="disp"><span data-es>Tan sencillo que esta vez <span className="hl">lo terminas.</span></span><span data-en>So simple that this time <span className="hl">you finish it.</span></span></h2>
            </div>
            <p className="lead"><span data-es>No necesitas vivir en el gimnasio ni comer pollo con arroz cinco veces al día. Necesitas cuatro cosas bien hechas, en el orden correcto.</span><span data-en>You don&apos;t need to live at the gym or eat chicken and rice five times a day. You need four things done right, in the right order.</span></p>
          </div>
          <div className="pillars">
            <div className="pillar"><span className="n"><span data-es>Fuerza</span><span data-en>Strength</span><b>01</b></span><h3><span data-es>3 horas a la semana.</span><span data-en>3 hours a week.</span></h3><p><span data-es>Rutinas de fuerza diseñadas para ti en mi app, con cada ejercicio explicado paso a paso. Abres el móvil, sigues los pasos y listo.</span><span data-en>Strength routines built for you in my app, with every exercise explained step by step. Open your phone, follow the steps, done.</span></p></div>
            <div className="pillar"><span className="n"><span data-es>Nutrición</span><span data-en>Nutrition</span><b>02</b></span><h3><span data-es>Comer sin sufrir.</span><span data-en>Eat without suffering.</span></h3><p><span data-es>Una estructura clara y recetas sencillas que encajan con tu trabajo, tu familia y tus cenas fuera. Sin dietas imposibles.</span><span data-en>A clear structure and simple recipes that fit your job, your family and your dinners out. No impossible diets.</span></p></div>
            <div className="pillar"><span className="n"><span data-es>Seguimiento</span><span data-en>Support</span><b>03</b></span><h3><span data-es>Nunca vas solo.</span><span data-en>You&apos;re never alone.</span></h3><p><span data-es>WhatsApp diario, llamadas y un check-in cada semana. Si hay que apretar, comer más o caminar más, te lo digo yo.</span><span data-en>Daily WhatsApp, calls and a check-in every week. If you need to push harder, eat more or walk more, I&apos;ll tell you.</span></p></div>
            <div className="pillar"><span className="n"><span data-es>Mentalidad</span><span data-en>Mindset</span><b>04</b></span><h3><span data-es>Hábitos que se quedan.</span><span data-en>Habits that stick.</span></h3><p><span data-es>Trabajamos tu cabeza a la vez que tu cuerpo, para que el cambio no se acabe el día 91.</span><span data-en>We work on your head as well as your body, so the change doesn&apos;t end on day 91.</span></p></div>
          </div>
          <div className="muscle">
            <h3><span data-es>Primero <em>músculo.</em><br />Después, grasa fuera.</span><span data-en>Muscle <em>first.</em><br />Then the fat goes.</span></h3>
            <p><span data-es>El error más común es pasarse horas haciendo cardio para «quemar». El músculo es tu motor: <strong>cuanto más tienes, más energía gastas incluso en reposo.</strong> Por eso la fuerza es la base del programa, y más todavía a partir de los 30, cuando el cuerpo empieza a perderlo si no lo entrenas.</span><span data-en>The most common mistake is spending hours on cardio to &quot;burn it off&quot;. Muscle is your engine: <strong>the more you have, the more energy you burn even at rest.</strong> That&apos;s why strength is the foundation of the program — especially after 30, when your body starts losing muscle if you don&apos;t train it.</span></p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="app">
            <div className="app-copy">
              <span className="eyebrow"><span data-es>Tu programa, en tu móvil</span><span data-en>Your program, on your phone</span></span>
              <h2 className="disp"><span data-es>Abre la app. Sigue los pasos. <span className="hl">Ya está.</span></span><span data-en>Open the app. Follow the steps. <span className="hl">That&apos;s it.</span></span></h2>
              <p className="lead"><span data-es>Todo lo que tienes que hacer está en mi app: qué entrenar cada día, cuántas series, qué peso usar y cómo hacer cada ejercicio. No improvisas ni piensas: solo sigues el plan. Esa es la diferencia entre volver a intentarlo y conseguirlo.</span><span data-en>Everything you need to do lives in my app: what to train each day, how many sets, what weight to use and how to do every exercise. No guessing, no overthinking — you just follow the plan. That&apos;s the difference between trying again and actually making it.</span></p>
              <ul className="checks">
                <li><Tick /><span data-es>Rutinas hechas para tu nivel y tu horario</span><span data-en>Routines built for your level and your schedule</span></li>
                <li><Tick /><span data-es>Cada ejercicio explicado paso a paso</span><span data-en>Every exercise explained step by step</span></li>
                <li><Tick /><span data-es>Tu progreso registrado semana a semana</span><span data-en>Your progress tracked week by week</span></li>
                <li><Tick /><span data-es>Ajustes constantes según tus resultados</span><span data-en>Constant adjustments based on your results</span></li>
              </ul>
            </div>
            <div className="week" aria-label="Ejemplo de semana">
              <div className="week-h"><b><span data-es>Tu semana tipo</span><span data-en>Your typical week</span></b><span data-es>Ejemplo</span><span data-en>Example</span></div>
              <div className="day on"><span className="d"><span data-es>Lun</span><span data-en>Mon</span></span><span className="w"><span data-es>Fuerza · tren superior</span><span data-en>Strength · upper body</span></span><span className="t">60&apos;</span></div>
              <div className="day"><span className="d"><span data-es>Mar</span><span data-en>Tue</span></span><span className="w"><span data-es>Pasos y descanso</span><span data-en>Steps and rest</span></span><span className="t">—</span></div>
              <div className="day on"><span className="d"><span data-es>Mié</span><span data-en>Wed</span></span><span className="w"><span data-es>Fuerza · tren inferior</span><span data-en>Strength · lower body</span></span><span className="t">60&apos;</span></div>
              <div className="day"><span className="d"><span data-es>Jue</span><span data-en>Thu</span></span><span className="w"><span data-es>Pasos y descanso</span><span data-en>Steps and rest</span></span><span className="t">—</span></div>
              <div className="day on"><span className="d"><span data-es>Vie</span><span data-en>Fri</span></span><span className="w"><span data-es>Fuerza · cuerpo completo</span><span data-en>Strength · full body</span></span><span className="t">60&apos;</span></div>
              <div className="day"><span className="d"><span data-es>Sáb</span><span data-en>Sat</span></span><span className="w"><span data-es>Vida y familia</span><span data-en>Life and family</span></span><span className="t">—</span></div>
              <div className="day"><span className="d"><span data-es>Dom</span><span data-en>Sun</span></span><span className="w"><span data-es>Check-in semanal conmigo</span><span data-en>Weekly check-in with me</span></span><span className="t">✓</span></div>
              <div className="week-f"><span data-es>Total de entreno</span><span data-en>Total training</span><b>3 h</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow"><span data-es>Cómo empezamos</span><span data-en>How we start</span></span>
            <h2 className="disp"><span data-es>De la llamada a tu primer entreno en <span className="hl">pocos días.</span></span><span data-en>From the call to your first workout in <span className="hl">a few days.</span></span></h2>
          </div>
          <div className="steps">
            <div className="step"><h3><span data-es>Reservas tu llamada</span><span data-en>Book your call</span></h3><p><span data-es>30 minutos, gratis. Me cuentas dónde estás y a dónde quieres llegar. Si no puedo ayudarte, te lo digo.</span><span data-en>30 minutes, free. Tell me where you are and where you want to be. If I can&apos;t help you, I&apos;ll say so.</span></p></div>
            <div className="step"><h3><span data-es>Diseño tu plan</span><span data-en>I build your plan</span></h3><p><span data-es>Entreno, nutrición y objetivos adaptados a tu vida, listos en tu app.</span><span data-en>Training, nutrition and goals built around your life, ready in your app.</span></p></div>
            <div className="step"><h3><span data-es>Sigues los pasos</span><span data-en>You follow the steps</span></h3><p><span data-es>3 horas a la semana. Yo te acompaño cada día por WhatsApp.</span><span data-en>3 hours a week. I&apos;m with you every day on WhatsApp.</span></p></div>
            <div className="step"><h3><span data-es>Ajustamos cada semana</span><span data-en>We adjust every week</span></h3><p><span data-es>Check-in semanal para medir, corregir y seguir avanzando. Sin estancarte.</span><span data-en>A weekly check-in to measure, correct and keep moving. No plateaus.</span></p></div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow"><span data-es>Dentro de 90 días</span><span data-en>90 days from now</span></span>
            <h2 className="disp"><span data-es>Imagina tu vida cuando por fin te gustes.</span><span data-en>Imagine your life when you finally like yourself.</span></h2>
          </div>
          <div className="outs">
            <div className="out"><b>01</b><p><span data-es>Te miras al espejo y te gusta lo que ves.</span><span data-en>You look in the mirror and like what you see.</span></p></div>
            <div className="out"><b>02</b><p><span data-es>Llegas a casa con energía para jugar con tus hijos.</span><span data-en>You get home with energy to play with your kids.</span></p></div>
            <div className="out"><b>03</b><p><span data-es>Te quitas la camiseta en la playa sin pensarlo.</span><span data-en>You take your shirt off at the beach without thinking twice.</span></p></div>
            <div className="out"><b>04</b><p><span data-es>Vuelves a sentirte seguro y con ganas en la cama.</span><span data-en>You feel confident and full of desire in bed again.</span></p></div>
            <div className="out"><b>05</b><p><span data-es>La ropa te queda como siempre quisiste.</span><span data-en>Your clothes fit the way you always wanted.</span></p></div>
            <div className="out"><b>06</b><p><span data-es>Sabes comer y entrenar para el resto de tu vida.</span><span data-en>You know how to eat and train for the rest of your life.</span></p></div>
          </div>
        </div>
      </section>

      <section id="offer" className="sec tint">
        <div className="wrap">
          <div className="offer">
            <div className="offer-l">
              <span className="eyebrow"><span data-es>Tu inversión</span><span data-en>Your investment</span></span>
              <h2 className="disp"><span data-es>Todo lo que necesitas para ser <span className="hl">imparable.</span></span><span data-en>Everything you need to become <span className="hl">unstoppable.</span></span></h2>
              <p className="lead"><span data-es>Es menos de lo que muchos gastan en tres meses de gimnasio, suplementos y dietas que no funcionan. La diferencia: esta vez tienes un plan y me tienes a mí.</span><span data-en>It&apos;s less than many people spend in three months on gym fees, supplements and diets that don&apos;t work. The difference: this time you have a plan, and you have me.</span></p>
              <div className="guar">
                <div className="seal"><span><b>100%</b><span data-es>Garantía</span><span data-en>Guarantee</span></span></div>
                <div>
                  <h3><span data-es>Garantía Imparable</span><span data-en>The Unstoppable Guarantee</span></h3>
                  <p><span data-es>Si durante los 90 días sigues el plan —completas tus entrenos y haces tus check-ins semanales— y no ves resultados, te devuelvo el 100% de tu dinero. Así de seguro estoy del método.</span><span data-en>If you follow the plan for 90 days — complete your workouts and do your weekly check-ins — and you don&apos;t see results, I&apos;ll refund 100% of your money. That&apos;s how sure I am of the method.</span></p>
                </div>
              </div>
            </div>
            <div className="price">
              <div className="price-top"><b><span data-es>Programa Imparable</span><span data-en>Unstoppable Program</span></b><span data-es>90 días</span><span data-en>90 days</span></div>
              <div className="amount"><b>{PRICE}€</b><span data-es>3 meses de coaching 1:1</span><span data-en>3 months of 1:1 coaching</span></div>
              <ul>
                <li><Tick /><span data-es>Plan de fuerza personalizado en mi app (3 h/semana)</span><span data-en>Personal strength plan in my app (3 h/week)</span></li>
                <li><Tick /><span data-es>Nutrición adaptada con recetas sencillas</span><span data-en>Tailored nutrition with simple recipes</span></li>
                <li><Tick /><span data-es>WhatsApp diario y llamadas conmigo</span><span data-en>Daily WhatsApp and calls with me</span></li>
                <li><Tick /><span data-es>Check-in semanal y ajustes del plan</span><span data-en>Weekly check-in and plan adjustments</span></li>
                <li><Tick /><span data-es>Coaching de mentalidad y hábitos</span><span data-en>Mindset and habits coaching</span></li>
                <li><Tick /><span><strong data-es>Garantía de devolución del 100%</strong><strong data-en>100% money-back guarantee</strong></span></li>
              </ul>
              <Link className="btn btn-y" href={ASSESS}><span data-es>Reservar mi llamada gratuita</span><span data-en>Book my free call</span><span className="arr">→</span></Link>
              <p className="micro"><span data-es>Primero hablamos 30 minutos. Solo trabajo con quien sé que puedo ayudar.</span><span data-en>First we talk for 30 minutes. I only work with people I know I can help.</span></p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="sec">
        <div className="wrap">
          <div className="faq">
            <div className="faq-side">
              <span className="eyebrow"><span data-es>Preguntas frecuentes</span><span data-en>FAQ</span></span>
              <h2 className="disp"><span data-es>Lo que te estás preguntando.</span><span data-en>What you&apos;re wondering.</span></h2>
              <p className="lead"><span data-es>¿Tienes otra duda? <a href={waLink} target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te respondo yo mismo.</span><span data-en>Got another question? <a href={waLink} target="_blank" rel="noopener">Message me on WhatsApp</a> and I&apos;ll answer personally.</span></p>
            </div>
            <div>
              <details className="qa"><summary><span><span data-es>No tengo tiempo. ¿Esto es para mí?</span><span data-en>I don&apos;t have time. Is this for me?</span></span><span className="pm">+</span></summary><p><span data-es>Precisamente para eso está pensado. Son unas 3 horas de entreno a la semana, organizadas alrededor de tu trabajo y tu familia. Si tienes tiempo para ver una serie, tienes tiempo para esto.</span><span data-en>That&apos;s exactly who it&apos;s built for. About 3 hours of training a week, organised around your work and your family. If you have time to watch a show, you have time for this.</span></p></details>
              <details className="qa"><summary><span><span data-es>Ya lo he intentado todo y siempre abandono. ¿Por qué ahora sería distinto?</span><span data-en>I&apos;ve tried everything and always quit. Why would this time be different?</span></span><span className="pm">+</span></summary><p><span data-es>Porque hasta ahora lo has hecho solo. Aquí tienes un plan claro, contacto diario conmigo y un check-in cada semana. Cuando flojees —y pasará— estaré ahí para que no lo dejes.</span><span data-en>Because until now you&apos;ve done it alone. Here you get a clear plan, daily contact with me and a check-in every week. When you slip — and you will — I&apos;ll be there so you don&apos;t quit.</span></p></details>
              <details className="qa"><summary><span><span data-es>Nunca he entrenado fuerza. ¿Puedo hacerlo?</span><span data-en>I&apos;ve never done strength training. Can I do this?</span></span><span className="pm">+</span></summary><p><span data-es>Sí. Empezamos desde tu nivel real y en la app tienes cada ejercicio explicado paso a paso. Cada semana ajustamos para que progreses con seguridad.</span><span data-en>Yes. We start from your real level, and the app explains every exercise step by step. We adjust every week so you progress safely.</span></p></details>
              <details className="qa"><summary><span><span data-es>¿Voy a pasar hambre o tener que dejar de salir?</span><span data-en>Will I go hungry or have to stop going out?</span></span><span className="pm">+</span></summary><p><span data-es>No. No creo en las dietas imposibles. Aprendes a comer con una estructura sencilla que encaja con tu trabajo, tu familia y tu vida social.</span><span data-en>No. I don&apos;t believe in impossible diets. You learn to eat with a simple structure that fits your job, your family and your social life.</span></p></details>
              <details className="qa"><summary><span><span data-es>Tengo más de 40. ¿No es tarde?</span><span data-en>I&apos;m over 40. Isn&apos;t it too late?</span></span><span className="pm">+</span></summary><p><span data-es>Al contrario. A partir de los 40 el músculo es todavía más importante para tu energía, tu salud y tu físico. Empezamos exactamente donde estás hoy.</span><span data-en>Quite the opposite. After 40, muscle matters even more for your energy, your health and your body. We start exactly where you are today.</span></p></details>
              <details className="qa"><summary><span><span data-es>¿Cómo funciona la garantía?</span><span data-en>How does the guarantee work?</span></span><span className="pm">+</span></summary><p><span data-es>Si durante los 90 días completas tus entrenos y haces tus check-ins semanales y no ves resultados, te devuelvo el 100% de tu dinero. Sin letra pequeña.</span><span data-en>If you complete your workouts and do your weekly check-ins for 90 days and don&apos;t see results, I refund 100% of your money. No fine print.</span></p></details>
              <details className="qa"><summary><span><span data-es>¿Qué pasa en la llamada gratuita?</span><span data-en>What happens on the free call?</span></span><span className="pm">+</span></summary><p><span data-es>Son 30 minutos. Me cuentas tu situación y tus objetivos, y te digo con total sinceridad si el programa es para ti. Sin presión y sin compromiso.</span><span data-en>It&apos;s 30 minutes. You tell me your situation and your goals, and I tell you honestly whether the program is right for you. No pressure, no commitment.</span></p></details>
            </div>
          </div>
        </div>
      </section>

      <section className="sec final">
        <div className="wrap">
          <span className="eyebrow"><span data-es>La decisión es tuya</span><span data-en>Your call</span></span>
          <h2 className="disp"><span data-es>Dentro de 90 días puedes seguir igual. <span className="hl">O puedes volver a gustarte.</span></span><span data-en>In 90 days you can still be the same. <span className="hl">Or you can like yourself again.</span></span></h2>
          <Link className="btn btn-y" href={ASSESS}><span data-es>Reservar mi llamada gratuita</span><span data-en>Book my free call</span><span className="arr">→</span></Link>
          <p className="micro"><span data-es>30 minutos · Gratis · Sin compromiso</span><span data-en>30 minutes · Free · No commitment</span></p>
        </div>
      </section>

      <footer className="ftr">
        <div className="wrap">
          <a href="#top" className="logo">José <b>Unstoppable</b></a>
          <span>© José Sánchez</span>
          <nav className="m-foot">
            <a href={waLink} target="_blank" rel="noopener">WhatsApp</a>
          </nav>
        </div>
      </footer>

      {showSticky && (
        <div className="m-bar">
          <Link className="btn btn-y" href={ASSESS}><span data-es>Reservar llamada gratuita</span><span data-en>Book a free call</span><span className="arr">→</span></Link>
        </div>
      )}

    </div>
  )
}
