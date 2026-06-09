'use client'

import { Quest } from '../types'
import BountyBadge from './BountyBadge'

export default function QuestCell({
  quest,
  accentColor,
  vrMode,
}: {
  quest: Quest
  accentColor: string
  vrMode: boolean
}) {
  const isClaimed = quest.status === 'claimed'

  const cellBg = quest.imageUrl
    ? '#111111'
    : isClaimed
    ? `color-mix(in srgb, ${accentColor} 50%, #000000)`
    : accentColor


  const pulseClass = accentColor === '#ff0000' ? 'cell-pulse-red' : 'cell-pulse-blue'
  const labelBg    = vrMode ? 'rgba(0,0,0,0.7)' : '#ffffff'
  const labelColor = vrMode ? '#ffffff' : '#000000'

  return (
    <div
      className={pulseClass}
      style={{
        aspectRatio: '4/3',
        background: cellBg,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* main area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {quest.imageUrl ? (
          <img
            src={quest.imageUrl}
            alt={quest.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: isClaimed ? 'brightness(0.55)' : 'none',
            }}
          />
        ) : quest.iconUrl ? (
          <img
            src={quest.iconUrl}
            alt={quest.name}
            style={{
              width: 96,
              height: 96,
              opacity: isClaimed ? 0.45 : 1,
            }}
          />
        ) : (
          <span
            style={{
              fontFamily: '"Arial Black", Inter, system-ui',
              fontWeight: 900,
              fontSize: 'clamp(14px, 2.5vw, 26px)',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            {quest.name}
          </span>
        )}

        {isClaimed && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: '#000000',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              letterSpacing: '0.08em',
            }}
          >
            CLAIMED
          </div>
        )}
      </div>

      {/* label bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '5px 8px',
          background: labelBg,
          color: labelColor,
          minHeight: 28,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 400, textTransform: 'lowercase' }}>
          {quest.name}
        </span>
        <BountyBadge amount={quest.bounty} />
      </div>
    </div>
  )
}
