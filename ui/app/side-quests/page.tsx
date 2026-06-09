'use client'

import { useEffect, useState } from 'react'
import { Quest, SIDE_QUESTS } from '../types'
import Header from '../components/Header'
import QuestGrid from '../components/QuestGrid'

export default function SideQuestsPage() {
  const [quests] = useState<Quest[]>(SIDE_QUESTS)
  const [vrMode, setVrMode] = useState(false)

  useEffect(() => {
    const check = () => { if (window.innerWidth < 768) setVrMode(true) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('vr-mode', vrMode)
  }, [vrMode])

  const activeQuests = quests.filter((q) => q.status !== 'resolved')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: vrMode ? 'transparent' : '#000000' }}>
      <Header backHref="/" vrMode={vrMode} onToggleVR={() => setVrMode((v) => !v)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <QuestGrid quests={activeQuests} accentColor="#3333ee" vrMode={vrMode} />
      </div>
    </div>
  )
}
