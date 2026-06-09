'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

export default function Header({
  backHref,
  onBack,
  vrMode,
  onToggleVR,
}: {
  backHref?: string
  onBack?: () => void
  vrMode: boolean
  onToggleVR: () => void
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        background: vrMode ? 'rgba(0,0,0,0.6)' : '#000000',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {backHref && (
          <Link
            href={backHref}
            style={{ color: '#ffffff', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← back
          </Link>
        )}
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: 14, padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← back
          </button>
        )}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span
            style={{
              fontFamily: '"Arial Black", Inter, system-ui',
              fontWeight: 900,
              fontSize: 22,
              textTransform: 'uppercase',
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            pinch
          </span>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onToggleVR}
          style={{
            background: vrMode ? '#ffffff' : 'transparent',
            color: vrMode ? '#000000' : '#ffffff',
            border: '1px solid #ffffff',
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {vrMode ? 'EXIT VR' : 'VR'}
        </button>
        <ConnectButton accountStatus="avatar" showBalance={false} chainStatus="none" />
      </div>
    </header>
  )
}
