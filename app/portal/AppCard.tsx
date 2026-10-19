'use client'

import { useState } from 'react'
import type { PortalSettings } from '@/lib/portal'

const Phone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2" /></svg>
)

// The big app card. A client without an app account is sent to create one
// first; once they have it (they say so here, or José ticks it) it goes
// straight into the app.
export default function AppCard({ settings, appUrl, ready: initial }: { settings: PortalSettings; appUrl: string; ready: boolean }) {
  const [ready, setReady] = useState(initial || !settings.signupUrl)
  const app = settings.appName

  async function haveAccount() {
    setReady(true)
    await fetch('/api/portal/app-ready', { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="pt-box pt-app">
      <h2><span className="ic"><Phone /></span>{ready ? `Tu plan en ${app}` : `Crea tu cuenta en ${app}`}</h2>
      <p className="lead">
        {ready
          ? `Tus entrenamientos, tu nutrición y tu progreso están en ${app}. Entra con el email con el que te registraste.`
          : `Ahí recibirás tu plan de entrenamiento y nutrición. Crea tu cuenta con el mismo email que usas aquí; tardas un minuto.`}
      </p>
      <div className="row">
        {ready ? (
          <>
            {appUrl && <a className="pt-btn white" href={appUrl} target="_blank" rel="noopener">Abrir {app} →</a>}
            {settings.iosUrl && <a className="pt-btn glass" href={settings.iosUrl} target="_blank" rel="noopener">App Store</a>}
            {settings.androidUrl && <a className="pt-btn glass" href={settings.androidUrl} target="_blank" rel="noopener">Google Play</a>}
          </>
        ) : (
          <>
            <a className="pt-btn white" href={settings.signupUrl} target="_blank" rel="noopener">Crear mi cuenta →</a>
            <button className="pt-btn glass" type="button" onClick={() => void haveAccount()}>Ya tengo cuenta</button>
          </>
        )}
      </div>
    </div>
  )
}
