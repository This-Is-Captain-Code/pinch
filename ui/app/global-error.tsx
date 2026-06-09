'use client'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html>
      <body style={{ background: '#000', color: '#fff', fontFamily: 'monospace', padding: 24 }}>
        <h2 style={{ color: '#ff0000', fontWeight: 900 }}>ERROR</h2>
        <p style={{ marginTop: 8, opacity: 0.6 }}>{error.message}</p>
        <button
          onClick={unstable_retry}
          style={{ marginTop: 16, background: '#fff', color: '#000', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
        >
          RETRY
        </button>
      </body>
    </html>
  )
}
