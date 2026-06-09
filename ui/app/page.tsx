'use client'

import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Geist', system-ui, sans-serif",
      }}
    >
      {/* header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 28px',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist', system-ui, sans-serif",
            fontWeight: 500,
            fontSize: 22,
            color: '#ffffff',
            letterSpacing: '-0.03em',
          }}
        >
          pinch
        </span>

        {/* circle avatar / connect */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ConnectButton
            accountStatus="avatar"
            showBalance={false}
            chainStatus="none"
          />
        </div>
      </header>

      {/* two buttons */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          gap: 12,
          padding: '16px 28px 28px',
        }}
      >
        <Link href="/bounties" style={{ flex: 1, textDecoration: 'none' }}>
          <div
            style={{
              height: '100%',
              background: '#ffffff',
              borderRadius: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 120ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <span
              style={{
                fontFamily: "'Geist', system-ui, sans-serif",
                fontWeight: 500,
                fontSize: 48,
                color: '#000000',
                letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              bounties
            </span>
          </div>
        </Link>

        <Link href="/side-quests" style={{ flex: 1, textDecoration: 'none' }}>
          <div
            style={{
              height: '100%',
              background: '#ffffff',
              borderRadius: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'opacity 120ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <span
              style={{
                fontFamily: "'Geist', system-ui, sans-serif",
                fontWeight: 500,
                fontSize: 48,
                color: '#000000',
                letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              side quests
            </span>
          </div>
        </Link>
      </main>
    </div>
  )
}
