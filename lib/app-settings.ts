import { serviceDb } from '@/lib/os-supabase'

// One row per setting in `app_settings` (id, value jsonb). Server only.
export async function readSetting<T>(id: string, fallback: T): Promise<T> {
  const db = await serviceDb()
  if (!db) return fallback
  const { data, error } = await db.from('app_settings').select('value').eq('id', id).maybeSingle()
  if (error || !data) return fallback
  return { ...(fallback as object), ...(data.value as object) } as T
}

export async function writeSetting(id: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const db = await serviceDb()
  if (!db) return { ok: false, error: 'Falta SUPABASE_SERVICE_ROLE_KEY.' }
  const { error } = await db.from('app_settings').upsert({ id, value, updated_at: new Date().toISOString() })
  return error ? { ok: false, error: error.message } : { ok: true }
}
