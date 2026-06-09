export type QuestStatus = 'available' | 'claimed' | 'resolved'

export type Quest = {
  id: string
  name: string
  status: QuestStatus
  bounty: number
  postedAt?: Date
  blockNumber?: number
  operatorAddress?: string
  description?: string
}

export const BOUNTIES: Quest[] = [
  { id: 'stackchan',       name: 'stackchan',            status: 'available', bounty: 0.10, postedAt: new Date(Date.now() - 2  * 60 * 1000), blockNumber: 4821093 },
  { id: 'unitree-g1',      name: 'unitree g1',           status: 'available', bounty: 0.20, postedAt: new Date(Date.now() - 5  * 60 * 1000), blockNumber: 4821051 },
  { id: 'roomba',          name: 'roomba',               status: 'available', bounty: 0.30, postedAt: new Date(Date.now() - 8  * 60 * 1000), blockNumber: 4821010 },
  { id: 'boston-dynamics', name: 'boston dynamics spot', status: 'claimed',   bounty: 0.40, postedAt: new Date(Date.now() - 10 * 60 * 1000), blockNumber: 4820999, operatorAddress: '0xABCD1234DEAD5678' },
  { id: 'figure',          name: 'figure',               status: 'available', bounty: 0.50, postedAt: new Date(Date.now() - 1  * 60 * 1000), blockNumber: 4821100 },
  { id: '1x',              name: '1x',                   status: 'resolved',  bounty: 0.60, postedAt: new Date(Date.now() - 30 * 60 * 1000), blockNumber: 4820800 },
]

export const SIDE_QUESTS: Quest[] = [
  { id: 'clean-room',      name: 'clean room',           status: 'available', bounty: 0.10, description: 'Tidy up the living area and vacuum floors.' },
  { id: 'water-plants',    name: 'watering plants',      status: 'available', bounty: 0.20, description: 'Water all indoor plants in the office.' },
  { id: 'buy-milk',        name: 'buying milk',          status: 'available', bounty: 0.30, description: 'Pick up 2L whole milk from the store.' },
  { id: 'clear-garbage',   name: 'clear garbage',        status: 'claimed',   bounty: 0.40, description: 'Take out all bins to the curb.', operatorAddress: '0xDEAD5678ABCD1234' },
  { id: 'walk-mile',       name: 'walk half a mile',     status: 'available', bounty: 0.50, description: 'Complete a 0.5 mile walk route.' },
  { id: 'watch-tv',        name: 'watch tv for 10 mins', status: 'resolved',  bounty: 0.60, description: 'Watch 10 minutes of the briefing video.' },
]
