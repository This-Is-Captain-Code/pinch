// Monad chain access for the agent wallet — viem only, no contract needed.
// The "bounty escrow" is the agent's own MON balance; payout is a direct
// agent -> solver transfer (the agentic payment rail). Swap in an escrow
// contract later without touching the bounty lifecycle.
import {
  createWalletClient, createPublicClient, http,
  defineChain, parseEther, formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config, agentEnabled } from './config.js';

export const monad = defineChain({
  id: config.chainId,
  name: `Monad (${config.chainId})`,
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
  blockExplorers: { default: { name: 'MonadScan', url: config.explorerUrl } },
});

export const publicClient = createPublicClient({ chain: monad, transport: http(config.rpcUrl) });

export const account = agentEnabled ? privateKeyToAccount(config.agentPrivateKey) : null;
export const walletClient = agentEnabled
  ? createWalletClient({ account, chain: monad, transport: http(config.rpcUrl) })
  : null;

export const agentAddress = account ? account.address : null;

export async function agentBalance() {
  if (!agentAddress) return null;
  const wei = await publicClient.getBalance({ address: agentAddress });
  return { wei: wei.toString(), mon: formatEther(wei) };
}

// The agentic payment: send `mon` MON from the robot's wallet to the solver.
export async function payMon(to, mon) {
  if (!walletClient) throw new Error('AGENT_PRIVATE_KEY not set — cannot send a payment');
  const value = parseEther(String(mon));
  const bal = await publicClient.getBalance({ address: agentAddress });
  if (bal < value) {
    throw new Error(`agent wallet underfunded: has ${formatEther(bal)} MON, needs ${mon} MON. Fund ${agentAddress} from a Monad faucet.`);
  }
  const hash = await walletClient.sendTransaction({ to, value });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, status: receipt.status };
}
