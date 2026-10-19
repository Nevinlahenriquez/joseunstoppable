// Small pieces shared by server and client components on the public pages.

export function T({ es, en }: { es: React.ReactNode; en: React.ReactNode }) {
  return <><span data-es="">{es}</span><span data-en="">{en}</span></>
}

export function Tick() {
  return (
    <span className="tick" aria-hidden="true">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5.1" /></svg>
    </span>
  )
}

export const WHATSAPP = '34649764886'
