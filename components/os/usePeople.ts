'use client'
import { useEffect, useState } from 'react'
import { getPeople, type Person } from '@/lib/people'
import { hydrateFromSupabase } from '@/lib/crm-store'
import { hydrateEvents } from '@/lib/event-store'
import { hydrateContactSources } from '@/lib/contact-sources'

export function usePeople(): Person[] {
  const [people, setPeople] = useState<Person[]>([])
  useEffect(() => {
    let live = true
    const read = () => { if (live) setPeople(getPeople()) }
    void Promise.resolve().then(read)
    void Promise.allSettled([hydrateFromSupabase(), hydrateEvents(), hydrateContactSources()]).then(read)
    return () => { live = false }
  }, [])
  return people
}
