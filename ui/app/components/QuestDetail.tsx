'use client'

import { useState } from 'react'
import { Quest } from '../types'
import PanTiltControls from './PanTiltControls'
import StatusPill from './StatusPill'
import BountyBadge from './BountyBadge'

function relativeTime(date?: Date): string {
  if (!date) return 'unknown'
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)} mins ago`
  return `${Math.floor(secs / 3600)}h ago`
}

const divider = (
  <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '20px 0' }} />
)

export default function QuestDetail({
  quest,
  accentColor,
  showPanTilt,
  onClaim,
  onResolve,
}: {
  quest: Quest
  accentColor: string
  showPanTilt: boolean
  onClaim: (id: string) => void
  onResolve: (id: string) => void
}) {
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed'>(
    quest.status === 'claimed' ? 'claimed' : 'idle'
  )

  const isClaimed  = claimState === 'claimed'
  const isResolved = quest.status === 'resolved'

  function handleClaim() {
    if (claimState !== 'idle') return
    setClaimState('claiming')
    console.log('claim bounty')
    setTimeout(() => {
      setClaimState('claimed')
      onClaim(quest.id)
    }, 1500)
  }

  function handleResolve() {
    console.log('mark resolved')
    onResolve(quest.id)
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        minHeight: 0,
      }}
    >
      {/* Left: identity + metadata */}
      <div
        style={{
          flex: 1,
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* accent stripe */}
        <div style={{ width: 48, height: 4, background: accentColor, marginBottom: 20 }} />

        <h1
          style={{
            fontFamily: '"Arial Black", Inter, system-ui',
            fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 52px)',
            textTransform: 'uppercase',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          {quest.name}
        </h1>

        {quest.description && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 480, lineHeight: 1.6 }}>
            {quest.description}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', width: 56 }}>STATUS</span>
            <StatusPill status={quest.status} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', width: 56 }}>BOUNTY</span>
            <BountyBadge amount={quest.bounty} resolved={isResolved} large />
          </div>

          {quest.postedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', width: 56 }}>POSTED</span>
              <span style={{ fontSize: 14 }}>{relativeTime(quest.postedAt)}</span>
            </div>
          )}

          {quest.blockNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', width: 56 }}>BLOCK</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                #{quest.blockNumber}
              </span>
            </div>
          )}

          {quest.operatorAddress && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', width: 56 }}>OP</span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
                {quest.operatorAddress.slice(0, 6)}…{quest.operatorAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div
        style={{
          width: 320,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        {/* Claim */}
        {!isResolved && (
          <>
            <button
              onClick={handleClaim}
              disabled={claimState !== 'idle'}
              style={{
                width: '100%',
                padding: '16px',
                background: isClaimed ? 'rgba(255,255,255,0.25)' : '#ffffff',
                color: '#000000',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.1em',
                cursor: claimState === 'idle' ? 'pointer' : 'default',
                fontFamily: 'inherit',
                opacity: claimState === 'claiming' ? 0.6 : 1,
              }}
            >
              {claimState === 'idle'    && 'CLAIM & ASSIST'}
              {claimState === 'claiming' && 'CLAIMING...'}
              {claimState === 'claimed'  && 'CLAIMED'}
            </button>
            {divider}
          </>
        )}

        {showPanTilt && (
          <>
            <PanTiltControls disabled={!isClaimed && !isResolved} />
            {divider}
          </>
        )}

        <button
          onClick={handleResolve}
          disabled={!isClaimed && !isResolved}
          style={{
            width: '100%',
            padding: '16px',
            background: '#000000',
            color: isResolved ? '#00ff00' : '#ffffff',
            border: `2px solid ${isResolved ? '#00ff00' : '#ffffff'}`,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.1em',
            cursor: (isClaimed || isResolved) ? 'pointer' : 'default',
            opacity: (!isClaimed && !isResolved) ? 0.3 : 1,
            pointerEvents: (!isClaimed && !isResolved) ? 'none' : 'auto',
            fontFamily: 'inherit',
          }}
        >
          {isResolved ? '✓ RESOLVED' : 'MARK RESOLVED'}
        </button>
      </div>
    </div>
  )
}
