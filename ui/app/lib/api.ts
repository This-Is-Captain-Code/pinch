// Client for the stackchan bounty agent (the Render-hosted server in /server).
// Set NEXT_PUBLIC_API_URL to its base URL (e.g. https://stackchan-bounty-agent.onrender.com).
// When unset, helpers no-op / return empty so the UI falls back to mock data.
import type { Quest } from '../types'

const BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')
export const apiConfigured = BASE.length > 0

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json() as Promise<T>
}

// Server returns the Quest shape with postedAt as an ISO string.
type ServerQuest = Omit<Quest, 'postedAt'> & { postedAt?: string }

export async function fetchQuests(): Promise<Quest[]> {
  if (!apiConfigured) return []
  const raw = await j<ServerQuest[]>('/api/quests')
  return raw.map((q) => ({ ...q, postedAt: q.postedAt ? new Date(q.postedAt) : undefined }))
}

// A human takes the job — registers the wallet that gets paid.
export async function claimBounty(id: string, solver: string) {
  return j(`/api/bounties/${id}/claim`, { method: 'POST', body: JSON.stringify({ solver }) })
}

// Settle now (pays the claimed solver on Monad). Normally the robot triggers
// this itself via camera_clear, but the UI can force it.
export async function releaseBounty(id: string) {
  return j(`/api/bounties/${id}/release`, { method: 'POST' })
}

// Steer the robot's head (0-180 each). Server routes to the claimed device.
export async function control(pan: number, tilt: number, deviceHash?: string) {
  if (!apiConfigured) return
  return j('/api/control', { method: 'POST', body: JSON.stringify({ pan, tilt, deviceHash }) })
}
