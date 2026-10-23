'use client'

import { TABLE_NAMES, type TableName, type Tables } from '../types'
import type { Filter, Store } from './types'
import { buildSeed } from './seed'

const PREFIX = 'coachapp:v3:'
const TABLES = TABLE_NAMES

function read<T extends TableName>(t: T): Tables[T][] {
  try {
    const raw = localStorage.getItem(PREFIX + t)
    return raw ? (JSON.parse(raw) as Tables[T][]) : []
  } catch { return [] }
}

function write<T extends TableName>(t: T, rows: Tables[T][]) {
  try { localStorage.setItem(PREFIX + t, JSON.stringify(rows)) } catch (e) {
    throw new Error('This browser is out of space for the demo. Remove a few photos and try again.', { cause: e })
  }
}

export function ensureSeeded() {
  try {
    if (localStorage.getItem(PREFIX + 'seeded')) return
    const seed = buildSeed()
    for (const t of TABLES) write(t, seed[t] as never)
    localStorage.setItem(PREFIX + 'seeded', new Date().toISOString())
  } catch { /* private mode: the demo just starts empty */ }
}

export function resetDemo() {
  for (const t of TABLES) localStorage.removeItem(PREFIX + t)
  localStorage.removeItem(PREFIX + 'seeded')
  ensureSeeded()
}

function matches(row: { coachId?: string; clientId?: string | null }, f?: Filter): boolean {
  if (!f) return true
  if (f.coachId !== undefined && row.coachId !== f.coachId) return false
  if (f.clientId !== undefined && (row.clientId ?? null) !== f.clientId) return false
  return true
}

export const demoStore: Store = {
  mode: 'demo',
  async list(table, filter) {
    ensureSeeded()
    return read(table).filter(r => matches(r as never, filter))
  },
  async get(table, id) {
    ensureSeeded()
    return (read(table) as { id: string }[]).find(r => r.id === id) as never ?? null
  },
  async put(table, row) {
    const rows = read(table) as { id: string }[]
    const i = rows.findIndex(r => r.id === (row as { id: string }).id)
    if (i >= 0) rows[i] = row as never
    else rows.push(row as never)
    write(table, rows as never)
  },
  async remove(table, id) {
    write(table, (read(table) as { id: string }[]).filter(r => r.id !== id) as never)
  },
  async upload(file) {
    return await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(r.error)
      r.readAsDataURL(file)
    })
  },
  async fileUrl(path) { return path },
}
