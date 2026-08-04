/**
 * Task 15 acceptance — connect the headless EIP-1193 wallet through the real UI.
 *
 *   node <skill>/browser.mjs http://localhost:3000/swap --script scripts/acceptance/connect.mjs
 */
import { connectWallet, installWallet } from './wallet.mjs'

export default async function run(page, ui) {
  const wallet = await installWallet(page)
  const res = await connectWallet(page, wallet)
  return { address: wallet.address, rpcMethodsSeen: [...new Set(wallet.calls)], ...res }
}
