import type { CrmEvent as Event } from './event-types'

// Events live in the database. Nothing is promoted from code.
export const FEATURED_EVENT = { title: '', format: '', href: '' }
export function featuredEventIsUpcoming(): boolean { return false }
export function featuredEventDateLabel(): string { return '' }
export function upcomingFeaturedRecords(): Event[] { return [] }
