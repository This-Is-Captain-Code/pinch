# stackchan bounty agent

The agent-economy back half of the stackchan demo. The robot has its **own
wallet** holding MON on Monad. When its camera is blocked it posts a **bounty**;
a human claims it and teleoperates the robot to clear the view; when the robot
can see again it **autonomously pays** the human in MON — machine-to-machine,
no card, just a wallet.

```
robot blocked ──MQTT camera_blocked──▶ agent posts bounty (OPEN, reward in MON)
human claims (registers wallet) ─────▶ CLAIMED, teleops the robot
robot sees again ─MQTT camera_clear──▶ agent sends MON to the human (PAID, onchain tx)
```

The payout is a direct transfer from the robot's wallet to the solver — the
agentic payment rail. (Swap in an escrow contract later without touching the
lifecycle in `src/bounty.js`.)

## Run

```bash
cd server
npm install
npm run gen-wallet         # prints an address + private key
#   put the key in .env as AGENT_PRIVATE_KEY
#   fund the address with testnet MON: https://faucet.monad.xyz
cp .env.example .env       # then edit AGENT_PRIVATE_KEY (+ MQTT_* if using the broker)
npm start
```

Open <http://localhost:8090> — the operator page shows the agent wallet, balance,
and live bounties.

## Two ways to drive it

- **Sim mode (no broker needed):** leave `MQTT_URL` empty. Use the page's
  *simulate obstruction detected / cleared* buttons (or `POST /api/sim/blocked`
  and `/api/sim/clear`). Everything else — claim + real onchain payout — is real.
- **Live mode:** set `MQTT_URL` (+ creds) to the broker the robot publishes to and
  `DEVICE_HASH` to the robot's `mqtt.hash()`. The robot's real `camera_blocked` /
  `camera_clear` signals then drive the loop.

## API (for the website UI, which is WIP)

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| GET  | `/api/agent` | — | agent address, MON balance, chain, reward |
| GET  | `/api/bounties` | — | all bounties (newest first) |
| GET  | `/api/bounties/:id` | — | one bounty |
| POST | `/api/bounties/:id/claim` | `{ "solver": "0x…" }` | human takes the job |
| POST | `/api/bounties/:id/release` | — | settle now (pays the claimed solver) |
| POST | `/api/sim/blocked` | `{ "deviceHash?": "…" }` | simulate the robot getting blocked |
| POST | `/api/sim/clear` | `{ "deviceHash?": "…" }` | simulate the robot seeing again |

Bounty status: `OPEN → CLAIMED → PAID` (or `OPEN → CANCELLED` if cleared before
anyone claims). One live bounty per device at a time (the robot fires on every
trip; the agent de-dupes).

## MQTT contract (matches the device app)

- Device → agent: `og/d/{HASH}/commands` `{"cmd":"camera_blocked"}` /
  `{"cmd":"camera_clear"}`.
- Agent → device: `og/d/{HASH}/action` `{"action":"bounty_posted"|"bounty_paid"|"bounty_cancelled", …}`
  (the device ignores this today; reserved for on-face status later).

## Notes
- Default chain is **Monad testnet** (id 10143). Change `RPC_URL`/`CHAIN_ID` for mainnet.
- `.env` and `data/` are git-ignored. The private key controls real funds — never commit it.
- To build the wallet/onchain side further (escrow contract, Safe multisig), see
  MONSKILLS: `npx skills add therealharpaljadeja/monskills`.
