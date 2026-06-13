import dotenv from 'dotenv';
dotenv.config();

const e = process.env;
const num = (k, d) => (e[k] !== undefined && e[k] !== '' ? Number(e[k]) : d);
const bool = (k, d) => (e[k] !== undefined ? e[k] === 'true' : d);

export const config = {
  agentPrivateKey: e.AGENT_PRIVATE_KEY || '',
  rpcUrl: e.RPC_URL || 'https://testnet-rpc.monad.xyz',
  chainId: Number(e.CHAIN_ID || 10143),
  explorerUrl: (e.EXPLORER_URL || 'https://testnet.monadscan.com').replace(/\/$/, ''),
  rewardMon: e.REWARD_MON || '0.05',
  deviceName: e.DEVICE_NAME || 'stackchan', // label shown in the UI's Quest.name
  deviceImageUrl: e.DEVICE_IMAGE_URL ||     // photo shown on the UI bounty card
    'https://shop.m5stack.com/cdn/shop/files/1_29c1c66c-6170-4270-ba77-7d3bf4793c7b_1200x1200.webp',
  port: Number(e.PORT || 8090),
  mqttUrl: e.MQTT_URL || '',
  mqttUsername: e.MQTT_USERNAME || '',
  mqttPassword: e.MQTT_PASSWORD || '',
  mqttClientId: e.MQTT_CLIENT_ID || 'stackchan-bounty-agent',
  deviceHash: e.DEVICE_HASH || '',

  // ── teleop: hand-tracking relay -> motor cmd ──
  relayWsUrl: e.RELAY_WS_URL || 'wss://pinch-relay.jenil-panchal10.workers.dev/ws',
  teleopEnabled: bool('TELEOP_ENABLED', true),
  teleopHz: num('TELEOP_HZ', 8),         // max motor updates/sec sent to the device
  teleopHand: e.TELEOP_HAND || 'right',  // which hand drives the head
  teleopJoint: num('TELEOP_JOINT', 0),   // 0=wrist; fingertips 4/9/14/19/24 (25-joint WebXR order)
  teleopDeviceHash: e.TELEOP_DEVICE_HASH || '', // force a target (else: latest CLAIMED bounty)
  // map hand position (metres, local frame) onto 0..180 deg servo range
  panInMin: num('TELEOP_PAN_IN_MIN', -0.3),
  panInMax: num('TELEOP_PAN_IN_MAX', 0.3),
  tiltInMin: num('TELEOP_TILT_IN_MIN', -0.3),
  tiltInMax: num('TELEOP_TILT_IN_MAX', 0.3),
  panInvert: bool('TELEOP_PAN_INVERT', false),
  tiltInvert: bool('TELEOP_TILT_INVERT', true), // hand up -> look up
};

export const agentEnabled = !!config.agentPrivateKey;
export const mqttEnabled = !!config.mqttUrl;

export function txUrl(hash) {
  return `${config.explorerUrl}/tx/${hash}`;
}
export function addrUrl(addr) {
  return `${config.explorerUrl}/address/${addr}`;
}
