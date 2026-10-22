import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import MobileBar from '@/components/site/MobileBar'
import VideoFrame from '@/components/site/VideoFrame'
import { T } from '@/components/site/bits'
import { INTRO_VIDEO, LINKS, OWNER, PRICE, WA_HELLO, waLink } from '@/lib/site'
import hero from '@/public/images/jose.jpg'
import avatar from '@/public/images/jose-avatar.jpg'
import './home.css'

export const metadata: Metadata = {
  title: 'José Unstoppable · Vuelve a gustarte en 90 días',
  description: 'Coaching 1:1 online para hombres de 30 a 50. 3 horas de entreno a la semana, nutrición que encaja en tu vida y José a tu lado cada día.',
  alternates: { canonical: '/' },
}

// Fill these in as testimonials come in. A video slot plays once `video` has
// a YouTube, Vimeo or .mp4 link; a card shows its photos once `before` and
// `after` point at images in public/images.
const VIDEO_TESTIMONIALS: { video: string; name: string; result: string }[] = [
  { video: '', name: '', result: '' },
  { video: '', name: '', result: '' },
  { video: '', name: '', result: '' },
]
const WRITTEN_TESTIMONIALS: { before: string; after: string; quote: string; name: string }[] = [
  { before: '', after: '', quote: '', name: '' },
  { before: '', after: '', quote: '', name: '' },
  { before: '', after: '', quote: '', name: '' },
]

function Ck() {
  return (
    <span className="h-ck" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5.1" /></svg>
    </span>
  )
}

function Arr() {
  return (
    <span className="arr">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
    </span>
  )
}

function IntroVideo() {
  return (
    <VideoFrame src={INTRO_VIDEO} label="Ver vídeo: quién soy">
      <Image src={hero} alt="" fill sizes="(max-width: 900px) 100vw, 60vw" />
      <span className="h-vsoon"><T es="Vídeo muy pronto" en="Video coming soon" /></span>
      <span className="h-vcap">
        <small><T es="Empieza aquí" en="Start here" /></small>
        <b><T es="Quién soy y cómo te voy a ayudar" en="Who I am and how I'll help you" /></b>
      </span>
    </VideoFrame>
  )
}

