'use client'

import { useEffect, useState } from 'react'
import { FREE_CALLS_UNTIL } from '@/lib/home-content'

// "Free calls only until 31 October": checked in the visitor's browser so the
// notice disappears on its own once the date has passed, without a redeploy.
export default function FreeCallsNote({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const end = new Date(`${FREE_CALLS_UNTIL}T23:59:59+01:00`).getTime()
    const id = requestAnimationFrame(() => setOpen(Date.now() <= end))
    return () => cancelAnimationFrame(id)
  }, [])
  if (!open) return null
  const d = new Date(`${FREE_CALLS_UNTIL}T12:00:00Z`)
  const es = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  const en = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <p className={`free-calls${className ? ' ' + className : ''}`}>
      <span className="dot" aria-hidden="true" />
      <span data-es="">Llamadas gratuitas solo hasta el {es}</span>
      <span data-en="">Free calls only until {en}</span>
    </p>
  )
}
