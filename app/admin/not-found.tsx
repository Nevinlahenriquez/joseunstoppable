import Link from 'next/link'

export default function OsNotFound() {
  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <div className="os-card" style={{ padding: '36px 28px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: 'var(--os-accent)' }}>ERROR 404</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--os-text)', margin: '12px 0 8px' }}>This dashboard page does not exist</h1>
        <p style={{ fontSize: 14, color: 'var(--os-text-faint)', lineHeight: 1.6, margin: '0 0 22px' }}>
          The link is old or mistyped. Everything else in the dashboard works as normal.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin" className="os-btn os-btn-primary">Back to dashboard</Link>
          <Link href="/admin/events" className="os-btn" style={{ background: 'var(--os-card-alt)', color: 'var(--os-text)', border: '1px solid var(--os-line)' }}>Events</Link>
        </div>
      </div>
    </div>
  )
}
