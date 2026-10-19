'use client'

import { useSyncExternalStore } from 'react'
import { T } from '@/components/site/bits'

const UNITS = [
  { ms: 864e5, mod: Infinity, es: 'días', en: 'days' },
  { ms: 36e5, mod: 24, es: 'horas', en: 'hours' },
  { ms: 6e4, mod: 60, es: 'min', en: 'min' },
  { ms: 1e3, mod: 60, es: 'seg', en: 'sec' },
]

const subscribe = (tick: () => void) => {
  const t = setInterval(tick, 1000)
  return () => clearInterval(t)
}
const nowSecond = () => Math.floor(Date.now() / 1000) * 1000
// The server has no clock to tick, so it renders dashes and the browser fills them in.
const noClock = () => null

export default function Countdown({ startISO }: { startISO: string }) {
  const now = useSyncExternalStore(subscribe, nowSecond, noClock)
  const diff = now === null ? null : Math.max(0, new Date(startISO).getTime() - now)
  return (
    <div className="count">
      <span className="count-l"><T es="Empieza en" en="Starts in" /></span>
      <div className="count-g" role="timer" aria-live="off">
        {UNITS.map(u => (
          <div key={u.en} className="count-c">
            <b>{diff === null ? '--' : String(Math.floor(diff / u.ms) % u.mod).padStart(2, '0')}</b>
            <T es={u.es} en={u.en} />
          </div>
        ))}
      </div>
    </div>
  )
}
