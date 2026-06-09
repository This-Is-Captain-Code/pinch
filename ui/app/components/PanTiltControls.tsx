'use client'

import { useState } from 'react'
import { control } from '../lib/api'

type Direction = 'left' | 'right' | 'up' | 'down'

const STEP = 15 // degrees per press

function Arrow({
  dir,
  disabled,
  onPress,
}: {
  dir: Direction
  disabled: boolean
  onPress: (d: Direction) => void
}) {
  const [pressed, setPressed] = useState(false)
  const labels: Record<Direction, string> = { left: '←', right: '→', up: '↑', down: '↓' }

  return (
    <button
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => { setPressed(false); onPress(dir) }}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => { setPressed(false); onPress(dir) }}
      style={{
        width: 64,
        height: 64,
        background: pressed ? '#000000' : '#ffffff',
        color: pressed ? '#ffffff' : '#000000',
        border: '2px solid #ffffff',
        fontSize: 24,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 80ms',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {labels[dir]}
    </button>
  )
}

export default function PanTiltControls({ disabled }: { disabled: boolean }) {
  const [pan, setPan] = useState(90)   // servo degrees, 0-180, centre 90
  const [tilt, setTilt] = useState(90)

  function handle(dir: Direction) {
    let p = pan, t = tilt
    if (dir === 'left')  p = Math.max(0, pan - STEP)
    if (dir === 'right') p = Math.min(180, pan + STEP)
    if (dir === 'up')    t = Math.min(180, tilt + STEP)
    if (dir === 'down')  t = Math.max(0, tilt - STEP)
    setPan(p); setTilt(t)
    control(p, t).catch(() => {}) // -> server -> MQTT cmd -> robot motor
  }

  return (
    <div>
      <p
        style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 10,
          fontWeight: 700,
        }}
      >
        PAN / TILT CONTROLS
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: 4 }}>
        <div />
        <Arrow dir="up"    disabled={disabled} onPress={handle} />
        <div />
        <Arrow dir="left"  disabled={disabled} onPress={handle} />
        <div />
        <Arrow dir="right" disabled={disabled} onPress={handle} />
        <div />
        <Arrow dir="down"  disabled={disabled} onPress={handle} />
        <div />
      </div>
      {disabled && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
          claim to unlock controls
        </p>
      )}
    </div>
  )
}
