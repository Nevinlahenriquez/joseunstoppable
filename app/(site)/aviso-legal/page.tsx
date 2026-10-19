import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/site/LegalPage'
import { LINKS, OWNER, SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Aviso legal · José Unstoppable',
  alternates: { canonical: LINKS.legal },
}

export default function AvisoLegal() {
  return (
    <LegalPage title="Aviso legal" updated="19 de octubre de 2026">
      <h2>Titular del sitio web</h2>
      <p>En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de {SITE_URL.replace('https://', '')}:</p>
      <ul>
        <li><strong>Titular:</strong> {OWNER.name}, que opera bajo la marca {OWNER.brand}.</li>
        {OWNER.nif && <li><strong>NIF:</strong> {OWNER.nif}</li>}
        {OWNER.address && <li><strong>Domicilio:</strong> {OWNER.address}</li>}
        <li><strong>Email:</strong> <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a></li>
        <li><strong>Actividad:</strong> servicios de entrenamiento personal y coaching de hábitos online.</li>
      </ul>

      <h2>Objeto y condiciones de uso</h2>
      <p>Este sitio informa sobre los programas de coaching de {OWNER.brand} y permite reservar una llamada gratuita o registrarse en eventos. Al navegar por él aceptas este aviso legal. Te comprometes a usar el sitio de forma lícita y a no enviar información falsa o de terceros sin su permiso.</p>

      <h2>Naturaleza del servicio</h2>
      <p>Los contenidos y programas son de entrenamiento y hábitos y no sustituyen el consejo de un médico, nutricionista o psicólogo. Si tienes una lesión, una enfermedad o tomas medicación, consulta con un profesional sanitario antes de empezar.</p>

      <h2>Precios, contratación y garantía</h2>
      <p>Los precios se indican en euros. La contratación de un programa se cierra tras la llamada gratuita, mediante propuesta y pago a través de un proveedor de pagos seguro. La garantía de devolución se aplica en los términos descritos en la propuesta: haber seguido el plan durante los 90 días, completando los entrenos y los check-ins semanales. Las condiciones completas están en los <Link href={LINKS.terms}>términos y condiciones</Link>.</p>

      <h2>Propiedad intelectual</h2>
      <p>Los textos, imágenes, logotipos y el método publicados en este sitio son propiedad de {OWNER.name} o se usan con permiso. No se permite su reproducción con fines comerciales sin autorización por escrito.</p>

      <h2>Responsabilidad</h2>
      <p>Se procura que la información del sitio sea correcta y esté actualizada, pero no se garantiza la ausencia de errores ni la disponibilidad continua del servicio. Los enlaces a sitios de terceros (por ejemplo, WhatsApp) se ofrecen por comodidad y su contenido es responsabilidad de esos terceros.</p>

      <h2>Datos personales</h2>
      <p>El tratamiento de los datos que nos envías se explica en la <Link href={LINKS.privacy}>política de privacidad</Link>.</p>

      <h2>Legislación aplicable</h2>
      <p>Este aviso se rige por la legislación española. Si eres consumidor, podrás acudir a los juzgados de tu domicilio.</p>
    </LegalPage>
  )
}
