'use client'

import { useEffect, useState } from 'react'

export default function BountyBadge({
  amount,
  resolved,
  large,
}: {
  amount: number
  resolved?: boolean
  large?: boolean
}) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (amount === 0) { setDisplayed(0); return }
    const steps = 20
    const step = amount / steps
    let current = 0
    const id = setInterval(() => {
      current += step
      if (current >= amount) { setDisplayed(amount); clearInterval(id) }
      else setDisplayed(current)
    }, 400 / steps)
    return () => clearInterval(id)
  }, [amount])

  const formatted = displayed.toFixed(2)

  if (resolved) {
    return (
      <span style={{ fontSize: large ? 28 : 21, color: '#00ff00', fontWeight: 700 }}>
        ✓ paid
      </span>
    )
  }

  return (
    <span
      className="bounty-mount"
      style={{ fontSize: large ? 28 : 21, fontWeight: large ? 900 : 400 }}
    >
      {formatted} MON
    </span>
  )
}
