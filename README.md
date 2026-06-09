# Pinch — WebXR Hand Tracking for Snap Spectacles

Real-time hand tracking in the Snap Spectacles browser, streamed to any device via a Cloudflare relay. No app install. No pairing. Just open a URL.

---

## Live Links

| Page | URL | Description |
|------|-----|-------------|
| **AR Sender** | https://openxr-ashen.vercel.app | Open on Spectacles — starts hand tracking |
| **Monitor / Receiver** | https://openxr-ashen.vercel.app/receiver.html | Open anywhere — live finger coordinates |

---

## How It Works

```
Snap Spectacles browser          Cloudflare Worker              Any browser / API client
  pinch-beige.vercel.app   ──►  hand-tracking-relay         ──►  /receiver.html
      (WebXR sender)           .jenil-panchal10.workers.dev       (live monitor)
                                   (WebSocket relay)
```

1. Open the **AR Sender** on Spectacles and tap **TAP TO START AR**
2. Grant hand-tracking permission
3. Open the **Monitor** on any other device — data appears instantly in real time

---

## API Endpoints

All endpoints are public, no authentication needed.

### REST — latest snapshot
```
GET https://hand-tracking-relay.jenil-panchal10.workers.dev/default
```
Returns the most recent hand frame as JSON. Works with `curl`, `fetch()`, Postman, anything.

```bash
curl https://hand-tracking-relay.jenil-panchal10.workers.dev/default
```

### SSE — real-time stream
```
GET https://hand-tracking-relay.jenil-panchal10.workers.dev/default/stream
```
Server-Sent Events stream. Each event is one hand frame.

```js
const es = new EventSource('https://hand-tracking-relay.jenil-panchal10.workers.dev/default/stream');
es.onmessage = e => {
  const frame = JSON.parse(e.data);
  console.log(frame.left.joints[10].pos); // left index fingertip [x, y, z]
};
```

### WebSocket — lowest latency
```
wss://hand-tracking-relay.jenil-panchal10.workers.dev/default
```
Full-duplex. Connect and receive every broadcast frame in real time.

```js
const ws = new WebSocket('wss://hand-tracking-relay.jenil-panchal10.workers.dev/default');
ws.onmessage = e => {
  const frame = JSON.parse(e.data);
  console.log(frame.right.joints[5].pos); // right thumb tip [x, y, z]
};
```

---

## Data Format

Each frame:
```json
{
  "frame": 1042,
  "ts": 17823.4,
  "left": {
    "n": 26,
    "joints": [
      { "pos": [0.01234, 0.95600, -0.31200], "rot": [0, 0, 0, 1] },
      ...26 entries (null if untracked)
    ]
  },
  "right": { ... }
}
```

### Joint order (0–25)

| Index | Name |
|-------|------|
| 0 | Wrist |
| 1–5 | Thumb (metacarpal → tip) |
| 6–10 | Index finger (metacarpal → tip) |
| 11–15 | Middle finger |
| 16–20 | Ring finger |
| 21–25 | Pinky finger |

**Key fingertip indices:** Thumb=5, Index=10, Middle=15, Ring=20, Pinky=25

- `pos` — position in metres `[x, y, z]` in the XR session's local reference frame
- `rot` — rotation as quaternion `[x, y, z, w]`
- `n` — number of tracked joints for that hand (max 26)

---

## Project Structure

```
openxr/
├── index.html          # WebXR AR sender (Spectacles page)
├── receiver.html       # Live monitor dashboard (any browser)
├── vercel.json         # Vercel static deploy config
├── _headers            # Cloudflare Pages headers (CORS/COOP)
├── relay-worker/       # Cloudflare Worker — WebSocket relay + REST + SSE
│   ├── src/index.js
│   └── wrangler.toml
└── relay/              # Alternative Node.js relay (for self-hosting)
    ├── server.js
    └── package.json
```

---

## Deploy Your Own

### Front-end (Vercel)
```bash
cd openxr
npx vercel --prod
```

### Relay (Cloudflare Worker — free)
```bash
cd openxr/relay-worker
npx wrangler deploy
```

### Relay (Node.js self-hosted alternative)
```bash
cd openxr/relay
npm install
node server.js          # runs on port 8080
```

---

## Gesture Detection (built into receiver)

| Gesture | Detection method |
|---------|-----------------|
| **Pinch** | Distance between thumb tip (joint 5) and index tip (joint 10) < 3 cm |
| **Point** | Index extended, other fingers curled |
| **Open hand** | All 5 fingers extended |
| **Fist** | All 5 fingers curled |

---

## Tech Stack

- **WebXR Hand Input API** — joint tracking in Spectacles browser
- **Three.js** — WebXR session + 3D skeleton overlay on the sender
- **Cloudflare Workers + Durable Objects** — stateful WebSocket relay, free tier
- **Vercel** — static hosting with HTTPS, free tier
