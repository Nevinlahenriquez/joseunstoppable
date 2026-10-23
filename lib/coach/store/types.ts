import type { TableName, Tables } from '../types'

export interface Session {
  role: 'coach' | 'client'
  coachId: string
  /** Set when role is client. */
  clientId?: string
  email: string
}

export interface Filter { coachId?: string; clientId?: string | null }

/**
 * ONE INTERFACE, TWO BACKENDS. `demo` keeps everything in this browser
 * (seeded with José's demo data) so the app can be clicked through without
 * any keys. `live` is Supabase. Screens only ever talk to this.
 */
export interface Store {
  mode: 'demo' | 'live'
  list<T extends TableName>(table: T, filter?: Filter): Promise<Tables[T][]>
  get<T extends TableName>(table: T, id: string): Promise<Tables[T] | null>
  put<T extends TableName>(table: T, row: Tables[T]): Promise<void>
  remove(table: TableName, id: string): Promise<void>
  /** Stores an image for a client (pass the client id); returns the path to save on the record. */
  upload(file: Blob, path: string): Promise<string>
  /** Turns a saved path into something an <img> can show. */
  fileUrl(path: string): Promise<string>
}
