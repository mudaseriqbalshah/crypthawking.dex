# CryptoHawking DEX

**A complete, open-source DEX live on Base Sepolia — swap, LP, and farm test tokens for free.**

Built by [Mudaser Iqbal (Crypto Hawking)](https://cryptohawking.com) — ETHDenver 2025 winner (DAO & Community track). Base's own docs say testnet swaps are unsupported and Uniswap removed testnet deployments — this DEX exists so developers can actually test swap flows, liquidity provision, and farming on **Base Sepolia (chain ID 84532)** without spending anything.

**Live app: [dex.cryptohawking.com](https://dex.cryptohawking.com/swap)**

## What's deployed

Three AMM generations behind one UniversalRouter, all live-tested on-chain:

- **v2** — constant-product pairs (HawkingFactory / HawkingRouter)
- **v3** — concentrated liquidity (factory, SwapRouter, NonfungiblePositionManager, QuoterV2)
- **Infinity (v4-style)** — Vault + CL/Bin pool managers and position managers
- **Farms** — MasterChef (v2 LP farms + HAWK staking) and MasterChefV3 (v3 farming)
- **Faucet** — free test tokens (tUSDC, tUSDT, tDAI, tWBTC, HAWK), one claim per address per 24h

## Quickstart — swap on Base Sepolia in 5 minutes

1. Add Base Sepolia to your wallet: chain ID `84532`, RPC `https://sepolia.base.org`
2. Get free gas ETH from any public Base Sepolia faucet (Coinbase, Alchemy, QuickNode)
3. Claim test tokens: [dex.cryptohawking.com/faucet](https://dex.cryptohawking.com/faucet)
4. Swap: [dex.cryptohawking.com/swap](https://dex.cryptohawking.com/swap)
5. Launch your own token? Deploy any ERC-20 to Base Sepolia and create a pool at [dex.cryptohawking.com/add](https://dex.cryptohawking.com/add) — listing is permissionless

## Key contracts (Base Sepolia · 84532)

| Contract | Address |
| --- | --- |
| v2 Router | `0x57B76A5a7abAF54Ba7f88b402863CD313667B380` |
| v2 Factory | `0x8F2F1F21AaFfEC52E6A390E922E784bEA9E7D8C4` |
| v3 Factory | `0xf5c64e43dfF3CA1D6B64ebE13C857ae14fc41C61` |
| v3 SwapRouter | `0x4f8dBB1545F49CBfDeC3CC3693548f7a1FAEf17D` |
| UniversalRouter | `0x0180e61b23201479111D7595c7084Ce1D50f88d4` |
| HAWK token | `0x2843bABb7557CD51e8007F8D2a960457c734C570` |
| Faucet | `0x7264a007e40E52b767B1Ec749baf5Ae1860B113f` |

The complete registry — every contract, init-code hash, and seeded pool — is in [DEPLOYMENTS.md](DEPLOYMENTS.md). Known risks and testnet caveats are documented in [RISKS.md](RISKS.md).

## Repository layout

- `contracts/` — deployment tooling for the protocol layers
- `apps/web/` — the frontend (Next.js, PancakeSwap-architecture fork)
- `packages/deployments/` — machine-readable address registry (`base-sepolia.json`)
- `docs/` — design and phase plans

## Architecture & attribution

The protocol layer is a redeployment of the battle-tested, open-source **PancakeSwap** contract architecture (v2 AMM, v3 CLAMM, Infinity) with its own factories, init-code hashes, and routers on Base Sepolia — see [NOTICE](NOTICE) for upstream attribution and licenses. Callback interfaces are renamed (`hawkingV3*`) and the frontend is rewired to this deployment's addresses.

## Who built this

**Mudaser Iqbal (Crypto Hawking)** — blockchain consultant & smart contract auditor. ETHDenver 2025 winner, CTO @ Relymer, 100+ shipped projects.

- Free AI smart contract audit: [cryptohawking.com/audit](https://cryptohawking.com/audit)
- Hire me: [cryptohawking.com/services](https://cryptohawking.com/services) · WhatsApp +92 322 4274236

Everything on this exchange is a **testnet asset with zero real-world value** — a consequence-free environment to learn AMM mechanics, rehearse a token launch, or demo a product. Issues and PRs welcome.
