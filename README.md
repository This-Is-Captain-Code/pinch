# pinch

A minimal WebXR hand-tracking page for **Snap Spectacles**. It reads both
hands' joints each frame and streams them as JSON over a WebSocket to a
destination of your choice.

It's a single static page — [`index.html`](index.html). No build step, no
dependencies to install (THREE.js loads from a CDN via importmap).

## What it sends

Each frame with at least one tracked hand is sent over the WebSocket as:

```json
{
  "frame": 123,
  "left":  { "joints": [ { "pos": [x, y, z], "rot": [x, y, z, w] }, ... 25 ], "n": 25 },
  "right": { "joints": [ ... ], "n": 25 }
}
```

- `left` / `right` are present only when that hand is tracked.
- `joints` always has 25 entries in canonical WebXR order — `wrist`, then 5
  per finger (thumb, index, middle, ring, pinky). Untracked joints are `null`.
- `n` is the count of tracked joints for that hand.
- `pos` is in metres; `rot` is a quaternion `[x, y, z, w]`. Poses are in the
  session's local reference space.

## Configure where it sends

Change one line at the top of the script in [`index.html`](index.html):

```js
const WS_URL = "wss://your-destination.example.com/ws";
```

By default it connects to `/ws` on whatever host served the page.

## Running it on Spectacles

WebXR only runs in a **secure context**, so the page must be loaded over
**HTTPS** on the headset. Any HTTPS host works:

- **GitHub Pages** — enable Pages on this repo and the page is served over
  HTTPS for free.
- **A tunnel** (e.g. `cloudflared`) in front of a local server — the original
  approach.

Then on the Spectacles browser: open the URL, **tap anywhere to start** the AR
session, and grant hand-tracking. The on-screen overlay shows the outbound
connection state, tracked-joint counts per hand, and FPS.

## How it works

- Starts an `immersive-ar` session with `hand-tracking` requested as an
  optional feature (`ARButton`).
- Uses THREE.js `renderer.xr.getHand(0/1)` to get live joint transforms.
- Each animation frame, extracts the 25 named joints per hand and sends them
  over the WebSocket; reconnects automatically if the socket drops.
