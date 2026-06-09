import { config, agentEnabled, mqttEnabled } from './config.js';
import { agentAddress, agentBalance } from './chain.js';
import { startMqtt } from './mqtt.js';
import { startTeleop } from './teleop.js';
import { createServer } from './server.js';
import * as store from './store.js';

async function main() {
  store.load();

  console.log('── stackchan bounty agent ──');
  console.log('chain     :', config.chainId, '(', config.rpcUrl, ')');
  console.log('reward    :', config.rewardMon, 'MON per obstruction');
  if (agentEnabled) {
    console.log('agent     :', agentAddress);
    try {
      const bal = await agentBalance();
      console.log('balance   :', bal.mon, 'MON');
      if (Number(bal.mon) <= 0) {
        console.log('  ⚠ wallet is empty — fund it from a Monad faucet, e.g.');
        console.log('    https://faucet.monad.xyz  (paste:', agentAddress, ')');
      }
    } catch (err) {
      console.log('balance   : (could not reach RPC:', err.message, ')');
    }
  } else {
    console.log('agent     : (AGENT_PRIVATE_KEY not set — run `npm run gen-wallet`, then fund it)');
  }

  startMqtt();
  startTeleop();

  createServer().listen(config.port, () => {
    console.log('http      : http://localhost:' + config.port + '  (operator page + /api)');
    console.log(mqttEnabled ? 'mode      : listening to robot over MQTT' : 'mode      : sim mode (drive via the operator page buttons)');
  });
}

main();
