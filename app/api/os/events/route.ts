import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/auth'
import type { CrmEvent } from '@/lib/event-types'

export const dynamic = 'force-dynamic'

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = serverSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('id, data')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const events = (data ?? [])
    .map(row => {
      try { return JSON.parse(row.data) as CrmEvent }
      catch { return null }
    })
    .filter((e): e is CrmEvent => Boolean(e))

  return NextResponse.json({ events })
}
