import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/site/LegalPage'
import { LINKS, OWNER } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Política de privacidad · Jose Unstoppable',
  alternates: { canonical: LINKS.privacy },
}

export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad" updated="19 de octubre de 2026">
      <h2>Responsable del tratamiento</h2>
      <ul>
        <li><strong>Responsable:</strong> {OWNER.name} ({OWNER.brand})</li>
        {OWNER.nif && <li><strong>NIF:</strong> {OWNER.nif}</li>}
        {OWNER.address && <li><strong>Domicilio:</strong> {OWNER.address}</li>}
        <li><strong>Email de contacto:</strong> <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a></li>
      </ul>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li><strong>Formulario de llamada:</strong> nombre, WhatsApp, email (opcional), tus respuestas sobre tus objetivos, hábitos y disponibilidad, y el día y la hora que eliges.</li>
        <li><strong>Registro en eventos y masterclass:</strong> nombre, email y, si lo das, teléfono.</li>
        <li><strong>Clientes:</strong> los datos necesarios para la propuesta, la factura y el seguimiento del programa.</li>
        <li><strong>Navegación:</strong> la página visitada, la página de origen y un identificador anónimo guardado en una cookie propia para medir qué páginas funcionan.</li>
      </ul>
      <p>Algunas respuestas pueden incluir información sobre tu salud o tu cuerpo. Solo la tratamos porque nos la das tú, con tu consentimiento explícito al enviar el formulario, y únicamente para preparar tu llamada y tu plan.</p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Preparar y confirmar tu llamada gratuita y contactarte por WhatsApp o email.</li>
        <li>Prestar el programa de coaching si lo contratas, y emitir propuestas, facturas y recibos.</li>
        <li>Enviarte la información del evento al que te registras.</li>
        <li>Saber de dónde llegan las visitas y mejorar el sitio.</li>
      </ul>

      <h2>Base legal</h2>
      <p>Tu consentimiento (formularios y datos de salud), la ejecución de un contrato o de medidas precontractuales que tú pides (llamada, propuesta y programa), el cumplimiento de obligaciones legales (facturación) y el interés legítimo en medir el uso del sitio de forma agregada.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>Los datos de quien no llega a ser cliente se guardan hasta 12 meses desde el último contacto. Los de clientes, mientras dure la relación y después durante los plazos que exige la ley fiscal. Puedes pedir que los borremos antes.</p>

      <h2>Con quién se comparten</h2>
      <p>No vendemos tus datos. Para que el servicio funcione los tratan, por cuenta nuestra, estos proveedores:</p>
      <ul>
        <li><strong>Supabase</strong> (base de datos, servidores en la Unión Europea).</li>
        <li><strong>Vercel</strong> (alojamiento del sitio web).</li>
        <li><strong>Google</strong> (calendario y videollamada de tu cita).</li>
        <li><strong>Resend</strong> (envío de emails).</li>
        <li><strong>WhatsApp / Meta</strong> (mensajería, cuando nos escribes o te escribimos).</li>
        <li><strong>Stripe</strong> (pagos, si contratas un programa).</li>
      </ul>
      <p>Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo; en ese caso lo hacen con las garantías previstas por el RGPD, como las cláusulas contractuales tipo de la Comisión Europea.</p>

      <h2>Tus derechos</h2>
      <p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos, y retirar tu consentimiento en cualquier momento, escribiendo a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>. Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>

      <h2>Cookies</h2>
      <p>Este sitio usa solo cookies propias: una con un identificador anónimo de visita y otra con la campaña por la que llegaste, que ayudan a saber qué anuncios y páginas funcionan. Tu idioma preferido se guarda en tu propio navegador. No usamos cookies de publicidad de terceros. Puedes borrarlas o bloquearlas desde la configuración de tu navegador.</p>

      <p>Consulta también el <Link href={LINKS.legal}>aviso legal</Link>.</p>
    </LegalPage>
  )
}
