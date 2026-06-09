'use client'

import { QuestStatus } from '../types'

export default function StatusPill({ status }: { status: QuestStatus }) {
  const map: Record<QuestStatus, { label: string; bg: string; color: string }> = {
    available: { label: 'STUCK',    bg: '#ff0000', color: '#ffffff' },
    claimed:   { label: 'CLAIMED',  bg: '#ffffff', color: '#000000' },
    resolved:  { label: 'RESOLVED', bg: '#00ff00', color: '#000000' },
  }
  const { label, bg, color } = map[status]
  return (
    <span
      style={{
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 12,
        padding: '3px 8px',
        letterSpacing: '0.08em',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}
