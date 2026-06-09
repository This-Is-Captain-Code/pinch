// Teleop bridge: subscribe to the WebXR hand-tracking relay and steer the
// robot's head. Hand position -> pan/tilt -> MQTT cmd to the device.
//
// The device can't be a WebSocket client, so the server is the bridge: it
// holds the relay connection (which the robot can't) and forwards motor
// targets over the existing MQTT cmd channel. Control is GATED — frames only
// reach a device whose bounty is currently CLAIMED (claiming the bounty is
// what earns you the controls), unless TELEOP_DEVICE_HASH forces a target.
import WebSocket from 'ws';
import { config } from './config.js';
import * as store from './store.js';
import { publishCmd, mqttReady } from './mqtt.js';

let ws = null;
let lastSent = 0;
let lastPan = -1;
let lastTilt = -1;
let frames = 0;
let lastLog = 0;

function mapAxis(v, inMin, inMax, invert) {
  let t = (v - inMin) / (inMax - inMin);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  if (invert) t = 1 - t;
  return Math.round(t * 180);
}

function targetDevice() {
  return config.teleopDeviceHash || store.latestClaimedDevice();
}

function onFrame(frame) {
  frames++;
  const other = config.teleopHand === 'right' ? 'left' : 'right';
  const hand = (frame[config.teleopHand] && frame[config.teleopHand].joints)
    ? frame[config.teleopHand] : frame[other];           // fall back to whichever hand is tracked
  const j = hand && hand.joints && hand.joints[config.teleopJoint];
  if (!j || !j.pos) return;

  const pan = mapAxis(j.pos[0], config.panInMin, config.panInMax, config.panInvert);
  const tilt = mapAxis(j.pos[1], config.tiltInMin, config.tiltInMax, config.tiltInvert);

  const now = Date.now();
  if (now - lastSent < 1000 / config.teleopHz) return;            // rate-limit
  if (Math.abs(pan - lastPan) < 2 && Math.abs(tilt - lastTilt) < 2) return; // deadband

  const device = targetDevice();
  if (now - lastLog > 1000) {
    console.log(`[teleop] hand ${config.teleopHand}[${config.teleopJoint}] -> pan ${pan} tilt ${tilt}` +
      (device ? ` -> ${device.slice(0, 8)}…` : ' (no claimed device — control locked)') +
      (mqttReady() ? '' : ' (mqtt offline)'));
    lastLog = now;
  }
  if (!device || !mqttReady()) return;
  if (publishCmd(device, { mpan: pan, mtilt: tilt })) {
    lastSent = now; lastPan = pan; lastTilt = tilt;
  }
}

function connect() {
  ws = new WebSocket(config.relayWsUrl);
  ws.on('open', () => console.log('[teleop] relay connected:', config.relayWsUrl));
  ws.on('message', (data) => { try { onFrame(JSON.parse(data.toString())); } catch { /* non-JSON */ } });
  ws.on('close', () => { console.log('[teleop] relay closed — reconnecting in 3s'); setTimeout(connect, 3000); });
  ws.on('error', (err) => console.log('[teleop] relay error:', err.message));
}

export function startTeleop() {
  if (!config.teleopEnabled) { console.log('[teleop] disabled (TELEOP_ENABLED=false)'); return; }
  connect();
}
