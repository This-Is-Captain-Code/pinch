// Listens to the robot's MQTT commands and drives the bounty loop.
//   og/d/{HASH}/commands  {"cmd":"camera_blocked"}  -> create bounty
//                         {"cmd":"camera_clear"}    -> settle bounty
// and notifies the robot back on og/d/{HASH}/action (contract for later
// on-face status; the device ignores it today).
import mqtt from 'mqtt';
import { config, mqttEnabled } from './config.js';
import * as bounty from './bounty.js';

let client = null;

export function publishAction(deviceHash, payload) {
  if (!client || !deviceHash) return;
  client.publish(`og/d/${deviceHash}/action`, JSON.stringify(payload), { qos: 1 });
}

// Steer the robot: publish a compact motor target to its cmd topic. Surfaces
// on-device as a "CMD: {...}" log line (truncated to 100 chars, so keep it tiny).
// QoS 0 — teleop is high-rate and the freshest frame always wins.
let cmdSeq = 0;
export function publishCmd(deviceHash, fields) {
  if (!client || !deviceHash) return false;
  cmdSeq = (cmdSeq + 1) & 0xffff;
  client.publish(`og/d/${deviceHash}/cmd`, JSON.stringify({ id: 't' + cmdSeq, ...fields }), { qos: 0 });
  return true;
}

export function mqttReady() {
  return !!(client && client.connected);
}

function hashFromTopic(topic) {
  const parts = topic.split('/'); // og / d / {hash} / commands
  return parts.length >= 4 ? parts[2] : '';
}

async function onMessage(topic, buf) {
  let cmd = '';
  try { cmd = (JSON.parse(buf.toString()).cmd || '').toLowerCase(); } catch { return; }
  const deviceHash = hashFromTopic(topic);
  try {
    if (cmd === 'camera_blocked') {
      const { bounty: b, reused } = bounty.createForBlocked(deviceHash);
      if (!reused) publishAction(deviceHash, { action: 'bounty_posted', id: b.id, amount_mon: b.rewardMon, msg: 'Bounty posted' });
    } else if (cmd === 'camera_clear') {
      const b = await bounty.resolveForCleared(deviceHash);
      if (b && b.status === 'PAID') publishAction(deviceHash, { action: 'bounty_paid', id: b.id, tx_hash: b.payTx, amount_mon: b.rewardMon, msg: 'Solver paid' });
      else if (b && b.status === 'CANCELLED') publishAction(deviceHash, { action: 'bounty_cancelled', id: b.id, msg: 'Cleared, no claim' });
    }
  } catch (err) {
    console.error('[mqtt] handling', cmd, 'failed:', err.message);
  }
}

export function startMqtt() {
  if (!mqttEnabled) {
    console.log('[mqtt] MQTT_URL not set — broker listener disabled (use /api/sim/* to drive the loop)');
    return;
  }
  const topic = `og/d/${config.deviceHash || '+'}/commands`;
  client = mqtt.connect(config.mqttUrl, {
    username: config.mqttUsername || undefined,
    password: config.mqttPassword || undefined,
    clientId: config.mqttClientId,
    reconnectPeriod: 3000,
  });
  client.on('connect', () => {
    console.log('[mqtt] connected to', config.mqttUrl);
    client.subscribe(topic, { qos: 1 }, (err) => {
      console.log(err ? `[mqtt] subscribe failed: ${err.message}` : `[mqtt] subscribed ${topic}`);
    });
  });
  client.on('message', onMessage);
  client.on('error', (err) => console.error('[mqtt] error:', err.message));
}
