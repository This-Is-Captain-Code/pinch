// Bounty lifecycle — the agentic loop.
//
//   blocked  -> OPEN     (robot's wallet earmarks a reward for help)
//   claim    -> CLAIMED  (a human takes the job, registers their wallet)
//   cleared  -> PAID     (robot can see again -> autonomously pays the solver)
//   cleared while unclaimed -> CANCELLED (nobody helped; no payout)
import { randomUUID } from 'node:crypto';
import { isAddress, getAddress } from 'viem';
import * as store from './store.js';
import { payMon, agentAddress } from './chain.js';
import { config } from './config.js';
import * as events from './events.js';

// Clean shape pushed to the website over SSE (matches the UI Quest vocabulary).
function present(b) {
  return {
    id: b.id, name: b.name, deviceHash: b.deviceHash, rewardMon: b.rewardMon,
    status: b.status === 'OPEN' ? 'available' : b.status === 'CLAIMED' ? 'claimed' : 'resolved',
    solver: b.solver, payTx: b.payTx, createdAt: b.createdAt,
  };
}

// Robot got blocked -> create (or reuse) an OPEN bounty for that device.
export function createForBlocked(deviceHash) {
  const existing = store.activeForDevice(deviceHash);
  if (existing) return { bounty: existing, reused: true };
  const b = {
    id: randomUUID().slice(0, 8),
    deviceHash: deviceHash || 'unknown',
    name: config.deviceName,
    rewardMon: config.rewardMon,
    status: 'OPEN',
    solver: null,
    createdAt: Date.now(),
    claimedAt: null,
    paidAt: null,
    claimTx: null,
    payTx: null,
    funder: agentAddress,
  };
  store.add(b);
  console.log(`[bounty] OPEN ${b.id} reward=${b.rewardMon} MON device=${b.deviceHash}`);
  events.broadcast('obstruction_detected', present(b));   // -> website
  return { bounty: b, reused: false };
}

// A human takes the job and registers the wallet that should get paid.
export function claim(id, solver) {
  const b = store.get(id);
  if (!b) throw new Error('bounty not found');
  if (b.status !== 'OPEN') throw new Error(`bounty is ${b.status}, cannot claim`);
  if (!isAddress(solver)) throw new Error('invalid solver address');
  b.solver = getAddress(solver);
  b.status = 'CLAIMED';
  b.claimedAt = Date.now();
  store.update(b);
  console.log(`[bounty] CLAIMED ${b.id} by ${b.solver}`);
  events.broadcast('bounty_claimed', present(b));
  return b;
}

// Robot can see again -> settle. Pays the claimed solver; otherwise cancels.
export async function resolveForCleared(deviceHash) {
  const b = store.activeForDevice(deviceHash);
  if (!b) return null;
  return settle(b);
}

export async function settle(b) {
  if (b.status === 'CLAIMED') {
    const { hash, status } = await payMon(b.solver, b.rewardMon);
    b.status = 'PAID';
    b.payTx = hash;
    b.paidAt = Date.now();
    store.update(b);
    console.log(`[bounty] PAID ${b.id} -> ${b.solver} ${b.rewardMon} MON tx=${hash} (${status})`);
    events.broadcast('bounty_paid', present(b));
    return b;
  }
  if (b.status === 'OPEN') {
    b.status = 'CANCELLED';
    store.update(b);
    console.log(`[bounty] CANCELLED ${b.id} (cleared before anyone claimed)`);
    events.broadcast('bounty_cancelled', present(b));
    return b;
  }
  return b; // already PAID/CANCELLED
}
