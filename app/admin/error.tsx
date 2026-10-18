'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const RELOAD_FLAG = 'ju_os_chunk_reload'

function isStaleBuild(error: Error) {
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(text)
}

export default function OsError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const stale = isStaleBuild(error)

  useEffect(() => {
    console.error('[os] page error:', error)
    if (!stale) return
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return
      sessionStorage.setItem(RELOAD_FLAG, '1')
      setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 30000)
    } catch {  }
    window.location.reload()
  }, [error, stale])

  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
      <div className="os-card" style={{ padding: '36px 28px' }}>
        <i className="ti ti-refresh-alert" style={{ fontSize: 34, color: 'var(--os-accent)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--os-text)', margin: '14px 0 8px' }}>
          {stale ? 'The dashboard was just updated' : 'This page hit a problem'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--os-text-faint)', lineHeight: 1.6, margin: '0 0 22px' }}>
          {stale
            ? 'A new version went live while this tab was open. Reload to get it. Nothing you saved is lost.'
            : 'Something on this page failed to load. Your data is safe. Try again, or go back to the dashboard.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="os-btn os-btn-primary" onClick={() => (stale ? window.location.reload() : unstable_retry())}>
            {stale ? 'Reload' : 'Try again'}
          </button>
          <Link href="/admin" className="os-btn" style={{ background: 'var(--os-card-alt)', color: 'var(--os-text)', border: '1px solid var(--os-line)' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
