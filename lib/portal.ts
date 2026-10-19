// The client portal (/portal): shared names and the settings José edits in
// /admin/portal. Safe to import from client components.

export const PORTAL_COOKIE = 'jose_portal'
// Clients stay signed in this long on the device where they opened their link.
export const PORTAL_SESSION_DAYS = 60

export const PORTAL_SETTING = 'portal'

// Harbiz is where clients follow their training and nutrition plan.
export type PortalSettings = {
  appName: string
  // The sign-up page a new client uses to create their account in the app.
  signupUrl: string
  appUrl: string
  iosUrl: string
  androidUrl: string
  note: string
}

export const DEFAULT_PORTAL: PortalSettings = {
  appName: 'Harbiz',
  signupUrl: 'https://app.harbiz.io/checkout-form/jose43?lang=es&product=invitation',
  appUrl: 'https://harbiz.io',
  iosUrl: 'https://apps.apple.com/app/harbiz/id1396095665',
  androidUrl: 'https://play.google.com/store/search?q=Harbiz&c=apps',
  note: '',
}

export type PortalAccess = {
  id: string
  token: string
  email: string
  name: string | null
  deal_id: string | null
  active: boolean
  app_url: string | null
  // True once the client has their app account: the portal then skips the sign-up step.
  app_ready: boolean | null
  invited_at: string | null
  last_login_at: string | null
  created_at: string
}

export type PortalMessage = {
  id: string
  email: string
  sender: 'client' | 'coach'
  body: string
  read_at: string | null
  created_at: string
}

export const portalPath = (token: string) => `/portal/${token}`
