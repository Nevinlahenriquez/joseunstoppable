'use client'

import { useState } from 'react'

// A click-to-play video slot. With no link yet it shows the poster and a
// "coming soon" tag; once `src` is set (YouTube, Vimeo or an .mp4) the
// player replaces the poster on click.
function embedUrl(src: string): { kind: 'iframe' | 'video'; url: string } {
  const yt = src.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)
  if (yt) return { kind: 'iframe', url: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0` }
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'iframe', url: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` }
  return { kind: 'video', url: src }
}

export default function VideoFrame({ src, label, className, children }: {
  src: string
  label: string
  className?: string
  children: React.ReactNode
}) {
  const [playing, setPlaying] = useState(false)
  const player = playing && src ? embedUrl(src) : null
  return (
    <div className={`h-vframe${src ? ' ready' : ''}${className ? ' ' + className : ''}`}>
      {player ? (
        player.kind === 'iframe'
          ? <iframe src={player.url} title={label} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          : <video src={player.url} controls autoPlay playsInline />
      ) : (
        <button type="button" className="h-vbtn" aria-label={label} disabled={!src} onClick={() => setPlaying(true)}>
          {children}
          <span className="h-vplay" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
          </span>
        </button>
      )}
    </div>
  )
}
