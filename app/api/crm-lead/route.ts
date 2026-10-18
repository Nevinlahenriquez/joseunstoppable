import { NextRequest, NextResponse } from 'next/server'
import { detectSpam, SPAM_REJECTION } from '@/lib/anti-spam'
import { SPAM_TAG, leadVerdict } from '@/lib/apply-guard'
import { funnelIdFromPath, recordFunnelLead } from '@/lib/funnel-log'
import { CHANNEL_TAGS } from '@/lib/lead-attribution'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))

  if (detectSpam(b).spam) {
    return NextResponse.json(SPAM_REJECTION.body, { status: SPAM_REJECTION.status })
  }

  const { name, email, whatsapp, company, website, social, role, companySize, goal, score, source, tags, notes: extraNotes, location, currentState, desiredOutcome, budget, visitorId, pageUrl, referrer, countedByCaller } = b
  if (!name && !email && !whatsapp) return NextResponse.json({ error: 'missing contact' }, { status: 400 })

  const verdict = leadVerdict({ name, business: company, email }, b)
  const taggedByCaller = Array.isArray(tags) && tags.includes(SPAM_TAG)
  const isSpam = taggedByCaller || verdict.level === 'spam'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ ok: true, skipped: 'no supabase' })

  const now = new Date().toISOString()
  const summaryParts = [
    source ? `Origen: ${source}` : null,
    score ? `Puntuación: ${score}` : null,
    companySize ? `Tamaño: ${companySize}` : null,
    goal ? `Objetivo: ${goal}` : null,
  ].filter(Boolean)
  const activity = [{ id: 'a' + uid(), ts: now, type: 'note', text: 'Lead nuevo, ' + (summaryParts.join(' · ') || 'desde la web') }]

  const row = {
    id: 'lead-' + uid(),
    lead_id: null,
    client_name: name || 'Unknown',
    client_email: email || '',
    client_company: company || null,
    stage: 'lead',
    value: 0,
    currency: 'EUR',
    service: goal || null,
    notes: [website ? `Web: ${website}` : null, social ? `Social: ${social}` : null, role ? `Rol: ${role}` : null, extraNotes || null].filter(Boolean).join('\n') || null,
    created_at: now,
    updated_at: now,
    client_phone: whatsapp || null,
    client_website: website || null,
    client_role: role || null,
    location: location || null,
    instagram: social || null,
    priority: null,
    next_step: 'Contactar, lead nuevo',
    next_step_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    current_state: currentState || null,
    desired_outcome: desiredOutcome || goal || null,
    goals: null,
    blockers: null,
    budget: budget || null,
    activity,
    tags: (() => {
      const base = Array.isArray(tags) ? [...tags] : []
      if (isSpam && !base.includes(SPAM_TAG)) base.push(SPAM_TAG)
      return base
    })(),
    revenue_type: null,
    retainer_months: null,
    close_date: null,
    organization: company || null,
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key)

    let existingId: string | null = null
    let existingTags: string[] = []
    let existingNotes: string | null = null
    if (email) {
      const r = await sb.from('deals').select('id, tags, notes').eq('client_email', email).limit(1)
      existingId = r.data?.[0]?.id ?? null
      existingTags = (r.data?.[0]?.tags as string[] | null) ?? []
      existingNotes = (r.data?.[0]?.notes as string | null) ?? null
    }
    if (!existingId && whatsapp) {
      const r = await sb.from('deals').select('id, tags, notes').eq('client_phone', whatsapp).limit(1)
      existingId = r.data?.[0]?.id ?? null
      existingTags = (r.data?.[0]?.tags as string[] | null) ?? []
      existingNotes = (r.data?.[0]?.notes as string | null) ?? null
    }
    // Tags only ever grow, and the FIRST channel stays: a client who came from
    // an ad and later writes in directly is still an ad client.
    const mergedTags = (() => {
      const hadChannel = existingTags.some(t => (CHANNEL_TAGS as readonly string[]).includes(t))
      const incoming = row.tags.filter(t => !(hadChannel && (CHANNEL_TAGS as readonly string[]).includes(t)))
      return Array.from(new Set([...existingTags, ...incoming]))
    })()
    const mergedNotes = [existingNotes, row.notes].filter(Boolean).join('\n\n') || null

    if (existingId) {
      const { error } = await sb.from('deals').update({
        client_name: row.client_name, client_company: row.client_company, client_phone: row.client_phone,
        client_website: row.client_website, client_role: row.client_role, instagram: row.instagram,
        service: row.service, notes: mergedNotes, desired_outcome: row.desired_outcome,
        current_state: row.current_state, location: row.location, budget: row.budget,
        organization: row.organization, tags: mergedTags, next_step: row.next_step,
        next_step_date: row.next_step_date, updated_at: now,
      }).eq('id', existingId)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
      return NextResponse.json({ ok: true, id: existingId, updated: true })
    }

    const { error } = await sb.from('deals').insert(row)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 })

    if (!isSpam && !countedByCaller) {
      await recordFunnelLead({
        funnelId: funnelIdFromPath(pageUrl || req.headers.get('referer'), source),
        visitorId, path: pageUrl, referrer,
      })
    }
    return NextResponse.json({ ok: true, id: row.id })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 })
  }
}
