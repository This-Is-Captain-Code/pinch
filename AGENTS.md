# pinch — Agent Handoff / Full Context

This file is the operational brain-dump for any future agent working on **pinch**:
what it is, what's deployed where, the hard-won gotchas, and how to run/test it.
Read this before touching anything. (User-facing overview is in [README.md](README.md).)

---

## 1. What this is

An **agent-economy demo on the "stackchan" robot**: the robot has its own crypto
wallet. When it needs human help it posts a **bounty**; a human **teleoperates** it
(WebXR hand-tracking from Snap Spectacles drives the robot's pan/tilt head); on
completion the robot **autonomously pays the human in MON on Monad** (testnet).

Two task types in the UI: **Bounties** = real-time intervention (teleop, what's
built) and **Side Quests** = training-data requests (NOT built this round).

> **Reality check:** the *original* trigger was "camera sees it's blocked." **The
> camera is dead on this physical unit** (see §6), so the shipped `obstruction.py`
> is a **camera-free teleop app**: it just shows a "stuck" face, posts a bounty on
> launch, and applies incoming pan/tilt to the motor. The full vision (camera →
> auto-detect) needs working camera hardware.

---

## 2. The live loop (everything is cloud-hosted; no laptop needed)

```
Snap Spectacles (WebXR hand-tracking)
  → pinch-relay (Cloudflare Worker)            wss://pinch-relay.jenil-panchal10.workers.dev/ws
  → agent server (Render)                      https://pinch-ie4r.onrender.com
        · maps hand position → pan/tilt
        · holds the robot's wallet, runs the bounty lifecycle + MON payout
  → broker.emqx.io:1883 (public MQTT)
  → stackchan (ESP32-S3, gotchiOS)             topic og/d/<HASH>/cmd  {"mpan","mtilt"}
        → motor.pan / motor.tilt
```

## 3. Live endpoints & identifiers

| Thing | Value |
|---|---|
| Operator UI (Vercel) | https://ui-orpin-xi.vercel.app |
| WebXR sender (Spectacles) | https://pinch-bounty.vercel.app |
| Relay (Cloudflare Worker) | `wss://pinch-relay.jenil-panchal10.workers.dev/ws` (+ `/viewer` dashboard) |
| Agent server (Render Web Service "pinch") | https://pinch-ie4r.onrender.com |
| MQTT broker | `broker.emqx.io:1883` (public, open) — **`mqtt.opengotchi.com` is DEAD** |
| Device | M5Stack **CoreS3** ("stackchan"), ESP32-S3, 16 MB, on **COM8** (USB-Serial/JTAG) |
| Device MQTT hash (identity) | `df1ca8bb8271ab6d751e6d520e1c8ec3` (= SHA256(MAC+salt)[:32]) |
| Device MAC | `F4:12:FA:BA:20:08` |
| Agent wallet (Monad testnet 10143) | `0x66Ddb45E6aC8439d3fB5Cbf5F2527605CFb9Bd6D` (~49 MON) |
| Monad RPC / explorer | `https://testnet-rpc.monad.xyz` / `https://testnet.monadscan.com` |

Secrets (wallet key) live in `server/.env` (gitignored) and Render env vars — never commit them.

## 4. Repos, branches, key files

**`This-Is-Captain-Code/pinch`** (this repo, branch `main`):
- `apps/obstruction.py` — the device app (camera-free teleop receiver). Flash with `upload_apps.py`.
- `server/` — the agent server (Node + viem + mqtt + express). Deployed to Render. See `server/README.md`.
- `ui/` — Next.js 16 operator app (RainbowKit/wagmi). **Teammate-owned — don't edit without asking.**
- `openxr/` — WebXR sender + Cloudflare relay (teleop transport). **Teammate-owned.** See `openxr/README.md`.

**`opengotchi/gotchiOS`** (firmware, at `I:\Projects\opengotchi`):
- Device firmware. The stackchan build = branch `test/stackchan`, board **cores3**.
- **The one essential firmware change** (broker → `broker.emqx.io`) is on branch
  **`fix/mqtt-broker-emqx`** (pushed). Build firmware from there, not `test/stackchan`.

## 5. The MQTT contract (device ⇄ server)

- **device → server** `og/d/<HASH>/commands`: `{"cmd":"camera_blocked"}` (posts bounty),
  `{"cmd":"camera_clear"}` (resolve → pay).
- **server → device** `og/d/<HASH>/cmd`: `{"id":"…","mpan":0-180,"mtilt":0-180}` (teleop).
  Surfaces on device serial as `CMD: {...}` and is applied to the servos by `obstruction.py`.
- **server → device** `og/d/<HASH>/action`: bounty status (`bounty_posted/paid/cancelled`) —
  reserved; the device ignores it today.

Bounty lifecycle (server, `server/src/bounty.js`): `camera_blocked → OPEN` (agent funds),
`POST /api/bounties/:id/claim {solver}` → `CLAIMED`, `camera_clear` → `PAID` (real MON
transfer to solver) or `CANCELLED` (if unclaimed).

## 6. CRITICAL GOTCHAS (these cost hours — heed them)

1. **`mqtt.opengotchi.com` broker is DOWN** (1883 TCP-refused; 8883/TLS rejects the hash).
   Everything uses **`broker.emqx.io:1883`** instead (device firmware + server).
2. **Camera (GC0308) does NOT work on this unit** — it NACKs on SCCB (`Camera probe failed,
   ESP_ERR_NOT_SUPPORTED`, error 38). Hardware, not code. The app is camera-free.
3. **Firmware board MUST be `cores3`** — build with `idf.py -DGOTCHIOS_BOARD=cores3`.
   The CMake **default is `vocat`, which is WRONG** (it uses `partitions_vocat.csv` @0x612000
   and would relocate the storage partition, orphaning the apps). Keep `partitions.csv`
   (@`0x412000`) — verify the build prints `gotchiOS board: cores3` before flashing.
4. **ESP-IDF builds MUST run in PowerShell, not Git Bash** (IDF rejects MSys/Mingw). And the
   Git-Bash `python3` is 3.9 while the IDF venv is py3.13, so set `IDF_PYTHON_ENV_PATH`.
   Recipe in §7.
5. **Only ONE agent server may run at a time** — the laptop one and Render use the same MQTT
   client id, so running both makes the broker kick them back and forth. **Render is the
   live one; keep the laptop server OFF.**
6. **Flashing the app** uses `upload_apps.py` with the **default** offset (`0x412000`).
   Do NOT set `GOTCHIOS_BOARD=cores3` for `upload_apps` — that would target `0x612000`.
7. **The firmware broker fix is uncommitted on `test/stackchan`** — it lives on
   `fix/mqtt-broker-emqx`. A clean rebuild from `test/stackchan` reverts to the dead broker.

## 7. How to operate / test

**Test teleop end-to-end (no laptop):** wear Spectacles → open
https://pinch-bounty.vercel.app → tap to start → grant hand-tracking → wave. The robot's
head should follow. Exit the app (swipe down) → `camera_clear` → agent pays the operator.

**Drive the head without a headset** (sanity check the cloud path):
```bash
curl -s -XPOST https://pinch-ie4r.onrender.com/api/control \
  -H 'content-type: application/json' -d '{"pan":45,"tilt":120}'
# device serial (COM8 @115200) should log: CMD: {"mpan":45,"mtilt":120}
```
(The device must be running `obstruction.py` for the servos to actually move; the C MQTT
layer logs `CMD:` regardless.)

**Read device serial (Windows, pyserial):** open `COM8` @115200; reset via RTS toggle
(`dtr=False; rts=True; sleep(0.2); rts=False`).

**Re-flash the device app** (fast, no firmware rebuild):
```bash
cp apps/obstruction.py I:/Projects/opengotchi/apps/obstruction.py
cd I:/Projects/opengotchi && python scripts/upload_apps.py --port COM8   # default offset 0x412000
rm I:/Projects/opengotchi/apps/obstruction.py
```

**Rebuild + flash firmware** (only if you must — e.g. to change the broker again):
```powershell
cd I:\Projects\opengotchi
git checkout fix/mqtt-broker-emqx          # has the emqx broker
$env:IDF_PATH = "$HOME\esp\esp-idf"
$env:IDF_PYTHON_ENV_PATH = "$HOME\.espressif\python_env\idf5.5_py3.13_env"
. "$env:IDF_PATH\export.ps1"
idf.py -DGOTCHIOS_BOARD=cores3 -p COM8 build flash   # verify "board: cores3" before it flashes
```

**Run the agent server locally** (only if Render is off — never both):
```bash
cd server && npm install && npm start    # needs server/.env (wallet key + MQTT/relay/hash)
```

**Deploy server to Render:** Web Service, rootDir `server`, build `npm install`, start
`npm start`, **Starter** plan (Free sleeps → drops MQTT). Env vars: `AGENT_PRIVATE_KEY`,
`MQTT_URL=mqtt://broker.emqx.io:1883`, `DEVICE_HASH` + `TELEOP_DEVICE_HASH` =
`df1ca8bb8271ab6d751e6d520e1c8ec3`. (`render.yaml` has the rest, but it only auto-applies
via Render's *Blueprint* flow, not a manual Web Service.)

## 8. Known issues / next steps

- **Camera dead** → obstruction auto-detection is stubbed out (teleop is manual/always-on).
  Fix the GC0308 hardware/wiring or accept teleop-only.
- **Public broker** (`broker.emqx.io`) is fine for a demo but shared/unauthenticated — anyone
  could publish to `og/d/<HASH>/cmd`. For production, run a private broker (and ideally bring
  `mqtt.opengotchi.com` back).
- **Side Quests** (training-data recordings) are mock-only in the UI.
- Wire the UI's "claim → WebXR" + `/api/quests` live data if the teammate hasn't (the server
  exposes `GET /api/quests` in the exact `Quest` shape).
- Set `NEXT_PUBLIC_API_URL` = the Render URL in the Vercel UI so bounties show live there.
