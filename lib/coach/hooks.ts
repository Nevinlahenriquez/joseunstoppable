'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCoach } from './store'
import type { Store } from './store/types'

/** Loads once the store is ready, and again on reload(). Keeps the last data on refresh. */
export function useData<T>(load: (store: Store) => Promise<T>, deps: unknown[] = []) {
  const { store, ready } = useCoach()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loader = useRef(load)
  loader.current = load
  useEffect(() => {
    if (!ready) return
    let alive = true
    loader.current(store)
      .then(d => { if (alive) { setData(d); setError(null) } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'No se pudo cargar.') })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, store, tick, ...deps])
  const reload = useCallback(() => setTick(t => t + 1), [])
  return { data, error, loading: data === null && !error, reload, setData }
}
