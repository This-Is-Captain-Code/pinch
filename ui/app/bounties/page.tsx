'use client'

import { useEffect, useState } from 'react'
import { Quest, BOUNTIES } from '../types'
import Header from '../components/Header'
import QuestGrid from '../components/QuestGrid'

export default function BountiesPage() {
  const [quests] = useState<Quest[]>(BOUNTIES)
  const [vrMode, setVrMode] = useState(false)

  useEffect(() => {
    const check = () => { if (window.innerWidth < 768) setVrMode(true) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!vrMode) return
    function onMotion(e: DeviceMotionEvent) {
      const tiltX = e.accelerationIncludingGravity?.x ?? 0
      const tiltY = e.accelerationIncludingGravity?.y ?? 0
      const grid = document.getElementById('quest-grid')
      if (grid) grid.style.transform = `translate(${tiltX * 2}px, ${tiltY * 2}px)`
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [vrMode])

  useEffect(() => {
    document.body.classList.toggle('vr-mode', vrMode)
  }, [vrMode])

  const activeQuests = quests.filter((q) => q.status !== 'resolved')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: vrMode ? 'transparent' : '#000000' }}>
      <Header backHref="/" vrMode={vrMode} onToggleVR={() => setVrMode((v) => !v)} />
      <div id="quest-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <QuestGrid quests={activeQuests} accentColor="#ff0000" vrMode={vrMode} />
      </div>
    </div>
  )
}
