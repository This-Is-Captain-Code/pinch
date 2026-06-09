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
  imageUrl?: string
  iconUrl?: string
}

export const BOUNTIES: Quest[] = [
  { id: 'stackchan',       name: 'stackchan',            status: 'available', bounty: 0.10, postedAt: new Date(Date.now() - 2  * 60 * 1000), blockNumber: 4821093, imageUrl: 'https://shop.m5stack.com/cdn/shop/files/1_29c1c66c-6170-4270-ba77-7d3bf4793c7b_1200x1200.webp' },
  { id: 'unitree-g1',      name: 'unitree g1',           status: 'available', bounty: 0.20, postedAt: new Date(Date.now() - 5  * 60 * 1000), blockNumber: 4821051, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Unitree_G1.jpg' },
  { id: 'roomba',          name: 'roomba',               status: 'available', bounty: 0.30, postedAt: new Date(Date.now() - 8  * 60 * 1000), blockNumber: 4821010, imageUrl: 'https://images.unsplash.com/photo-1558317374-24793bc9f2fb?w=400&h=300&fit=crop' },
  { id: 'boston-dynamics', name: 'boston dynamics spot', status: 'claimed',   bounty: 0.40, postedAt: new Date(Date.now() - 10 * 60 * 1000), blockNumber: 4820999, operatorAddress: '0xABCD1234DEAD5678', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Spot_by_Boston_Dynamics.jpg' },
  { id: 'figure',          name: 'figure',               status: 'available', bounty: 0.50, postedAt: new Date(Date.now() - 1  * 60 * 1000), blockNumber: 4821100, imageUrl: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=400&h=300&fit=crop' },
  { id: '1x',              name: '1x',                   status: 'resolved',  bounty: 0.60, postedAt: new Date(Date.now() - 30 * 60 * 1000), blockNumber: 4820800, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Optimus_Tesla.jpg' },
]

export const SIDE_QUESTS: Quest[] = [
  { id: 'clean-room',      name: 'clean room',           status: 'available', bounty: 0.10, description: 'Tidy up the living area and vacuum floors.',  iconUrl: 'https://api.iconify.design/mdi/broom.svg?color=%23ffffff&width=120' },
  { id: 'water-plants',    name: 'watering plants',      status: 'available', bounty: 0.20, description: 'Water all indoor plants in the office.',        iconUrl: 'https://api.iconify.design/mdi/watering-can.svg?color=%23ffffff&width=120' },
  { id: 'buy-milk',        name: 'buying milk',          status: 'available', bounty: 0.30, description: 'Pick up 2L whole milk from the store.',         iconUrl: 'https://api.iconify.design/mdi/bottle-tonic-outline.svg?color=%23ffffff&width=120' },
  { id: 'clear-garbage',   name: 'clear garbage',        status: 'claimed',   bounty: 0.40, description: 'Take out all bins to the curb.',                iconUrl: 'https://api.iconify.design/mdi/trash-can-outline.svg?color=%23ffffff&width=120', operatorAddress: '0xDEAD5678ABCD1234' },
  { id: 'walk-mile',       name: 'walk half a mile',     status: 'available', bounty: 0.50, description: 'Complete a 0.5 mile walk route.',               iconUrl: 'https://api.iconify.design/mdi/walk.svg?color=%23ffffff&width=120' },
  { id: 'watch-tv',        name: 'watch tv for 10 mins', status: 'resolved',  bounty: 0.60, description: 'Watch 10 minutes of the briefing video.',       iconUrl: 'https://api.iconify.design/mdi/television-play.svg?color=%23ffffff&width=120' },
]
