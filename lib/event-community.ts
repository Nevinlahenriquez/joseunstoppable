// The registrant group link (e.g. a WhatsApp community), set per deployment.
export const EVENT_WHATSAPP_URL = process.env.NEXT_PUBLIC_EVENT_WHATSAPP_URL || ''
export function isCommunityLinkSet(): boolean { return /^https:\/\//.test(EVENT_WHATSAPP_URL) }
export const COMMUNITY_CTA = 'Únete al grupo'
export const COMMUNITY_BODY = 'Únete al grupo del evento para recibir el enlace y los avisos.'
