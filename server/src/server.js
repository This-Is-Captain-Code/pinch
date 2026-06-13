import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config, agentEnabled, txUrl, addrUrl } from './config.js';
import { agentAddress, agentBalance } from './chain.js';
import { publishAction, publishCmd } from './mqtt.js';
import * as events from './events.js';
import * as store from './store.js';
import * as bounty from './bounty.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(join(__dirname, '..', 'public')));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Real-time push to the website (Server-Sent Events). The frontend opens an
  // EventSource here and gets {type,bounty} on obstruction_detected / bounty_*.
  app.get('/api/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write('retry: 3000\n\n: connected\n\n');
    events.addClient(res);
    const ka = setInterval(() => { try { res.write(': ka\n\n'); } catch {} }, 25000);
    req.on('close', () => clearInterval(ka));
  });

  app.get('/api/agent', async (_req, res) => {
    try {
      const bal = await agentBalance();
      res.json({
        enabled: agentEnabled,
        address: agentAddress,
        addressUrl: agentAddress ? addrUrl(agentAddress) : null,
        balance: bal,
        chainId: config.chainId,
        rewardMon: config.rewardMon,
        explorer: config.explorerUrl,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const withUrls = (b) => ({
    ...b,
    claimTxUrl: b.claimTx ? txUrl(b.claimTx) : null,
    payTxUrl: b.payTx ? txUrl(b.payTx) : null,
  });

  // UI-native projection: matches ui/app/types.ts `Quest` exactly, so the
  // frontend can swap its hardcoded BOUNTIES array for `GET /api/quests`.
  const toQuest = (b) => ({
    id: b.id,
    name: b.name || config.deviceName,
    status: b.status === 'OPEN' ? 'available' : b.status === 'CLAIMED' ? 'claimed' : 'resolved',
    bounty: Number(b.rewardMon),
    postedAt: new Date(b.createdAt).toISOString(),
    operatorAddress: b.solver || undefined,
    imageUrl: config.deviceImageUrl,
    payTx: b.payTx || undefined,
    payTxUrl: b.payTx ? txUrl(b.payTx) : undefined,
  });
  app.get('/api/quests', (_req, res) => res.json(store.all().map(toQuest)));

  app.get('/api/bounties', (_req, res) => res.json(store.all().map(withUrls)));
  app.get('/api/bounties/:id', (req, res) => {
    const b = store.get(req.params.id);
    b ? res.json(withUrls(b)) : res.status(404).json({ error: 'not found' });
  });

  // A human takes the job: { solver: "0x..." }
  app.post('/api/bounties/:id/claim', (req, res) => {
    try {
      res.json(withUrls(bounty.claim(req.params.id, req.body.solver)));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Manual settle (same effect as the robot's camera_clear).
  app.post('/api/bounties/:id/release', async (req, res) => {
    try {
      const b = store.get(req.params.id);
      if (!b) return res.status(404).json({ error: 'not found' });
      const out = await bounty.settle(b);
      if (out.status === 'PAID') publishAction(out.deviceHash, { action: 'bounty_paid', id: out.id, tx_hash: out.payTx, amount_mon: out.rewardMon, msg: 'Solver paid' });
      res.json(withUrls(out));
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Direct motor control (for the UI's pan/tilt buttons, or testing without
  // the relay): { deviceHash?, pan: 0-180, tilt: 0-180 }. Falls back to the
  // forced/last-claimed device. Same MQTT cmd path the hand-tracking uses.
  const clamp180 = (v) => Math.max(0, Math.min(180, Math.round(Number(v) || 0)));
  app.post('/api/control', (req, res) => {
    const device = req.body.deviceHash || config.teleopDeviceHash || store.latestClaimedDevice();
    if (!device) return res.status(400).json({ error: 'no target device — claim a bounty or pass deviceHash' });
    const pan = clamp180(req.body.pan);
    const tilt = clamp180(req.body.tilt);
    const ok = publishCmd(device, { mpan: pan, mtilt: tilt });
    res.json({ ok, device, pan, tilt });
  });

  // Simulate the robot's MQTT signals (for demos without the broker).
  app.post('/api/sim/blocked', (req, res) => {
    const { bounty: b, reused } = bounty.createForBlocked(req.body.deviceHash || 'sim-device');
    res.json({ reused, bounty: withUrls(b) });
  });
  app.post('/api/sim/clear', async (req, res) => {
    try {
      const b = await bounty.resolveForCleared(req.body.deviceHash || 'sim-device');
      res.json({ bounty: b ? withUrls(b) : null });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}
