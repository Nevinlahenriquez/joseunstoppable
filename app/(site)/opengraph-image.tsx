import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

// The preview card when a page is shared on WhatsApp, Instagram, Facebook or
// in search. Built once at deploy time in the homepage colours.
export const alt = 'José Unstoppable · Vuelve a gustarte en 90 días'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const photo = await readFile(join(process.cwd(), 'public/images/jose.jpg'))
  const src = `data:image/jpeg;base64,${photo.toString('base64')}`
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F1F8FD' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0E71AC', letterSpacing: 2, textTransform: 'uppercase' }}>Coaching 1:1 online</div>
          <div style={{ fontSize: 68, fontWeight: 800, color: '#0C2A43', lineHeight: 1.05, marginTop: 20 }}>Vuelve a gustarte en 90 días.</div>
          <div style={{ fontSize: 28, color: '#344A5E', marginTop: 24, lineHeight: 1.3 }}>3 horas de entreno a la semana, nutrición que encaja en tu vida y José a tu lado.</div>
          <div style={{ display: 'flex', marginTop: 36, fontSize: 30, fontWeight: 800, color: '#0C2A43' }}>
            José <span style={{ color: '#2A98D6', marginLeft: 10 }}>Unstoppable</span>
          </div>
        </div>
        <img src={src} alt="" width={480} height={630} style={{ objectFit: 'cover', objectPosition: 'top' }} />
      </div>
    ),
    size,
  )
}
