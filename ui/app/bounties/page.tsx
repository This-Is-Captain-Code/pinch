'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Quest, BOUNTIES } from '../types'
import { fetchQuests, claimBounty, apiConfigured } from '../lib/api'
import Header from '../components/Header'
import QuestGrid from '../components/QuestGrid'

const WEBXR_URL = process.env.NEXT_PUBLIC_WEBXR_URL || 'https://openxr-ashen.vercel.app'

export default function BountiesPage() {
  const [quests, setQuests] = useState<Quest[]>(BOUNTIES)
  const [vrMode, setVrMode] = useState(false)
  const { address } = useAccount() // connected wallet = where the operator gets paid

  // Click a bounty -> register the operator's wallet (claim), then hand them
  // the WebXR teleop page. Steering past the obstacle clears the view, which
  // auto-pays this wallet on Monad.
  async function startTeleop(q: Quest) {
    try { if (apiConfigured && address) await claimBounty(q.id, address) }
    catch (e) { console.error('claim failed', e) }
    window.location.href = WEBXR_URL
  }

  // Pull live bounties from the agent server and merge them over the mock
  // backdrop by name — the real stackchan cell reflects live status/operator,
  // the other robots stay as demo placeholders. No-ops without the API URL.
  useEffect(() => {
    if (!apiConfigured) return
    let alive = true
    const load = async () => {
      try {
        const live = await fetchQuests()
        if (!alive || live.length === 0) return
        const byName = new Map(live.map((q) => [q.name, q]))
        setQuests(BOUNTIES.map((m) => {
          const l = byName.get(m.name)
          return l ? { ...m, ...l, imageUrl: l.imageUrl || m.imageUrl } : m
        }))
      } catch { /* keep last good state */ }
    }
    load()
    const t = setInterval(load, 3000)
    return () => { alive = false; clearInterval(t) }
  }, [])

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
        <QuestGrid quests={activeQuests} accentColor="#ff0000" vrMode={vrMode} onCellClick={startTeleop} />
      </div>
    </div>
  )
}
