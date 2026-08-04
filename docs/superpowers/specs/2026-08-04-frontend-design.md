# CryptoHawking DEX Frontend — design spec

Date: 2026-08-04 · Status: awaiting user approval
Phase: prompt-pack Phase 8 (+ Phase 9 faucet page), Phase 7 deliberately deferred.

## Goal

`apps/web` (pancake-frontend fork, currently pristine and untracked) becomes the
CryptoHawking DEX: wired exclusively to our Base Sepolia deployments, branded so it
reads as **built by CryptoHawking** — the third product beside cryptohawking.com and
vibe.cryptohawking.com — and runnable locally with `pnpm dev`. Deployment to
dex.cryptohawking.com is a later phase.

Decisions already made with the user:

- Scope: **core DEX + farms** (Swap, Liquidity/Positions v2+v3+Infinity, Farms,
  NEST/HAWK staking, Faucet page). Everything else hidden/removed.
- Done = **runs locally** against live Base Sepolia contracts.
- Data: **on-chain only** (RPC + Multicall3 + QuoterV2/smart-router). No subgraphs,
  no PancakeSwap-hosted APIs. Info/analytics pages stay off until the subgraph phase.
- Approach: **adapt the monorepo in place**; build only the `web` app via turbo
  filters.

## 1. Trim scope first (pack §8.1)

Remove/disable routes + nav for: prediction, lottery, IFO, NFT marketplace/Pancake
Squad, perpetuals, affiliate, gift cards, bridge, veCAKE/gauges voting, trading
competition, teams/profile, external CMS content, games, blog. Aptos/Solana apps are
never built (turbo `--filter=web...`); their folders stay untouched for now.
Route folders under `apps/web/apps/web/src/{pages,views}` are deleted only where
cheap and safe; otherwise routes 404/redirect and nav entries are removed — the
invariant after each removal step is `pnpm build` (or at minimum `pnpm dev` compiles).

Keep: Swap, Liquidity (v2+v3+Infinity), Farms, Pools/Staking, and add Faucet.

## 2. Chain + SDK wiring (pack §8.2 — what makes it work)

Base Sepolia (84532) becomes the **only** enabled chain (`config/chains.ts`, wagmi
config, default chain, chain selector reduced to it). All `BASE_SEPOLIA` entries in
the SDK packages currently hold PancakeSwap's addresses and MUST be replaced with
ours (project rule 1/2):

| Package | What changes |
|---|---|
| `packages/chains` | Base Sepolia only; explorer → sepolia.basescan.org |
| `packages/v2-sdk` | HawkingFactory + our `initCodePairHash` |
| `packages/v3-sdk` | PoolDeployer, Factory, NPM + our `poolInitCodeHash` |
| `packages/smart-router` | v2/v3 factories, QuoterV2, InterfaceMulticall; stable-swap entries undefined without crashing (we deployed no stable-swap, no MixedRouteQuoter, no standalone SmartRouter — routing is client-side + QuoterV2) |
| `packages/infinity-sdk` | Vault, CL/Bin PoolManagers, position managers, quoters, CLTickLens |
| `packages/universal-router-sdk` | our UniversalRouter `0x0180…88d4` |
| `packages/tokens` | HAWK, NEST, tUSDC, tUSDT, tDAI, tWBTC, WETH from registry (verify decimals on-chain first — tokens are `t`-prefixed, no LINK; pack's table is superseded by what's deployed) |
| `packages/farms` | pools 0–3 (v2) + 3 v3 farms from registry; APRs computed client-side from on-chain data, Pancake APR service off |
| `packages/multicall` | canonical Multicall3 (unchanged address, verify wiring) |
| `packages/permit2-sdk` | canonical Permit2 (unchanged) |
| `apps/web/src/config/constants/contracts.ts` | MasterChef, MasterChefV3, NestBar, HAWK, NPM, etc. |

**No pasted hex in the frontend.** A codegen script
(`scripts/sync-frontend-addresses.ts` or equivalent) reads
`packages/deployments/base-sepolia.json` and generates/patches the SDK constant
files, and a check mode asserts frontend constants == registry so drift fails CI.
(The registry stays raw JSON this phase; upgrading it to the typed
`@cryptohawking/deployments` package is deferred.)