export default function Home() {
  return (
    <div className="home">
      <section id="top" className="h-hero">
        <div className="wrap">
          <div className="h-copy">
            <span className="h-pill"><b>1:1</b><T es="Coaching online · Hombres de 30 a 50" en="Online coaching · Men 30 to 50" /></span>
            <h1 className="disp">
              <T es={<>Vuelve a gustarte <span className="hl">en 90&nbsp;días.</span></>} en={<>Like what you see again <span className="hl">in 90&nbsp;days.</span></>} />
            </h1>
            <p className="lead">
              <T
                es="Para hombres cansados de no reconocerse en el espejo. Con 3 horas de entreno a la semana, una nutrición que encaja en tu vida y yo a tu lado cada día, esta vez lo consigues."
                en="For men who are tired of not recognising themselves in the mirror. With 3 hours of training a week, nutrition that fits your life and me by your side every day, this time you make it."
              />
            </p>
            <div className="h-ctas">
              <Link className="btn btn-y" href={LINKS.book}><T es="Reserva tu llamada gratuita" en="Book your free call" /><Arr /></Link>
              <a className="btn btn-line h-play" href="#empieza">
                <span className="pi" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg></span>
                <T es="Empieza aquí: quién soy" en="Start here: who I am" />
              </a>
            </div>
            <ul className="h-ticks">
              <li><Ck /><T es="+100 personas acompañadas" en="100+ people coached" /></li>
              <li><Ck /><T es="Garantía de resultados" en="Results guarantee" /></li>
              <li><Ck /><T es="En español o inglés" en="Spanish or English" /></li>
            </ul>
          </div>
          <div className="h-media">
            <div className="h-photo"><Image src={hero} alt={`${OWNER.name}, coach de José Unstoppable, en el gimnasio`} fill priority sizes="(max-width: 900px) 100vw, 46vw" placeholder="blur" /></div>
            <div className="h-float h-hours">
              <span className="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
              <span><b>3 h</b><T es="de entreno a la semana" en="of training a week" /></span>
            </div>
            <div className="h-float h-wa"><span className="dot" /><T es="WhatsApp diario conmigo" en="Daily WhatsApp with me" /></div>
            <div className="h-float h-coach">
              <div><strong>{OWNER.name}</strong><T es="Tu coach. Yo también empecé de cero." en="Your coach. I started from zero too." /></div>
              <div className="h-prog" aria-hidden="true">
                <div className="h-prog-t"><T es="Día 1" en="Day 1" /><T es="Día 90" en="Day 90" /></div>
                <div className="h-prog-b"><i /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="h-stats" aria-label="Datos">
        <div className="wrap">
          <div className="h-stat"><b>+100</b><T es="personas acompañadas en su cambio" en="people coached through their change" /></div>
          <div className="h-stat"><b>3<em>h</em></b><T es="de entreno a la semana. Ni una más." en="of training a week. Not one more." /></div>
          <div className="h-stat"><b>1:1</b><T es="contacto diario conmigo por WhatsApp" en="daily contact with me on WhatsApp" /></div>
          <div className="h-stat"><b>100<em>%</em></b><T es="de tu dinero de vuelta si cumples y no funciona" en="money back if you follow it and it doesn't work" /></div>
        </div>
      </section>

      <section id="empieza" className="h-intro tint">
        <div className="wrap">
          <div className="h-intro-copy">
            <span className="eyebrow"><T es="Empieza aquí" en="Start here" /></span>
            <h2 className="disp"><T es={<>Antes de nada, <span className="hl">conóceme.</span></>} en={<>First things first, <span className="hl">meet me.</span></>} /></h2>
            <p className="lead">
              <T
                es="En este vídeo te cuento quién soy, de dónde vengo y cómo trabajo con los hombres a los que acompaño. Si después sientes que encajamos, reservas tu llamada."
                en="In this video I tell you who I am, where I come from and how I work with the men I coach. If you feel we're a fit afterwards, book your call."
              />
            </p>
            <Link className="btn btn-y" href={LINKS.book}><T es="Reserva tu llamada gratuita" en="Book your free call" /><Arr /></Link>
          </div>
          <IntroVideo />
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="h-split">
            <div className="head">
              <span className="eyebrow"><T es="Seamos sinceros" en="Let's be honest" /></span>
              <h2 className="disp"><T es={<>Sabes que <span className="hl">no estás bien.</span> Y estás cansado de fingir que sí.</>} en={<>You know <span className="hl">you&apos;re not okay.</span> And you&apos;re tired of pretending you are.</>} /></h2>
            </div>
            <p className="lead"><T es="Si te reconoces en tres de estas, no te falta voluntad. Te falta método." en="If three of these sound like you, you're not short on willpower. You're short on a method." /></p>
          </div>
          <div className="h-pains">
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="7" /><path d="M9 9l6 6" /></svg><h3><T es="Evitas el espejo." en="You avoid the mirror." /></h3><p><T es="Sales de la ducha y apartas la mirada. Esa barriga que iba a ser «temporal» ya lleva años contigo." en={'You step out of the shower and look away. That belly that was going to be "temporary" has been with you for years.'} /></p></div>
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg><h3><T es="Prefieres la luz apagada." en="You'd rather keep the lights off." /></h3><p><T es="En la intimidad estás más pendiente de tu cuerpo que de tu pareja. Y se nota: en las ganas, en la seguridad y en la conexión." en="In bed you're thinking more about your body than about your partner. And it shows in your drive, your confidence and your connection." /></p></div>
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 11v2" /><path d="M6 10v4" /></svg><h3><T es="Llegas a casa vacío." en="You get home running on empty." /></h3><p><T es="Tus hijos quieren jugar contigo y tú solo piensas en el sofá. No es el padre que querías ser." en="Your kids want to play and all you can think about is the couch. It's not the dad you wanted to be." /></p></div>
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg><h3><T es="Siempre haces tú la foto." en="You're always the one taking the photo." /></h3><p><T es="Así no sales. Y en verano, la camiseta no te la quitas ni en la playa." en="That way you're not in it. And in summer, the shirt stays on, even at the beach." /></p></div>
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg><h3><T es="Has empezado mil veces." en="You've started a thousand times." /></h3><p><T es="Dietas, gimnasio por tu cuenta, apps, retos de 30 días. Empiezas el lunes con ganas y el jueves ya lo has dejado." en="Diets, the gym on your own, apps, 30-day challenges. You start Monday fired up and you've quit by Thursday." /></p></div>
            <div className="h-pain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-7 4 14 3-7h4" /></svg><h3><T es="Vives en piloto automático." en="You're living on autopilot." /></h3><p><T es="Trabajo, cansancio, repetir. Sin energía, sin ilusión y con la sensación de que te mereces mucho más." en="Work, exhaustion, repeat. No energy, no spark, and the feeling that you deserve so much more." /></p></div>
          </div>
          <div className="h-verdict">
            <p><T es={<>El problema no eres tú. No te falta fuerza de voluntad: <span className="it">te ha faltado un plan que encaje en tu vida y alguien que no te deje abandonar.</span></>} en={<>The problem isn&apos;t you. You&apos;re not short on willpower. <span className="it">You&apos;ve been missing a plan that fits your life and someone who won&apos;t let you quit.</span></>} /></p>
            <Link className="btn btn-y" href={LINKS.book}><T es="Quiero cambiar esto" en="I want to change this" /><Arr /></Link>
          </div>
        </div>
      </section>

      <section id="story" className="sec tint">
        <div className="wrap">
          <div className="h-story">
            <div className="h-story-side">
              <span className="eyebrow"><T es="Mi historia" en="My story" /></span>
              <h2 className="disp"><T es={<>Yo también me escondía de <span className="hl">las fotos.</span></>} en={<>I used to hide from <span className="hl">photos too.</span></>} /></h2>
              <blockquote className="h-quote">
                <T es="Pensaba que mi problema era la calvicie. Me equivocaba: el problema era cómo me estaba tratando a mí mismo." en="I thought my problem was going bald. I was wrong: the problem was how I was treating myself." />
                <cite><Image src={avatar} alt="" width={40} height={40} />{OWNER.name}</cite>
              </blockquote>
            </div>
            <div className="h-story-body">
              <p className="lead"><T es="Me llamo José, tengo 31 años y hoy ayudo a hombres a reconstruirse desde cero. Pero no hace tanto, el que necesitaba ayuda era yo." en="I'm José, I'm 31, and today I help men rebuild themselves from scratch. But not long ago, I was the one who needed help." /></p>
              <p><T es={<>Trabajaba de camarero en Marbella. Ganaba dinero, pero esa vida no me llenaba y no era la que yo quería. Bebía demasiado, mis hábitos eran un desastre y eso me costó más de una multa de tráfico. <strong>Tenía un físico del que me avergonzaba, cero propósito, cero ahorros y la autoestima por los suelos.</strong></>} en={<>I was a waiter in Marbella. I made money, but that life didn&apos;t fulfil me and it wasn&apos;t the one I wanted. I drank too much, my habits were a mess, and it cost me more than one traffic fine. <strong>I was ashamed of my body, with zero purpose, zero savings and my self-esteem on the floor.</strong></>} /></p>
              <p className="h-basta"><T es="A principios de 2025, después de otra multa, dije basta." en="In early 2025, after yet another fine, I said enough." /></p>
              <p><T es={<>Durante mucho tiempo creí que si arreglaba lo del pelo, volvería la seguridad. Nada más lejos de la realidad. Lo que de verdad me hizo sentirme orgulloso al mirarme al espejo fue construir <strong>un físico que admiro, unos hábitos que admiro y una mentalidad que no se rinde.</strong></>} en={<>For a long time I believed that if I fixed my hair, the confidence would come back. Couldn&apos;t have been more wrong. What actually made me proud of the man in the mirror was building <strong>a body I admire, habits I admire and a mindset that doesn&apos;t quit.</strong></>} /></p>
              <p><T es="Hoy voy por la calle sin camiseta sin pensármelo, viajo donde quiero y hablo con cualquier chica sin vergüenza. Mi vida sexual cambió por completo, porque por fin me gusto a mí mismo. Y ya no me aparto en las fotos." en="Today I walk down the street shirtless without a second thought, travel wherever I want and talk to any woman without feeling awkward. My sex life changed completely, because I finally like myself. And I no longer step out of photos." /></p>
              <p><T es={<>A mí me costó años de prueba y error. <strong>A ti no tiene por qué.</strong> Sé lo que es vivir amargado con tu cuerpo, sin confianza y sin ganas de nada, porque yo estuve ahí. Por eso hago esto: para que recorras el mismo camino en tiempo récord, sabiendo que vas en la dirección correcta y con alguien al lado que te entiende de verdad.</>} en={<>It took me years of trial and error. <strong>It doesn&apos;t have to take you that long.</strong> I know what it&apos;s like to live bitter about your body, with no confidence and no drive, because I&apos;ve been there. That&apos;s why I do this: so you can walk the same road in record time, knowing you&apos;re heading the right way, with someone beside you who truly gets it.</>} /></p>
              <p><T es="Quiero que seas imparable, como lo soy yo hoy. Que vivas tu mejor vida y disfrutes de tu cuerpo. Porque te lo mereces." en="I want you to become unstoppable, like I am today. To live your best life and enjoy your body. Because you deserve it." /></p>
              <div className="h-sign"><span className="sig">{OWNER.name}</span><T es="Fundador de José Unstoppable" en="Founder, José Unstoppable" /></div>
            </div>
          </div>
          <div className="h-ba">
            <div className="h-bacol">
              <span className="h-tag"><T es="Antes" en="Before" /></span>
              <ul>
                <li><i>—</i><T es="Camarero en una vida que no me llenaba" en="A waiter in a life that didn't fulfil me" /></li>
                <li><i>—</i><T es="Alcohol y malos hábitos cada semana" en="Alcohol and bad habits every week" /></li>
                <li><i>—</i><T es="Me apartaba en todas las fotos" en="I stepped out of every photo" /></li>
                <li><i>—</i><T es="Inseguro con las mujeres y en la cama" en="Insecure with women and in bed" /></li>
                <li><i>—</i><T es="Sin propósito, sin dinero, sin autoestima" en="No purpose, no money, no self-esteem" /></li>
              </ul>
            </div>
            <div className="h-bacol now">
              <span className="h-tag"><T es="Hoy" en="Today" /></span>
              <ul>
                <li><i>→</i><T es="Coach online, viviendo de lo que me apasiona" en="Online coach, living from what I love" /></li>
                <li><i>→</i><T es="Hábitos que admiro, todos los días" en="Habits I admire, every single day" /></li>
                <li><i>→</i><T es="Sin camiseta en la calle o en la playa, sin pensarlo" en="Shirtless on the street or the beach, no second thought" /></li>
                <li><i>→</i><T es="Seguro de mí, también en la intimidad" en="Confident in myself, in bed too" /></li>
                <li><i>→</i><T es="+100 personas ayudadas a cambiar su vida" en="100+ people helped to change their lives" /></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="method" className="sec">
        <div className="wrap">
          <div className="h-split">
            <div className="head">
              <span className="eyebrow"><T es="El método Imparable" en="The Unstoppable method" /></span>
              <h2 className="disp"><T es={<>Tan sencillo que esta vez <span className="hl">lo terminas.</span></>} en={<>So simple that this time <span className="hl">you finish it.</span></>} /></h2>
            </div>
            <p className="lead"><T es="No necesitas vivir en el gimnasio ni comer pollo con arroz cinco veces al día. Necesitas cuatro cosas bien hechas, en el orden correcto." en="You don't need to live at the gym or eat chicken and rice five times a day. You need four things done right, in the right order." /></p>
          </div>
          <div className="h-pillars">
            <div className="h-pillar"><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></svg></span><span className="k"><T es="Fuerza" en="Strength" /></span><h3><T es="3 horas a la semana." en="3 hours a week." /></h3><p><T es="Rutinas de fuerza diseñadas para ti en mi app, con cada ejercicio explicado paso a paso. Abres el móvil, sigues los pasos y listo." en="Strength routines built for you in my app, with every exercise explained step by step. Open your phone, follow the steps, done." /></p></div>
            <div className="h-pillar"><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21c-4.5 0-7-3.5-7-7.5S8 6 12 6s7 3.5 7 7.5S16.5 21 12 21z" /><path d="M12 6c0-2 1-3 3-3" /></svg></span><span className="k"><T es="Nutrición" en="Nutrition" /></span><h3><T es="Comer sin sufrir." en="Eat without suffering." /></h3><p><T es="Una estructura clara y recetas sencillas que encajan con tu trabajo, tu familia y tus cenas fuera. Sin dietas imposibles." en="A clear structure and simple recipes that fit your job, your family and your dinners out. No impossible diets." /></p></div>
            <div className="h-pillar"><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" /></svg></span><span className="k"><T es="Seguimiento" en="Support" /></span><h3><T es="Nunca vas solo." en="You're never alone." /></h3><p><T es="WhatsApp diario, llamadas y un check-in cada semana. Si hay que apretar, comer más o caminar más, te lo digo yo." en="Daily WhatsApp, calls and a check-in every week. If you need to push harder, eat more or walk more, I'll tell you." /></p></div>
            <div className="h-pillar"><span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg></span><span className="k"><T es="Mentalidad" en="Mindset" /></span><h3><T es="Hábitos que se quedan." en="Habits that stick." /></h3><p><T es="Trabajamos tu cabeza a la vez que tu cuerpo, para que el cambio no se acabe el día 91." en="We work on your head as well as your body, so the change doesn't end on day 91." /></p></div>
          </div>
          <div className="h-muscle">
            <h3><T es={<>Primero <span className="it">músculo.</span><br />Después, grasa fuera.</>} en={<>Muscle <span className="it">first.</span><br />Then the fat goes.</>} /></h3>
            <p><T es={<>El error más común es pasarse horas haciendo cardio para «quemar». El músculo es tu motor: <strong>cuanto más tienes, más energía gastas incluso en reposo.</strong> Por eso la fuerza es la base del programa, y más todavía a partir de los 30, cuando el cuerpo empieza a perderlo si no lo entrenas.</>} en={<>The most common mistake is spending hours on cardio to &quot;burn it off&quot;. Muscle is your engine: <strong>the more you have, the more energy you burn even at rest.</strong> That&apos;s why strength is the foundation of the program, especially after 30, when your body starts losing muscle if you don&apos;t train it.</>} /></p>
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="h-app">
            <div className="h-app-copy">
              <span className="eyebrow"><T es="Tu programa, en tu móvil" en="Your program, on your phone" /></span>
              <h2 className="disp"><T es={<>Abre la app. Sigue los pasos. <span className="hl">Ya está.</span></>} en={<>Open the app. Follow the steps. <span className="hl">That&apos;s it.</span></>} /></h2>
              <p className="lead"><T es="Todo lo que tienes que hacer está en mi app: qué entrenar cada día, cuántas series, qué peso usar y cómo hacer cada ejercicio. No improvisas ni piensas: solo sigues el plan." en="Everything you need to do lives in my app: what to train each day, how many sets, what weight to use and how to do every exercise. No guessing, no overthinking. You just follow the plan." /></p>
              <ul className="h-checks">
                <li><Ck /><T es="Rutinas hechas para tu nivel y tu horario" en="Routines built for your level and your schedule" /></li>
                <li><Ck /><T es="Cada ejercicio explicado paso a paso" en="Every exercise explained step by step" /></li>
                <li><Ck /><T es="Tu progreso registrado semana a semana" en="Your progress tracked week by week" /></li>
                <li><Ck /><T es="Ajustes constantes según tus resultados" en="Constant adjustments based on your results" /></li>
              </ul>
            </div>
            <div className="h-week" aria-label="Ejemplo de semana">
              <div className="h-week-h"><b><T es="Tu semana tipo" en="Your typical week" /></b><span><T es="Ejemplo" en="Example" /></span></div>
              {[
                { on: true, d: ['Lun', 'Mon'], w: ['Fuerza · tren superior', 'Strength · upper body'], t: "60'" },
                { on: false, d: ['Mar', 'Tue'], w: ['Pasos y descanso', 'Steps and rest'], t: '—' },
                { on: true, d: ['Mié', 'Wed'], w: ['Fuerza · tren inferior', 'Strength · lower body'], t: "60'" },
                { on: false, d: ['Jue', 'Thu'], w: ['Pasos y descanso', 'Steps and rest'], t: '—' },
                { on: true, d: ['Vie', 'Fri'], w: ['Fuerza · cuerpo completo', 'Strength · full body'], t: "60'" },
                { on: false, d: ['Sáb', 'Sat'], w: ['Vida y familia', 'Life and family'], t: '—' },
                { on: false, d: ['Dom', 'Sun'], w: ['Check-in semanal conmigo', 'Weekly check-in with me'], t: '✓' },
              ].map(r => (
                <div key={r.d[1]} className={r.on ? 'h-day on' : 'h-day'}>
                  <span className="d"><T es={r.d[0]} en={r.d[1]} /></span>
                  <span className="w"><T es={r.w[0]} en={r.w[1]} /></span>
                  <span className="t">{r.t}</span>
                </div>
              ))}
              <div className="h-week-f"><T es="Total de entreno" en="Total training" /><b>3 h</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow"><T es="Cómo empezamos" en="How we start" /></span>
            <h2 className="disp"><T es={<>De la llamada a tu primer entreno en <span className="hl">pocos días.</span></>} en={<>From the call to your first workout in <span className="hl">a few days.</span></>} /></h2>
          </div>
          <div className="h-steps">
            <div className="h-step"><span className="num">01</span><h3><T es="Reservas tu llamada" en="Book your call" /></h3><p><T es="30 minutos, gratis. Me cuentas dónde estás y a dónde quieres llegar. Si no puedo ayudarte, te lo digo." en="30 minutes, free. Tell me where you are and where you want to be. If I can't help you, I'll say so." /></p></div>
            <div className="h-step"><span className="num">02</span><h3><T es="Diseño tu plan" en="I build your plan" /></h3><p><T es="Entreno, nutrición y objetivos adaptados a tu vida, listos en tu app." en="Training, nutrition and goals built around your life, ready in your app." /></p></div>
            <div className="h-step"><span className="num">03</span><h3><T es="Sigues los pasos" en="You follow the steps" /></h3><p><T es="3 horas a la semana. Yo te acompaño cada día por WhatsApp." en="3 hours a week. I'm with you every day on WhatsApp." /></p></div>
            <div className="h-step"><span className="num">04</span><h3><T es="Ajustamos cada semana" en="We adjust every week" /></h3><p><T es="Check-in semanal para medir, corregir y seguir avanzando. Sin estancarte." en="A weekly check-in to measure, correct and keep moving. No plateaus." /></p></div>
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <div className="head">
            <span className="eyebrow"><T es="Dentro de 90 días" en="90 days from now" /></span>
            <h2 className="disp"><T es={<>Imagina tu vida cuando por fin <span className="hl">te gustes.</span></>} en={<>Imagine your life when you finally <span className="hl">like yourself.</span></>} /></h2>
          </div>
          <div className="h-outs">
            {[
              ['Te miras al espejo y te gusta lo que ves.', 'You look in the mirror and like what you see.'],
              ['Llegas a casa con energía para jugar con tus hijos.', 'You get home with energy to play with your kids.'],
              ['Te quitas la camiseta en la playa sin pensarlo.', 'You take your shirt off at the beach without thinking twice.'],
              ['Vuelves a sentirte seguro y con ganas en la cama.', 'You feel confident and full of desire in bed again.'],
              ['La ropa te queda como siempre quisiste.', 'Your clothes fit the way you always wanted.'],
              ['Sabes comer y entrenar para el resto de tu vida.', 'You know how to eat and train for the rest of your life.'],
            ].map(([es, en]) => (
              <div key={en} className="h-out"><Ck /><p><T es={es} en={en} /></p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonios" className="sec">
        <div className="wrap">
          <div className="h-split">
            <div className="head">
              <span className="eyebrow"><T es="Testimonios" en="Testimonials" /></span>
              <h2 className="disp"><T es={<>Hombres reales. <span className="hl">Cambios reales.</span></>} en={<>Real men. <span className="hl">Real change.</span></>} /></h2>
            </div>
            <p className="lead"><T es="No te lo cuento yo. Te lo cuentan ellos: dónde estaban, qué hicieron y cómo se ven hoy." en="Don't take my word for it. Hear it from them: where they were, what they did and how they look today." /></p>
          </div>
          <div className="h-tvideos">
            {VIDEO_TESTIMONIALS.map((t, i) => (
              <div key={i} className="h-tvideo">
                <VideoFrame src={t.video} label={`Ver testimonio ${i + 1}`}>
                  <span className="h-vsoon"><T es="Próximamente" en="Coming soon" /></span>
                  <span className="h-vcap"><small><T es="Testimonio en vídeo" en="Video testimonial" /></small></span>
                </VideoFrame>
                <div className="h-tmeta">
                  <b>{t.name || <T es="Nombre, edad" en="Name, age" />}</b>
                  <span>{t.result || <T es="Resultado en 90 días" en="Result in 90 days" />}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="h-tquotes">
            {WRITTEN_TESTIMONIALS.map((t, i) => (
              <figure key={i} className="h-tcard">
                <div className="h-tba">
                  <div className="h-tph">{t.before ? <Image src={t.before} alt="Antes" fill sizes="200px" /> : <span><T es="Antes" en="Before" /></span>}</div>
                  <div className="h-tph after">{t.after ? <Image src={t.after} alt="Después" fill sizes="200px" /> : <span><T es="Después" en="After" /></span>}</div>
                </div>
                <blockquote>{t.quote || <T es="Aquí irá la experiencia de un cliente, contada con sus propias palabras." en="A client's experience will go here, in their own words." />}</blockquote>
                <figcaption><b>{t.name || <T es="Nombre, edad" en="Name, age" />}</b><span><T es="90 días" en="90 days" /></span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="offer" className="sec tint">
        <div className="wrap">
          <div className="h-offer">
            <div className="h-offer-l">
              <span className="eyebrow"><T es="Tu inversión" en="Your investment" /></span>
              <h2 className="disp"><T es={<>Todo lo que necesitas para ser <span className="hl">imparable.</span></>} en={<>Everything you need to become <span className="hl">unstoppable.</span></>} /></h2>
              <p className="lead"><T es="Es menos de lo que muchos gastan en tres meses de gimnasio, suplementos y dietas que no funcionan. La diferencia: esta vez tienes un plan y me tienes a mí." en="It's less than many people spend in three months on gym fees, supplements and diets that don't work. The difference: this time you have a plan, and you have me." /></p>
              <div className="h-guar">
                <div className="h-seal" aria-hidden="true">
                  <svg viewBox="0 0 100 100"><defs><path id="seal-circle" d="M50 50m-40 0a40 40 0 1 1 80 0a40 40 0 1 1-80 0" /></defs><text><textPath href="#seal-circle">GARANTÍA · IMPARABLE · GARANTÍA · IMPARABLE ·</textPath></text></svg>
                  <b>100%</b>
                </div>
                <div>
                  <h3><T es="Garantía Imparable" en="The Unstoppable Guarantee" /></h3>
                  <p><T es="Si durante los 90 días sigues el plan, completas tus entrenos y haces tus check-ins semanales, y no ves resultados, te devuelvo el 100% de tu dinero. Así de seguro estoy del método." en="If you follow the plan for 90 days, complete your workouts and do your weekly check-ins, and you don't see results, I'll refund 100% of your money. That's how sure I am of the method." /></p>
                </div>
              </div>
            </div>
            <div className="h-price">
              <div className="h-price-top"><b><T es="Programa Imparable" en="Unstoppable Program" /></b><span><T es="90 días" en="90 days" /></span></div>
              <div className="h-amount"><b>{PRICE}<sup>€</sup></b><T es="3 meses de coaching 1:1" en="3 months of 1:1 coaching" /></div>
              <ul>
                <li><Ck /><T es="Plan de fuerza personalizado en mi app (3 h/semana)" en="Personal strength plan in my app (3 h/week)" /></li>
                <li><Ck /><T es="Nutrición adaptada con recetas sencillas" en="Tailored nutrition with simple recipes" /></li>
                <li><Ck /><T es="WhatsApp diario y llamadas conmigo" en="Daily WhatsApp and calls with me" /></li>
                <li><Ck /><T es="Check-in semanal y ajustes del plan" en="Weekly check-in and plan adjustments" /></li>
                <li><Ck /><T es="Coaching de mentalidad y hábitos" en="Mindset and habits coaching" /></li>
                <li><Ck /><strong><T es="Garantía de devolución del 100%" en="100% money-back guarantee" /></strong></li>
              </ul>
              <Link className="btn btn-y" href={LINKS.book}><T es="Reservar mi llamada gratuita" en="Book my free call" /><Arr /></Link>
              <p className="micro"><T es="Primero hablamos 30 minutos. Solo trabajo con quien sé que puedo ayudar." en="First we talk for 30 minutes. I only work with people I know I can help." /></p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="sec">
        <div className="wrap">
          <div className="h-faq">
            <div className="h-faq-side">
              <span className="eyebrow"><T es="Preguntas frecuentes" en="FAQ" /></span>
              <h2 className="disp"><T es={<>Lo que te estás <span className="hl">preguntando.</span></>} en={<>What you&apos;re <span className="hl">wondering.</span></>} /></h2>
              <p className="lead"><T es={<>¿Tienes otra duda? <a href={waLink(WA_HELLO.es)} target="_blank" rel="noopener">Escríbeme por WhatsApp</a> y te respondo yo mismo.</>} en={<>Got another question? <a href={waLink(WA_HELLO.en)} target="_blank" rel="noopener">Message me on WhatsApp</a> and I&apos;ll answer personally.</>} /></p>
            </div>
            <div>
              {[
                ['No tengo tiempo. ¿Esto es para mí?', "I don't have time. Is this for me?", 'Precisamente para eso está pensado. Son unas 3 horas de entreno a la semana, organizadas alrededor de tu trabajo y tu familia. Si tienes tiempo para ver una serie, tienes tiempo para esto.', "That's exactly who it's built for. About 3 hours of training a week, organised around your work and your family. If you have time to watch a show, you have time for this."],
                ['Ya lo he intentado todo y siempre abandono. ¿Por qué ahora sería distinto?', "I've tried everything and always quit. Why would this time be different?", 'Porque hasta ahora lo has hecho solo. Aquí tienes un plan claro, contacto diario conmigo y un check-in cada semana. Cuando flojees, y pasará, estaré ahí para que no lo dejes.', "Because until now you've done it alone. Here you get a clear plan, daily contact with me and a check-in every week. When you slip, and you will, I'll be there so you don't quit."],
                ['Nunca he entrenado fuerza. ¿Puedo hacerlo?', "I've never done strength training. Can I do this?", 'Sí. Empezamos desde tu nivel real y en la app tienes cada ejercicio explicado paso a paso. Cada semana ajustamos para que progreses con seguridad.', 'Yes. We start from your real level, and the app explains every exercise step by step. We adjust every week so you progress safely.'],
                ['¿Voy a pasar hambre o tener que dejar de salir?', 'Will I go hungry or have to stop going out?', 'No. No creo en las dietas imposibles. Aprendes a comer con una estructura sencilla que encaja con tu trabajo, tu familia y tu vida social.', "No. I don't believe in impossible diets. You learn to eat with a simple structure that fits your job, your family and your social life."],
                ['Tengo más de 40. ¿No es tarde?', "I'm over 40. Isn't it too late?", 'Al contrario. A partir de los 40 el músculo es todavía más importante para tu energía, tu salud y tu físico. Empezamos exactamente donde estás hoy.', 'Quite the opposite. After 40, muscle matters even more for your energy, your health and your body. We start exactly where you are today.'],
                ['¿Cómo funciona la garantía?', 'How does the guarantee work?', 'Si durante los 90 días completas tus entrenos y haces tus check-ins semanales y no ves resultados, te devuelvo el 100% de tu dinero. Sin letra pequeña.', "If you complete your workouts and do your weekly check-ins for 90 days and don't see results, I refund 100% of your money. No fine print."],
                ['¿Qué pasa en la llamada gratuita?', 'What happens on the free call?', 'Son 30 minutos. Me cuentas tu situación y tus objetivos, y te digo con total sinceridad si el programa es para ti. Sin presión y sin compromiso.', "It's 30 minutes. You tell me your situation and your goals, and I tell you honestly whether the program is right for you. No pressure, no commitment."],
              ].map(([qEs, qEn, aEs, aEn]) => (
                <details key={qEn} className="qa">
                  <summary><span><T es={qEs} en={qEn} /></span><span className="pm">+</span></summary>
                  <p><T es={aEs} en={aEn} /></p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sec final">
        <div className="wrap">
          <span className="eyebrow"><T es="La decisión es tuya" en="Your call" /></span>
          <h2 className="disp"><T es={<>Dentro de 90 días puedes seguir igual. <span className="hl">O puedes volver a gustarte.</span></>} en={<>In 90 days you can still be the same. <span className="hl">Or you can like yourself again.</span></>} /></h2>
          <Link className="btn btn-y" href={LINKS.book}><T es="Reservar mi llamada gratuita" en="Book my free call" /><Arr /></Link>
          <p className="micro"><T es="30 minutos · Gratis · Sin compromiso" en="30 minutes · Free · No commitment" /></p>
          <div className="h-final-video">
            <IntroVideo />
            <p><T es="¿Aún no me conoces? Empieza aquí y mira quién soy." en="Don't know me yet? Start here and see who I am." /></p>
          </div>
        </div>
      </section>

      <MobileBar href={LINKS.book}><T es="Reservar llamada gratuita" en="Book a free call" /></MobileBar>
    </div>
  )
}
