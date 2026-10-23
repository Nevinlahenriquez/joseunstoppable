'use client'

import type { Store } from './types'

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  if (!json.ok) throw new Error(json.error || 'No se pudo guardar. Inténtalo de nuevo.')
  return json as T
}

/** Supabase, through /api/coach/*. The server decides what this session may touch. */
export const liveStore: Store = {
  mode: 'live',
  async list(table, filter) {
    const q = new URLSearchParams({ table })
    if (filter?.clientId !== undefined) q.set('clientId', filter.clientId === null ? 'null' : filter.clientId)
    const r = await call<{ rows: never[] }>(`/api/coach/rows?${q}`)
    return r.rows
  },
  async get(table, id) {
    const r = await call<{ rows: never[] }>(`/api/coach/rows?${new URLSearchParams({ table, id })}`)
    return r.rows[0] ?? null
  },
  async put(table, row) {
    await call('/api/coach/rows', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ table, row }) })
  },
  async remove(table, id) {
    await call(`/api/coach/rows?${new URLSearchParams({ table, id })}`, { method: 'DELETE' })
  },
  async upload(file, path) {
    const fd = new FormData()
    fd.set('file', file)
    fd.set('clientId', path)
    const r = await call<{ path: string }>('/api/coach/upload', { method: 'POST', body: fd })
    return r.path
  },
  async fileUrl(path) {
    return path.startsWith('data:') || path.startsWith('http') ? path : `/api/coach/file?path=${encodeURIComponent(path)}`
  },
}
