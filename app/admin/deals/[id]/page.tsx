import { redirect } from 'next/navigation'

// Deal links (from contacts and timelines) open the board with that deal selected.
export default async function DealRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/deals?deal=${encodeURIComponent(id)}`)
}
