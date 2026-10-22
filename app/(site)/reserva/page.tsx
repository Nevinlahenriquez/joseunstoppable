import type { Metadata } from 'next'
import Image from 'next/image'
import BookingFlow from './BookingFlow'
import avatar from '@/public/images/jose-avatar.jpg'

export const metadata: Metadata = {
  title: 'Reserva tu llamada gratuita · Jose Unstoppable',
  description: 'Un minuto: tu nombre, tu objetivo y eliges día y hora para tu llamada privada de 30 minutos con Jose. Gratis y sin compromiso.',
  alternates: { canonical: '/reserva' },
}

export default function Reserva() {
  return (
    <section className="hero bk">
      <div className="wrap bk-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span data-es>Formulario previo · Llamada privada 30 min</span><span data-en>Pre-call form · Private 30-min call</span></span>
          <h1 className="disp bk-h1">
            <span data-es>Agenda tu llamada <span className="hl">gratuita</span> con Jose</span>
            <span data-en>Book your <span className="hl">free</span> call with Jose</span>
          </h1>
          <p className="lead"><span data-es>Un minuto y casi todo con un toque. Me ayuda a preparar tu llamada y a saber si de verdad puedo ayudarte. Todo es confidencial.</span><span data-en>One minute, almost all of it single taps. It helps me prepare your call and know whether I can truly help you. Everything is confidential.</span></p>
          <ol className="bk-steps">
            <li><b>1</b><span data-es>Me dices tu nombre y tu objetivo (1 min)</span><span data-en>You tell me your name and goal (1 min)</span></li>
            <li><b>2</b><span data-es>Eliges día y hora para tu llamada</span><span data-en>You pick a day and time</span></li>
            <li><b>3</b><span data-es>Jose te confirma por WhatsApp</span><span data-en>Jose confirms on WhatsApp</span></li>
          </ol>
          <div className="bk-jose">
            <Image src={avatar} alt="Jose Sanchez" width={60} height={60} priority />
            <div>
              <strong><span data-es>«Sin presión. Si no es para ti, te lo diré con sinceridad.»</span><span data-en>“No pressure. If it&apos;s not for you, I&apos;ll tell you honestly.”</span></strong>
              <span>Jose Sanchez · <span data-es>+100 personas ayudadas</span><span data-en>100+ people helped</span></span>
            </div>
          </div>
        </div>
        <BookingFlow />
      </div>
    </section>
  )
}