External data endpoints (price APIs, farm APR service, subgraphs, `pancakeswap.finance`
/ `.pancakeswap.` hosts): grep the whole app, then stub behind a single config flag so
the subgraph phase can re-enable cleanly. Prices derive on-chain (tUSDC = $1 peg).
Info/analytics routes are hidden. Position-NFT images 404 (known RISKS item).

## 3. Brand (extracted, not invented)

Source of truth: `packages/brand/BRAND.md` (extracted 2026-08-04 from live
cryptohawking.com; vibe.cryptohawking.com DNS-dead, logged in RISKS.md). Fallbacks
for anything unresolved come from the design brief and are marked ⚠ there.

Applied to `packages/uikit` theme tokens (dark + light, dark default, choice
persisted):

- Primary purple `#A855F7` family, pink `#EC4899` + indigo `#6366F1` in the
  signature CTA gradient `to right, #EC4899 → #A855F7 → #6366F1`; cyan `#22D3EE`
  secondary; gold `#F59E0B` reserved for HAWK/farm rewards.
- Surfaces: near-black `#0A0A0F` base, glassy cards (white 5% fill, white 10% 1px
  border, backdrop-blur) with purple glow accents; Pancake's bubblegum gradients
  deleted.
- Type: system sans everywhere (headings weight 900); Playfair Display only for
  marketing copy if ever; prices/numbers always `tabular-nums`.
- Radii 8/12/16/20/pill; glow shadow `0 0 20px rgba(168,85,247,.4), 0 0 40px rgba(236,72,153,.2)`.
- All "PancakeSwap"→"CryptoHawking", CAKE→HAWK, SYRUP→NEST in copy, meta, manifest,
  favicon, OG. Bunny/pancake illustrations and PancakeSwap social/docs links removed
  (brand assets are not code-licensed). Logo: circular mark from
  `packages/brand/reference/logo.jpg` (SVG-ization flagged in RISKS.md); DEX OG image
  generated in-brand.
- Persistent banner: **"Testnet — tokens have no value. Base Sepolia only."**

## 4. Wallet UX (pack §8.4)

Force Base Sepolia: wrong-network gate with "Switch to Base Sepolia"; "Add Base
Sepolia to wallet" and "Add HAWK token" (`wallet_watchAsset`) actions.

## 5. Faucet page (pack §9, adapted to the deployed contract)

Route `/faucet` inside the web app, same design language. Card grid for HAWK,
tUSDC, tUSDT, tDAI, tWBTC (+ a WETH card that wraps ETH): logo, symbol, drip
amount, user balance, cooldown countdown
(24h), Claim button, Add-to-wallet. Contract addresses with Basescan links at the
bottom; links out to public Base Sepolia ETH faucets. Wrong-network/cooldown/
rejected-tx states handled. The deployed Faucet's actual interface (claim-all,
ETH drip, per-token config) is read from `contracts/tokens` source during
implementation and the UI matches exactly what it supports — anything it lacks
(e.g. Turnstile/signature gating) is deferred and logged in RISKS.md.

## 6. Acceptance criteria (pack §8.5 minus subgraph-dependent items)

1. `pnpm dev` serves the app; wallet connects; correct network detected/forced.
2. Swap tUSDC→tUSDT via v2 route (on-chain tx succeeds from the UI).
3. Swap WETH→tUSDC via v3 route.
4. Swap via Infinity route (UniversalRouter).
5. Add + remove v2 liquidity.
6. Mint a v3 position + collect fees.
7. Farms page shows our 4 v2 + 3 v3 farms with non-zero APR; stake/harvest works.
8. Faucet page claims a token successfully.
9. No requests to `pancakeswap.finance` / `.pancakeswap.` hosts in the network log.
10. Testnet banner visible; branding shows no Pancake marks.

Verification: browser-automation smoke for render/console/network checks; the
on-chain flows exercised manually with the testnet wallet.

## Out of scope this phase

Subgraphs + `apps/api` (Phase 7), Info/analytics pages, deployment/Vercel/DNS
(Phase 10), tokenlist package build, typed deployments package, position-NFT
metadata API, custom hooks, Turnstile.

## Sequencing inside the phase

Brand tokens + chain/SDK wiring → swap works → liquidity/positions → farms →
faucet → trim/rebrand polish → acceptance pass. Small conventional commits;
every stub logged in RISKS.md.
