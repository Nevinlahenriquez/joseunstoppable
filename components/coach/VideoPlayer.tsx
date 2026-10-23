'use client'

import { useEffect, useRef, useState } from 'react'

function embedFor(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol)) return null
    if (/youtu\.be$/.test(u.hostname)) return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0&playsinline=1`
    if (/youtube\.com$/.test(u.hostname)) {
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` : null
    }
    if (/vimeo\.com$/.test(u.hostname)) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch { /* not a url */ }
  return null
}

/**
 * Plays a Bunny HLS playlist, an mp4, or a YouTube/Vimeo link. hls.js only
 * loads when an HLS video is actually shown; Safari plays HLS natively.
 */
export default function VideoPlayer({ url, poster, portrait, loop = true }: { url: string; poster?: string; portrait?: boolean; loop?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const embed = embedFor(url)
  const isHls = /\.m3u8(\?|$)/.test(url)

  useEffect(() => {
    const v = ref.current
    if (!v || embed) return
    let destroy: (() => void) | undefined
    if (isHls && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) { setFailed(true); return }
        const h = new Hls({ maxBufferLength: 20 })
        h.loadSource(url)
        h.attachMedia(v)
        h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setFailed(true) })
        destroy = () => h.destroy()
      })
    } else {
      v.src = url
    }
    return () => destroy?.()
  }, [url, embed, isHls])

  const box: React.CSSProperties = {
    width: '100%', aspectRatio: portrait ? '9 / 16' : '16 / 9', maxHeight: portrait ? '70vh' : undefined,
    background: '#06204F', borderRadius: 18, overflow: 'hidden', margin: '0 auto', display: 'block',
  }
  if (embed) return <iframe src={embed} title="Vídeo" style={{ ...box, border: 0 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
  if (failed) return <div style={{ ...box, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14 }}>El vídeo no se puede reproducir aquí</div>
  return <video ref={ref} poster={poster} controls playsInline muted loop={loop} preload="metadata" style={{ ...box, objectFit: 'contain' }} />
}
