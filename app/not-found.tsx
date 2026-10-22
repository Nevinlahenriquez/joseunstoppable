import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { LANG_BOOT_SCRIPT } from '@/lib/site'
import './(site)/site.css'

export const metadata: Metadata = { title: 'Página no encontrada · Jose Unstoppable' }

// Any unknown address lands here, in the site's own frame.
export default function NotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      <Header />
      <main className="site-main">
        <section className="sec final nf">
          <div className="wrap">
            <span className="eyebrow">404</span>
            <h1 className="disp"><span data-es>Esta página no existe.</span><span data-en>This page doesn&apos;t exist.</span></h1>
            <p className="lead"><span data-es>Puede que el enlace esté mal escrito o que la página se haya movido.</span><span data-en>The link may be mistyped, or the page has moved.</span></p>
            <Link className="btn btn-y" href="/"><span data-es>Volver al inicio</span><span data-en>Back to the home page</span><span className="arr">→</span></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
