import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/site/LegalPage'
import { LINKS, OWNER, PRICE, WA_HELLO, waLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Términos y condiciones · José Unstoppable',
  alternates: { canonical: LINKS.terms },
}

export default function Terminos() {
  return (
    <LegalPage title="Términos y condiciones" updated="19 de octubre de 2026">
      <p>Estas condiciones regulan la contratación de los programas de coaching de {OWNER.brand}. Al contratar un programa confirmas que las has leído y las aceptas. Los datos del titular están en el <Link href={LINKS.legal}>aviso legal</Link>.</p>

      <h2>1. El servicio</h2>
      <p>El Programa Imparable es un servicio de coaching online 1:1 de entrenamiento y hábitos con una duración de 90 días (3 meses). Incluye, según se detalle en tu propuesta, un plan de entrenamiento y hábitos personalizado, ajustes del plan y check-ins semanales de seguimiento con José, y contacto por WhatsApp para dudas.</p>
      <p>El contenido exacto, las fechas de inicio y la forma de seguimiento se recogen en la propuesta que recibes después de la llamada gratuita. Si algo de la propuesta es distinto de estas condiciones, manda la propuesta.</p>

      <h2>2. Cómo se contrata</h2>
      <ul>
        <li>Reservas una llamada gratuita y sin compromiso en <Link href={LINKS.book}>la página de reserva</Link>.</li>
        <li>Si el programa encaja contigo, recibes una propuesta con el precio, el alcance y la forma de pago.</li>
        <li>El contrato queda cerrado cuando aceptas la propuesta y realizas el pago (o el primer pago, si eliges pagar a plazos).</li>
        <li>Para contratar tienes que ser mayor de edad.</li>
      </ul>

      <h2>3. Precio y pago</h2>
      <p>El precio del Programa Imparable es de {PRICE} €, salvo que la propuesta indique otro. Los precios se muestran en euros e incluyen los impuestos aplicables. El pago se hace por los medios indicados en la propuesta, a través de un proveedor de pagos seguro. Si se acuerda pagar a plazos, el calendario de pagos aparece en la propuesta y el impago de un plazo puede suspender el servicio hasta que se regularice.</p>

      <h2>4. Derecho de desistimiento</h2>
      <p>Como consumidor tienes derecho a desistir del contrato en un plazo de 14 días naturales desde que lo cierras, sin dar ninguna razón. Para hacerlo, escribe a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> o por WhatsApp indicando tu nombre y que quieres desistir.</p>
      <p>Si pides empezar el programa dentro de esos 14 días y después desistes, se te devolverá lo pagado descontando la parte proporcional del servicio ya prestado hasta ese momento. La devolución se hace por el mismo medio de pago en un máximo de 14 días.</p>

      <h2>5. Garantía Imparable</h2>
      <p>Además del desistimiento, si durante los 90 días sigues el plan (completas tus entrenos y haces tus check-ins semanales) y no ves resultados, te devolvemos el 100% de lo pagado. Para pedirla, escríbenos al terminar los 90 días. La garantía se comprueba con el registro de entrenos y check-ins del programa.</p>

      <h2>6. Tu compromiso</h2>
      <ul>
        <li>Dar información veraz sobre tu salud, lesiones y medicación, y avisar si algo cambia.</li>
        <li>Seguir el plan a tu ritmo y con sentido común, y parar si sientes dolor o malestar.</li>
        <li>No compartir con terceros los planes y materiales del programa.</li>
      </ul>

      <h2>7. Salud</h2>
      <p>El programa es de entrenamiento y hábitos y no es un tratamiento médico, nutricional ni psicológico, ni sustituye a un profesional sanitario. Si tienes una lesión, una enfermedad, estás embarazada o tomas medicación, consulta con tu médico antes de empezar. Entrenas bajo tu propia responsabilidad.</p>

      <h2>8. Sesiones y cambios de cita</h2>
      <p>Si no puedes asistir a una llamada de seguimiento, avisa con al menos 24 horas para cambiarla. Las sesiones no avisadas pueden no recuperarse. Si por un motivo justificado necesitas pausar el programa, escríbenos y buscaremos una solución.</p>

      <h2>9. Propiedad intelectual</h2>
      <p>Los planes, vídeos, textos y el método son de {OWNER.name}. Se te dan para tu uso personal durante el programa y no pueden revenderse ni publicarse.</p>

      <h2>10. Responsabilidad</h2>
      <p>Los resultados dependen de cada persona y de cómo siga el plan, por lo que no se garantiza un resultado concreto más allá de la Garantía Imparable. No respondemos de daños causados por no seguir las indicaciones o por no informar de un problema de salud.</p>

      <h2>11. Datos personales</h2>
      <p>Tratamos tus datos como explica la <Link href={LINKS.privacy}>política de privacidad</Link>.</p>

      <h2>12. Dudas y reclamaciones</h2>
      <p>Para cualquier duda o reclamación escribe a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> o por <a href={waLink(WA_HELLO.es)} target="_blank" rel="noopener">WhatsApp</a>. Respondemos en un máximo de 7 días. También puedes acudir a la oficina de consumo de tu comunidad autónoma.</p>

      <h2>13. Ley aplicable</h2>
      <p>Estas condiciones se rigen por la legislación española. Si eres consumidor, podrás acudir a los juzgados de tu domicilio.</p>
    </LegalPage>
  )
}
