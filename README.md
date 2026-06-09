# pinch

**An agent economy in action — an autonomous robot hits its limits, hires a human, and pays them machine-to-machine onchain.**

Stackchan runs on its own until something blocks its camera. When it can't see, it posts a small **bounty from its own wallet** asking for help, shows a "stuck" face, and waits. A human claims the bounty and **teleoperates** stackchan — live hand-tracking from Snap Spectacles drives the robot's pan/tilt — to look past the obstacle. The moment stackchan can see again, the bounty is **released to the operator in MON on [Monad](https://monad.xyz)**, settled onchain. That's the one thing a normal payment rail can't do for an agent that has no credit card — only a wallet.

Two ways agents pay humans here:

- **Bounties — real-time intervention.** The robot is stuck and pays a human to take control *now* (teleop).
- **Side Quests — training data.** The robot pays a human to record a first-person demonstration of a task it wants to learn (e.g. "doing the dishes").

## The loop

```
stackchan blinded ───MQTT camera_blocked──▶  agent posts a MON bounty from its own wallet
human opens it, connects wallet ──────────▶  claims it (their address = the payout)
hand-tracking (Spectacles) ─relay→server─MQTT─▶  stackchan motor.pan/tilt   (teleop)
stackchan sees again ───MQTT camera_clear──▶  agent pays the operator in MON on Monad  ✓
```

## Architecture

Four components, each independently deployable:

| Dir | What it is | Stack |
|-----|------------|-------|
| **[apps/](apps/)** | The app on the **stackchan robot** (ESP32-S3 / gotchiOS). `obstruction.py` detects a blocked camera, shows the stuck face, posts the bounty over MQTT, and drives the pan/tilt servos from teleop commands. | MicroPython |
| **[server/](server/)** | The **bounty agent** — holds stackchan's wallet, runs the bounty lifecycle, pays MON on Monad, and bridges the hand-tracking relay → MQTT motor commands. | Node · viem · MQTT |
| **[ui/](ui/)** | The **operator web app** — bounties grid; connect a wallet; click a bounty to teleop. | Next.js · RainbowKit · wagmi |
| **[openxr/](openxr/)** | The **teleop transport** — WebXR hand-tracking sender for Snap Spectacles + a Cloudflare relay + a receiver. | WebXR · Three.js · Cloudflare Workers |

**How it fits together**

- The robot can't be a WebSocket client, so the **server is the bridge**: it subscribes to the hand-tracking relay and republishes pan/tilt to the device's MQTT `cmd` topic. While stuck, the obstruction app applies those to the motor — and the moving view eventually clears, which triggers the payout.
- Each robot's identity is `mqtt.hash()` = `SHA256(MAC + salt)[:32]`; the server maps that to the robot's agent wallet.
- Obstruction detection is free of new firmware: the camera's `motion_detect()` returns a 32×24 luma grid, and a low mean-absolute-deviation (a flat, featureless field) = a covered lens.
- Payout is a direct MON transfer from the agent wallet to the operator on completion — the agentic rail — settled on **Monad testnet (chain id 10143)**.

## Why Monad

Agents need to pay humans (and each other) with no card and no bank — just a wallet, instantly, onchain. Monad's fast, low-cost EVM settlement makes per-bounty MON micropayments practical. The onchain/wallet side was built with help from [MONSKILLS](https://skills.devnads.com/) (`npx skills add therealharpaljadeja/monskills`).

## Quickstart (local)

**1 — Bounty agent + wallet** ([server/README.md](server/README.md))
```bash
cd server && npm install
npm run gen-wallet          # fund the printed address at https://faucet.monad.xyz
cp .env.example .env        # paste the key into AGENT_PRIVATE_KEY
npm start                   # http://localhost:8090  (operator page + API)
```

**2 — Operator UI** ([ui/README.md](ui/README.md))
```bash
cd ui && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8090" > .env.local
npm run dev
```

**3 — Teleop transport** ([openxr/README.md](openxr/README.md)) — the relay + sender are already live; open the sender on Spectacles to stream hand-tracking.

**4 — Robot** — flash `apps/obstruction.py` to the stackchan device. Cover the camera to post a bounty; teleop to clear it; the agent pays the operator.

No broker handy? Drive the whole bounty lifecycle without the robot via the operator page or `POST /api/sim/blocked` + `/api/sim/clear` — the MON payout is still a real onchain transaction.

## Deploy

- **UI → Vercel** (root dir `ui`) — set `NEXT_PUBLIC_API_URL` (the server URL) and `NEXT_PUBLIC_WEBXR_URL`. Live: <https://ui-orpin-xi.vercel.app>
- **Server → Render** (Blueprint reads [`server/render.yaml`](server/render.yaml)) — set `AGENT_PRIVATE_KEY` + `MQTT_URL`/`DEVICE_HASH`. It can't be serverless: it holds persistent MQTT + relay connections.
- **Relay → Cloudflare Workers** (`openxr/relay-worker/`) and **Sender → Vercel** (`openxr/`) — see [openxr/README.md](openxr/README.md).

## Status

Hackathon build. Implemented and verified: obstruction detection + stuck face, the `camera_blocked`/`camera_clear` MQTT signals, the agent wallet + MON payout on Monad, and the relay → MQTT → motor teleop bridge. The end-to-end live demo additionally needs the robot's MQTT broker reachable and the agent wallet funded.
