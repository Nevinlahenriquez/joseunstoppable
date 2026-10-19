import './site.css'
import LangToggle from './LangToggle'
import { T, WHATSAPP } from './bits'

export { T, Tick, WHATSAPP } from './bits'

// Same language rule as the homepage: ?lang= wins, then the visitor's last
// choice, then Spanish. Runs before paint so the wrong language never flashes.
const LANG_INIT = `(function(){var l='es';try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('unstoppable_lang')||'es'}catch(e){}document.documentElement.setAttribute('data-lang',l==='en'?'en':'es')})();`

// Visitor id + view beacon, as on the static pages, so the admin funnels count these pages too.
function trackScript(funnelId: string) {
  return `(function(){try{var q=location.search;if(/[?&](utm_|fbclid|gclid|ref=|ad_id)/.test(q)){document.cookie='ju_src='+encodeURIComponent(location.pathname+q)+';path=/;max-age=7776000;samesite=lax'}var m=document.cookie.match(/(?:^|; )ju_vid=([^;]*)/),v=m?m[1]:Math.random().toString(36).slice(2)+Date.now().toString(36);if(!m)document.cookie='ju_vid='+v+';path=/;max-age=31536000;samesite=lax';if(navigator.sendBeacon)navigator.sendBeacon('/api/track',new Blob([JSON.stringify({step:'view',funnelId:${JSON.stringify(funnelId)},visitorId:v,path:location.pathname+q,referrer:document.referrer})],{type:'application/json'}))}catch(e){}})();`
}


export default function SiteShell({ funnelId, children }: { funnelId: string; children: React.ReactNode }) {
  return (
    <div className="site">
      <script dangerouslySetInnerHTML={{ __html: LANG_INIT }} />
      <script dangerouslySetInnerHTML={{ __html: trackScript(funnelId) }} />
      <link rel="preload" href="/fonts/jakarta-latin.woff2" as="font" type="font/woff2" crossOrigin="" />

      <header className="hdr">
        <div className="wrap">
          <a href="/" className="logo" aria-label="José Unstoppable">José <b>Unstoppable</b></a>
          <div className="hdr-r">
            <LangToggle />
            <a className="hdr-cta" href="/reserva"><T es="Reservar llamada" en="Book a call" /></a>
          </div>
        </div>
      </header>

      {children}

      <footer className="ftr">
        <div className="wrap">
          <a href="/" className="logo">José <b>Unstoppable</b></a>
          <span>© José Sánchez</span>
          <nav>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener">WhatsApp</a>
            <a href="/reserva"><T es="Llamada gratuita" en="Free call" /></a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
