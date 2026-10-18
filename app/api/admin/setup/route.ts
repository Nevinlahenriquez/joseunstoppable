import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import { schemaStatements, SCHEMA_TABLES } from '@/lib/db-schema'

export const runtime = 'nodejs'
export const maxDuration = 60

function connString(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || null
}

// GET: is the database ready? Answered through the Supabase API so it works
// even before the connection string is set.
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ ok: true, ready: false, reason: 'Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.', canRun: !!connString() })
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, key)
  const missing: string[] = []
  for (const t of SCHEMA_TABLES) {
    const { error } = await sb.from(t).select('id').limit(1)
    if (error) missing.push(t)
  }
  return NextResponse.json({ ok: true, ready: missing.length === 0, missing, canRun: !!connString() })
}

// POST: create or update every table. Idempotent.
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const cs = connString()
  if (!cs) {
    return NextResponse.json({ ok: false, error: 'Falta DATABASE_URL (la cadena de conexión de Supabase, en Project Settings > Database).' }, { status: 400 })
  }
  const { Client } = await import('pg')
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    for (const sql of schemaStatements()) await client.query(sql)
    // Ask PostgREST to see the new tables at once.
    await client.query(`notify pgrst, 'reload schema'`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'setup failed' }, { status: 500 })
  } finally {
    await client.end().catch(() => {})
  }
}
