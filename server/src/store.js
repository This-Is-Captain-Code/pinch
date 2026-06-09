// Tiny JSON-file-backed store for bounties. Enough for a demo; swap for a
// real DB when the website needs it.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const FILE = new URL('../data/bounties.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

let bounties = [];

export function load() {
  try {
    if (existsSync(FILE)) bounties = JSON.parse(readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.warn('[store] could not read', FILE, '-', err.message);
    bounties = [];
  }
}

function save() {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify(bounties, null, 2));
  } catch (err) {
    console.warn('[store] could not write', FILE, '-', err.message);
  }
}

export function all() {
  return bounties.slice().sort((a, b) => b.createdAt - a.createdAt);
}
export function get(id) {
  return bounties.find((b) => b.id === id) || null;
}
export function add(b) {
  bounties.push(b);
  save();
  return b;
}
export function update(b) {
  save();
  return b;
}
// Is there already a live bounty for this device? (device fires on every trip)
export function activeForDevice(deviceHash) {
  return bounties.find(
    (b) => b.deviceHash === deviceHash && (b.status === 'OPEN' || b.status === 'CLAIMED')
  ) || null;
}

// The device whose bounty was most recently CLAIMED — i.e. who the operator
// has earned the right to steer. null if nobody currently holds a claim.
export function latestClaimedDevice() {
  const claimed = bounties.filter((b) => b.status === 'CLAIMED');
  if (!claimed.length) return null;
  claimed.sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
  return claimed[0].deviceHash;
}
