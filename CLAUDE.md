# CryptoHawking DEX — engineering rules

Complete, independently deployed fork of PancakeSwap (v2 AMM + v3 CLAMM + v4/Infinity
singleton) on **Base Sepolia testnet only**, served at https://dex.cryptohawking.com

## NON-NEGOTIABLE RULES

1. Every contract is a FRESH deployment under our own deployer key. We reference ZERO
   PancakeSwap mainnet/testnet addresses. Only canonical chain infra (WETH9 predeploy,
   Permit2, Multicall3, CREATE3 factory) may be reused.
2. NEVER hardcode an address you have not personally deployed or verified on-chain in
   this session. If you need an address you don't have, STOP and ask.
3. After ANY change to v2 Pair bytecode you MUST recompute INIT_CODE_PAIR_HASH and patch
   it into PancakeLibrary.sol + the frontend v2-sdk. Same for v3 POOL_INIT_CODE_HASH.
   A stale init code hash is the #1 cause of a dead fork.
4. License compliance: contracts stay GPL-2.0/GPL-3.0/MIT, frontend GPL-3.0. Keep
   upstream LICENSE files, keep copyright headers, see NOTICE.
5. Testnet only. No mainnet RPC, no mainnet private keys, no real funds. All tokens are
   valueless test assets and must be labelled as such in the UI.
6. Deployment scripts, not one-off console commands. Every deploy is idempotent and
   re-runnable, reading/writing packages/deployments/base-sepolia.json.

## CHAIN CONSTANTS (Base Sepolia — all verified on-chain, see DEPLOYMENTS.md)

- chainId 84532, RPC https://sepolia.base.org (fallback key in .env), explorer https://sepolia.basescan.org
- WETH9 predeploy: 0x4200000000000000000000000000000000000006
- Multicall3:      0xcA11bde05977b3631167028862bE2a173976CA11
- Permit2:         0x000000000022D473030F116dDEE9F6B43aC78BA3
- Deterministic deployer: 0x4e59b44847b379578588920cA78FbF26c0B4956C

## BRAND / NAMING MAP

PancakeSwap→CryptoHawking · Pancake→Hawking (HawkingFactory, HawkingRouter,
HawkingV3Factory…) · CAKE→HAWK ("Crypto Hawking Token", 18 dec) · SYRUP→NEST ·
Cake-LP→HAWK-LP · domain dex.cryptohawking.com.
Rename contract names/symbols only. Do NOT rename internal library math or change any
economic logic — only branding, addresses, config.

## LAYOUT

- contracts/v2 (hardhat, solc 0.5.16 core + 0.6.6 periphery) · contracts/v3 (hardhat 0.7.6)
  · contracts/infinity (foundry 0.8.26) · contracts/tokens (foundry) · contracts/farms (hardhat)
- packages/deployments (@cryptohawking/deployments address registry) · packages/tokenlist
- subgraphs/{v2,v3,infinity,blocks} · apps/{web,api} · scripts/
- upstream/ = shallow clones of PancakeSwap sources (gitignored, re-fetch via scripts/fetch-upstream.sh)

## DISCIPLINE

- Small conventional commits. Every deployed address goes into
  packages/deployments/base-sepolia.json IMMEDIATELY, then verify on Basescan.
- If a step fails twice, stop and report. Keep RISKS.md updated with every guess/stub.
- UI look & feel follows the cryptohawking-migration site (../cryptohawking-migration).
