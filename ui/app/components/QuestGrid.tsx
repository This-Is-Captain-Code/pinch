'use client'

import { Quest } from '../types'
import QuestCell from './QuestCell'

export default function QuestGrid({
  quests,
  accentColor,
  vrMode,
  onCellClick,
}: {
  quests: Quest[]
  accentColor: string
  vrMode: boolean
  onCellClick?: (quest: Quest) => void // bounties pass this (-> teleop); quests don't
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 4,
        padding: 4,
        flex: 1,
      }}
    >
      {quests.map((quest) => (
        <QuestCell
          key={quest.id}
          quest={quest}
          accentColor={accentColor}
          vrMode={vrMode}
          onClick={onCellClick ? () => onCellClick(quest) : undefined}
        />
      ))}
    </div>
  )
}
