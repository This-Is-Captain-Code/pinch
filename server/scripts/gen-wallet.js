// Generate a fresh agentic wallet for the robot.
//   node scripts/gen-wallet.js
// Put the printed key in .env as AGENT_PRIVATE_KEY, then fund the address
// from a Monad testnet faucet.
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

console.log('\nStackchan agent wallet');
console.log('──────────────────────');
console.log('address     :', account.address);
console.log('private key :', pk);
console.log('\nNext:');
console.log('  1. Put this in server/.env:   AGENT_PRIVATE_KEY=' + pk);
console.log('  2. Fund the address with testnet MON: https://faucet.monad.xyz');
console.log('  3. npm start\n');
console.log('⚠ This key controls real funds on its chain. Never commit it.\n');
