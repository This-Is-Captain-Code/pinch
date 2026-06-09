'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [hoverBounty, setHoverBounty] = useState(false)
  const [hoverQuest, setHoverQuest] = useState(false)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* header */}
      <header style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
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
      </header>

      {/* main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: 32,
          }}
        >
          robot fleet · monad testnet
        </p>

        <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 760 }}>
          <Link
            href="/bounties"
            style={{ flex: 1, textDecoration: 'none' }}
            onMouseEnter={() => setHoverBounty(true)}
            onMouseLeave={() => setHoverBounty(false)}
          >
            <div
              style={{
                background: hoverBounty ? '#ff0000' : '#000000',
                border: '2px solid #ff0000',
                color: hoverBounty ? '#000000' : '#ffffff',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'background 150ms, color 150ms',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: '"Arial Black", Inter, system-ui',
                  fontWeight: 900,
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                bounties
              </span>
              <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>
                stuck robots · claim &amp; unstick · earn MON
              </span>
            </div>
          </Link>

          <Link
            href="/side-quests"
            style={{ flex: 1, textDecoration: 'none' }}
            onMouseEnter={() => setHoverQuest(true)}
            onMouseLeave={() => setHoverQuest(false)}
          >
            <div
              style={{
                background: hoverQuest ? '#3333ee' : '#000000',
                border: '2px solid #3333ee',
                color: '#ffffff',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                transition: 'background 150ms',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: '"Arial Black", Inter, system-ui',
                  fontWeight: 900,
                  fontSize: 'clamp(28px, 4vw, 48px)',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                side quests
              </span>
              <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>
                chores &amp; tasks · complete &amp; earn MON
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
