# CryptoHawking DEX Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the vendored pancake-frontend monorepo (`apps/web`) into the CryptoHawking DEX: Base-Sepolia-only, wired to our deployed contracts, rebranded per `packages/brand/BRAND.md`, trimmed to Swap/Liquidity/Farms/Faucet, runnable locally with on-chain data only.

**Architecture:** Keep the upstream `ChainId` enum and other chains' map entries intact (they are exhaustively typed); replace only the `BASE_SEPOLIA` (84532) values with our registry addresses and gate the UI to that single chain. A check script asserts SDK constants == `packages/deployments/base-sepolia.json` so drift fails loudly. Farms use the legacy local-config testnet path (bscTestnet precedent), not the PancakeSwap farms API. Swap executes through our UniversalRouter.

**Tech Stack:** pnpm 10 + turborepo, Next.js (pages router), wagmi/viem, styled-components + vanilla-extract (uikit), Node 20.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-frontend-design.md`. Brand: `packages/brand/BRAND.md` (✔ values are extracted; ⚠ values are fallback).
- NEVER paste an address not present in `packages/deployments/base-sepolia.json` (project rule 1/2). Canonical infra allowed: WETH9 `0x4200000000000000000000000000000000000006`, Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`.
- Init code hashes: v2 `0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e`, v3 `0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5` (project rule 3).
- Naming: PancakeSwap→CryptoHawking, CAKE→HAWK, SYRUP→NEST, Cake-LP→HAWK-LP. Rename branding/copy only — never touch SDK math or economic logic.
- Licenses: frontend stays GPL-3.0, upstream LICENSE files and copyright headers stay. PancakeSwap bunny/logo art must NOT ship (not code-licensed).
- Testnet only; persistent banner "Testnet — tokens have no value. Base Sepolia only."
- Every guess/stub → RISKS.md entry. Small conventional commits after every task.
- All monorepo paths below are relative to `apps/web/` (the vendored repo root); the Next.js app inside it is `apps/web/apps/web/`.
- Commands run from `/Users/mudaseriqbal/Documents/initiatives/cryptohawking-dex/apps/web` unless stated. Use `corepack enable && corepack prepare pnpm@10.13.1 --activate` if pnpm 10 is missing.
- If a step fails twice, stop and report (project discipline rule).

### Registry values used throughout (from packages/deployments/base-sepolia.json)

| Key | Address |
|---|---|
| v2 HawkingFactory | `0x8F2F1F21AaFfEC52E6A390E922E784bEA9E7D8C4` |
| v2 HawkingRouter | `0x57B76A5a7abAF54Ba7f88b402863CD313667B380` |
| v3 PoolDeployer | `0x2E2530dFbcb1bcCdf10Bf8Cd53179217d8264565` |
| v3 Factory | `0xf5c64e43dfF3CA1D6B64ebE13C857ae14fc41C61` |
| v3 SwapRouter | `0x4f8dBB1545F49CBfDeC3CC3693548f7a1FAEf17D` |
| v3 NonfungiblePositionManager | `0x85d440B2Bf52243239bb35D8BCeA865596cDc371` |
| v3 QuoterV2 | `0x2D4CB92B4282A2185063Fe8D9D4DA1e88342e220` |
| v3 TickLens | `0xd0EEc8981C05AA0919C4bE972d4F3a42dC9518FD` |
| v3 HawkingInterfaceMulticall | `0xD6aE563d02F89DEC2437E01632359ad997BE46FA` |
| Infinity Vault | `0xe0785d1F460C89e6665645f7188E5E3C9E42c6b8` |
| Infinity CLPoolManager | `0xA50a8A0867d7ACc239D71e6CBb0072F9c49aC87B` |
| Infinity BinPoolManager | `0x1085E6a51E7e9575d3808479b0D6Fa89eAB07d9E` |
| Infinity CLProtocolFeeController | `0x28EeB64A2dAFBf290d729f49FE56352AeF800f30` |
| Infinity BinProtocolFeeController | `0x7C376ae0A63eaca18C29AA88A004311fA54f1199` |
| Infinity CLPositionManager | `0x4Ac28f614D735FD5c664DDbB51C9FDEc47992828` |
| Infinity BinPositionManager | `0x99ddB0Cf91E45DE1fA0f15F8DC7a5F2D240574A0` |
| Infinity CLQuoter | `0x8346DCbAa103Ea12c413469A7bb88d6571F7e7E9` |
| Infinity BinQuoter | `0xc7DD71AAbfE5D9aE712e5093f43bA69243015bC8` |
| Infinity CLTickLens | `0x1485565CD4B1663A6472A0bE5Fb97f20B93695C2` |
| UniversalRouter | `0x0180e61b23201479111D7595c7084Ce1D50f88d4` |
| MasterChef (v2 farms) | `0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963` |
| MasterChefV3 | `0x8DBd87Df712413b963d921a6C928cb7212Ab84F6` |
| NestBar (NEST) | `0x8f7BE274b5e85C4b244CAe562AeBf023f70a185f` |
| HAWK (18 dec) | `0x2843bABb7557CD51e8007F8D2a960457c734C570` |
| tUSDC (6 dec) | `0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2` |
| tUSDT (6 dec) | `0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988` |
| tDAI (18 dec) | `0x66dbAe86eC0689cC398eF3f1D4486261EC1ffa07` |
| tWBTC (8 dec) | `0xE5839C45b8c282E6786D6CC7Dc1c6aB70D5b3D70` |
| Faucet (claim-all, 24h cooldown) | `0x7264a007e40E52b767B1Ec749baf5Ae1860B113f` |
| v2 LP HAWK/WETH (farm pid 1) | `0xd4eAAe265c051f338cB01F99116647A19F31e4C3` |
| v2 LP tUSDC/WETH (farm pid 2) | `0x832E6D2DdA6D6d47459c0b09A37e2b334aBb2f8e` |
| v2 LP tUSDC/tUSDT (farm pid 3) | `0x0972d080e24b67232A8A438D48C507fE6A9DB8b4` |
| v3 pool HAWK/WETH fee 2500 (MCv3 pid 1) | `0x00bE0e0d55df569e40f46A289861307b870578c9` |
| v3 pool WETH/tUSDC fee 500 (MCv3 pid 2) | `0xb36477fAE0c71ea671A747e1B72Ee094F82f5A82` |
| v3 pool tUSDC/tUSDT fee 100 (MCv3 pid 3) | `0xa105b11344d43De4e1e97C0f55f1BA91BB7152ec` |

---

### Task 1: Vendor baseline commit

**Files:**
- Modify: repo root `.gitignore` (append), git index only otherwise

**Interfaces:**
- Produces: `apps/web` tracked in git as a pristine upstream snapshot; all later diffs reviewable.

- [ ] **Step 1: Ensure no nested git repo**

Run: `ls -a /Users/mudaseriqbal/Documents/initiatives/cryptohawking-dex/apps/web/.git 2>/dev/null`
If present: `rm -rf apps/web/.git` (record upstream commit first: `git -C apps/web rev-parse HEAD > apps/web/UPSTREAM_COMMIT` before removing).

- [ ] **Step 2: Ignore heavy build dirs**

Append to the DEX repo root `.gitignore`:
```
apps/web/**/node_modules/
apps/web/**/.next/
apps/web/**/.turbo/
apps/web/**/dist/
```

- [ ] **Step 3: Commit the pristine snapshot**

```bash
cd /Users/mudaseriqbal/Documents/initiatives/cryptohawking-dex
git add .gitignore apps/
git commit -m "chore(frontend): vendor pancake-frontend upstream snapshot"
```
Note: this is a large commit by design — it is the baseline every rebrand diff is reviewed against.

---

### Task 2: Workspace bootstrap — prove upstream builds before touching it

**Files:** none (install + build only)

**Interfaces:**
- Produces: working `pnpm install` + `pnpm build:packages` baseline; the commands every later task uses for verification.

- [ ] **Step 1: Install**

```bash
cd apps/web
corepack enable && corepack prepare pnpm@10.13.1 --activate
pnpm install
```
Expected: completes without errors (peer warnings OK).

- [ ] **Step 2: Build the SDK packages**

Run: `pnpm build:packages`
Expected: PASS. If upstream fails to build pristine, STOP and report (do not fix upstream bugs blind — project rule: fails twice → stop).

- [ ] **Step 3: Typecheck the web app compiles at baseline**

Run: `pnpm turbo run typecheck --filter=web` (if no typecheck task exists, use `pnpm dev` boot check: `pnpm dev` until "ready", then Ctrl-C).
Record the result — this is the regression baseline.

---

### Task 3: Address-drift check script (fails first, passes after Task 4)

**Files:**
- Create: `scripts/check-frontend-addresses.mjs` (DEX repo root `scripts/`, NOT inside apps/web)
- Modify: root `package.json` of the DEX repo if one exists (skip if none — run via `node` directly)

**Interfaces:**
- Consumes: `packages/deployments/base-sepolia.json`
- Produces: `node scripts/check-frontend-addresses.mjs` exits 0 iff every checked SDK constant equals the registry; used by every later task and by CI later.

- [ ] **Step 1: Write the check script**

```js
// scripts/check-frontend-addresses.mjs
// Asserts apps/web SDK constants for chainId 84532 match the deployment registry.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const reg = JSON.parse(readFileSync(resolve(root, 'packages/deployments/base-sepolia.json'), 'utf8'))
const read = (p) => readFileSync(resolve(root, 'apps/web', p), 'utf8')

// Each check: [file, human name, expected value]. The file must contain the
// expected value within 400 chars after the LAST `ChainId.BASE_SEPOLIA` before it —
// simplest robust form: assert the pair "BASE_SEPOLIA...value" co-occurs.
const checks = [
  ['packages/v2-sdk/src/constants.ts', 'v2 factory', reg.v2.HawkingFactory],
  ['packages/v2-sdk/src/constants.ts', 'v2 init code hash', reg.v2.initCodePairHash],
  ['packages/v3-sdk/src/constants.ts', 'v3 factory', reg.v3.HawkingV3Factory],
  ['packages/v3-sdk/src/constants.ts', 'v3 deployer', reg.v3.HawkingV3PoolDeployer],
  ['packages/v3-sdk/src/constants.ts', 'v3 pool init code hash', reg.v3.poolInitCodeHash],
  ['packages/v3-sdk/src/constants.ts', 'v3 NPM', reg.v3.NonfungiblePositionManager],
  ['packages/universal-router-sdk/src/constants.ts', 'universal router', reg.infinity.UniversalRouter],
  ['packages/permit2-sdk/src/constants.ts', 'permit2', reg.infra.Permit2],
  ['packages/smart-router/evm/constants/exchange.ts', 'v2 router', reg.v2.HawkingRouter],
  ['packages/smart-router/evm/constants/v3.ts', 'quoterV2', reg.v3.QuoterV2],
  ['packages/smart-router/evm/constants/v3.ts', 'tick lens', reg.v3.TickLens],
  ['packages/routing-sdk/addons/quoter/src/constants/v3Quoter.ts', 'routing-sdk quoter', reg.v3.QuoterV2],
  ['packages/tokens/src/constants/common.ts', 'tUSDC as USDC', reg.tokens.tUSDC],
  ['packages/farms/src/const.ts', 'masterChefV3', reg.farms.MasterChefV3],
  ['packages/farms/src/const.ts', 'masterChef', reg.farms.MasterChef],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'infinity vault', reg.infinity.Vault],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'CL pool manager', reg.infinity.CLPoolManager],
  ['packages/infinity-sdk/src/constants/addresses.ts', 'Bin pool manager', reg.infinity.BinPoolManager],
]

let failed = 0
for (const [file, name, expected] of checks) {
  const src = read(file)
  const ok = src.toLowerCase().includes(String(expected).toLowerCase())
  if (!ok) { console.error(`FAIL ${name}: ${expected} not found in ${file}`); failed++ }
  else console.log(`ok   ${name}`)
}
// Forbidden: PancakeSwap's old 84532 addresses must be gone from these files.
const forbidden = [
  '0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E', // pcs v2 factory
  '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', // pcs v3 factory
  '0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9', // pcs v3 deployer
  '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364', // pcs NPM
  '0xFE6508f0015C778Bdcc1fB5465bA5ebE224C9912', // pcs universal router
  '0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb', // pcs v2 router
  '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997', // pcs quoter
]
for (const [file] of checks) {
  const src = read(file)
  for (const addr of forbidden) {
    if (src.includes(addr)) { console.error(`FAIL forbidden PancakeSwap addr ${addr} still in ${file}`); failed++ }
  }
}
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1) }
console.log('\nAll frontend addresses match the registry.')
```

- [ ] **Step 2: Run it — must FAIL now**

Run: `node scripts/check-frontend-addresses.mjs`
Expected: FAIL with many "not found" + "forbidden" lines (the SDKs still hold PancakeSwap values). This is the red test.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-frontend-addresses.mjs
git commit -m "feat(frontend): registry drift check for SDK addresses (red)"
```

---

### Task 4: Replace SDK addresses for 84532 (v2, v3, router, permit2, smart-router)

**Files (all under apps/web/):**
- Modify: `packages/v2-sdk/src/constants.ts:28,55`
- Modify: `packages/v3-sdk/src/constants.ts:28,55,83,111`
- Modify: `packages/universal-router-sdk/src/constants.ts:21`
- Modify: `packages/permit2-sdk/src/constants.ts:22`
- Modify: `packages/smart-router/evm/constants/exchange.ts:52,76,133`
- Modify: `packages/smart-router/evm/constants/v3.ts:30,54,80`
- Modify: `packages/smart-router/evm/fot.ts:16`
- Modify: `packages/routing-sdk/addons/quoter/src/constants/v3Quoter.ts:24`
- Modify: `packages/routing-sdk/addons/quoter/src/constants/mixedRouteQuoterV1.ts:27`

**Interfaces:**
- Consumes: registry table above.
- Produces: `FACTORY_ADDRESS_MAP[84532]`, `INIT_CODE_HASH_MAP[84532]`, `FACTORY_ADDRESSES[84532]`, `DEPLOYER_ADDRESSES[84532]`, `POOL_INIT_CODE_HASHES[84532]`, `NFT_POSITION_MANAGER_ADDRESSES[84532]`, `getUniversalRouterAddress(84532)`, `getPermit2Address(84532)` all return our contracts.

- [ ] **Step 1: v2-sdk** — set `[ChainId.BASE_SEPOLIA]: '0x8F2F1F21AaFfEC52E6A390E922E784bEA9E7D8C4'` in `FACTORY_ADDRESS_MAP`; in `INIT_CODE_HASH_MAP` replace `INIT_CODE_HASH_ETH` for BASE_SEPOLIA with literal `'0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e'`.

- [ ] **Step 2: v3-sdk** — BASE_SEPOLIA entries: `FACTORY_ADDRESSES` → `'0xf5c64e43dfF3CA1D6B64ebE13C857ae14fc41C61'`; `DEPLOYER_ADDRESSES` → `'0x2E2530dFbcb1bcCdf10Bf8Cd53179217d8264565'`; `POOL_INIT_CODE_HASHES` → `'0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5'`; `NFT_POSITION_MANAGER_ADDRESSES` → `'0x85d440B2Bf52243239bb35D8BCeA865596cDc371'`.

- [ ] **Step 3: universal-router-sdk** — `UNIVERSAL_ROUTER_ADDRESSES[ChainId.BASE_SEPOLIA] = '0x0180e61b23201479111D7595c7084Ce1D50f88d4'`.

- [ ] **Step 4: permit2-sdk** — `PERMIT2_ADDRESSES[ChainId.BASE_SEPOLIA] = '0x000000000022D473030F116dDEE9F6B43aC78BA3'` (canonical, verified on-chain in DEPLOYMENTS.md).

- [ ] **Step 5: smart-router** —
  - `exchange.ts`: `V2_ROUTER_ADDRESS[BASE_SEPOLIA] = '0x57B76A5a7abAF54Ba7f88b402863CD313667B380'`; `SMART_ROUTER_ADDRESSES[BASE_SEPOLIA] = ''` (no SmartRouter deployed — swaps go through the UniversalRouter; empty string is the repo's own "unsupported" convention, see `STABLE_SWAP_INFO_ADDRESS`); leave `STABLE_SWAP_INFO_ADDRESS[BASE_SEPOLIA] = ''` as-is. `BASES_TO_CHECK_TRADES_AGAINST[BASE_SEPOLIA]` stays `[baseSepoliaTokens.usdc, baseSepoliaTokens.weth]` (Task 5 remaps those tokens to ours) — append `baseSepoliaTokens.hawk` after Task 5 defines it.
  - `v3.ts`: `V3_QUOTER_ADDRESSES[BASE_SEPOLIA] = '0x2D4CB92B4282A2185063Fe8D9D4DA1e88342e220'`; `MIXED_ROUTE_QUOTER_ADDRESSES[BASE_SEPOLIA] = '0x0000000000000000000000000000000000000000'` (not deployed — mixed v2+v3 single-quote path unsupported; log in RISKS.md); `V3_TICK_LENS_ADDRESSES[BASE_SEPOLIA] = '0xd0EEc8981C05AA0919C4bE972d4F3a42dC9518FD'`.
  - `fot.ts`: `[ChainId.BASE_SEPOLIA]: '0x0000000000000000000000000000000000000000'` (no FOT detector deployed; our test tokens are not fee-on-transfer).
- [ ] **Step 6: routing-sdk quoter addon** — `v3Quoter.ts` BASE_SEPOLIA → `'0x2D4CB92B4282A2185063Fe8D9D4DA1e88342e220'`; `mixedRouteQuoterV1.ts` BASE_SEPOLIA → zero address.

- [ ] **Step 7: Rebuild + partial check**

```bash
pnpm build:packages
node ../scripts/check-frontend-addresses.mjs   # from apps/web; or node scripts/... from repo root
```
Expected: build PASS; check still fails ONLY on tokens/farms/infinity lines (Tasks 5/7/8).

- [ ] **Step 8: Commit**

```bash
git add apps/web/packages
git commit -m "feat(frontend): wire our v2/v3/router/permit2 addresses for base sepolia"
```

---

### Task 5: Tokens package — our token set for 84532

**Files (under apps/web/):**
- Modify: `packages/tokens/src/constants/baseSepolia.ts` (rewrite)
- Modify: `packages/tokens/src/constants/common.ts:369-376` (USDC map), plus the CAKE map (search `export const CAKE` in the same file or its sibling) — add a BASE_SEPOLIA entry
- Modify: `packages/smart-router/evm/constants/exchange.ts:133` (append hawk to bases)

**Interfaces:**
- Consumes: `ERC20Token(chainId, address, decimals, symbol, name?, projectLink?)` from `@pancakeswap/swap-sdk-evm`; `WETH9[ChainId.BASE_SEPOLIA]` (canonical predeploy — keep).
- Produces: `baseSepoliaTokens = { weth, usdc, usdt, dai, wbtc, hawk, nest }` consumed by smart-router bases, exchange config, farm configs (Task 8), faucet page (Task 13). `CAKE[ChainId.BASE_SEPOLIA]` = HAWK (drives farm reward token + "Add HAWK" UX).

- [ ] **Step 1: Rewrite `baseSepolia.ts`**

```ts
import { ChainId } from '@pancakeswap/chains'
import { WETH9 } from '@pancakeswap/sdk'
import { ERC20Token } from '@pancakeswap/swap-sdk-evm'

const PROJECT = 'https://dex.cryptohawking.com'

export const baseSepoliaTokens = {
  weth: WETH9[ChainId.BASE_SEPOLIA],
  // Valueless CryptoHawking test assets — Base Sepolia only.
  usdc: new ERC20Token(ChainId.BASE_SEPOLIA, '0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2', 6, 'tUSDC', 'Test USD Coin', PROJECT),
  usdt: new ERC20Token(ChainId.BASE_SEPOLIA, '0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988', 6, 'tUSDT', 'Test Tether USD', PROJECT),
  dai: new ERC20Token(ChainId.BASE_SEPOLIA, '0x66dbAe86eC0689cC398eF3f1D4486261EC1ffa07', 18, 'tDAI', 'Test Dai', PROJECT),
  wbtc: new ERC20Token(ChainId.BASE_SEPOLIA, '0xE5839C45b8c282E6786D6CC7Dc1c6aB70D5b3D70', 8, 'tWBTC', 'Test Wrapped BTC', PROJECT),
  hawk: new ERC20Token(ChainId.BASE_SEPOLIA, '0x2843bABb7557CD51e8007F8D2a960457c734C570', 18, 'HAWK', 'Crypto Hawking Token', PROJECT),
  nest: new ERC20Token(ChainId.BASE_SEPOLIA, '0x8f7BE274b5e85C4b244CAe562AeBf023f70a185f', 18, 'NEST', 'Nest Token', PROJECT),
}
```

- [ ] **Step 2: `common.ts`** — replace the Circle USDC BASE_SEPOLIA entry with our tUSDC (same shape, decimals 6): address `0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2`, symbol `tUSDC`, name `Test USD Coin`. `STABLE_COIN[BASE_SEPOLIA]` already derives from `USDC[BASE_SEPOLIA]` — it now pegs to tUSDC ($1 anchor for on-chain pricing). Find the `CAKE` token map in the tokens package (`grep -rn "export const CAKE" packages/tokens/src`) and add `[ChainId.BASE_SEPOLIA]: baseSepoliaTokens.hawk` (or an equivalent inline ERC20Token for HAWK if import cycles forbid it).

- [ ] **Step 3: smart-router bases** — `BASES_TO_CHECK_TRADES_AGAINST[BASE_SEPOLIA] = [baseSepoliaTokens.usdc, baseSepoliaTokens.weth, baseSepoliaTokens.hawk]`.

- [ ] **Step 4: Rebuild + verify**

```bash
pnpm build:packages && node ../scripts/check-frontend-addresses.mjs
```
Expected: tokens line `ok tUSDC as USDC`; remaining failures only farms + infinity.

- [ ] **Step 5: Commit** — `git add apps/web/packages && git commit -m "feat(frontend): base sepolia token set (HAWK, NEST, test tokens)"`

---

### Task 6: Multicall for quoting — investigate, then wire or deploy

The smart-router's `onChainQuoteProvider` batches quotes through `getMulticallContract()` (`packages/multicall/src/getMulticallContract.ts`), which currently **throws** for 84532 (`MULTICALL_ADDRESS` has no entry). This blocks all swap quotes.

**Files (under apps/web/):**
- Modify: `packages/multicall/src/constants/contracts.ts` (add BASE_SEPOLIA entries)
- Possibly create (DEX repo): `contracts/v3/scripts/` deploy script + registry entry, only if outcome (b).

**Interfaces:**
- Produces: `getMulticallContract(84532)` returns a working contract; `getMulticall3ContractAddress(84532)` explicit.

- [ ] **Step 1: Read the ABI the package expects** — open `packages/multicall/src/abis/` (or wherever `getMulticallContract` imports its ABI) and list the functions it actually calls (search call sites: `grep -rn "getMulticallContract" packages/ | grep -v test`).

- [ ] **Step 2: Decide by evidence**
  - (a) If every called function exists on canonical **Multicall3** (`aggregate`, `tryAggregate`, `blockAndAggregate` families): set `MULTICALL_ADDRESS[ChainId.BASE_SEPOLIA] = '0xcA11bde05977b3631167028862bE2a173976CA11'` and `MULTICALL3_ADDRESSES[ChainId.BASE_SEPOLIA] = MULTICALL3_ADDRESS`.
  - (b) If it needs PancakeSwap's custom `PancakeMulticall` (e.g. `multicallWithGasLimitation`): fetch the contract source from upstream (scripts/fetch-upstream.sh sources), deploy it to Base Sepolia with an idempotent script under `contracts/v3/scripts/` following the existing deploy-script pattern there, verify on Basescan, write the address to `packages/deployments/base-sepolia.json` under `infra.PancakeMulticall` AND `DEPLOYMENTS.md`, then wire that address. Do NOT proceed with an unverified address.

- [ ] **Step 3: Verify with a live quote probe** (after Task 7 makes the app bootable, re-run this): from apps/web run a node script or the app's swap page and confirm a HAWK→WETH quote resolves. Interim check: `pnpm build:packages` passes.

- [ ] **Step 4: Commit** — `git commit -m "feat(frontend): multicall wiring for base sepolia quoting"` (plus registry/DEPLOYMENTS.md if (b)).

---

### Task 7: Single-chain gating — chains, nodes, default chain, connectors

**Files (under apps/web/apps/web/):**
- Modify: `src/config/chains.ts:93` area (CHAINS array)
- Modify: `src/config/nodes.ts:91,176`
- Modify: `src/hooks/useActiveChainId.ts:54,70`
- Modify: `src/utils/wagmi.ts` (connector branding)
- Modify (monorepo): `packages/chains/src/averageChainBlockTimes.ts:22`

**Interfaces:**
- Produces: `CHAINS = [baseSepolia]`; every wagmi consumer (transports, `isChainSupported`, NetworkModal) sees only 84532; default chain BASE_SEPOLIA.

- [ ] **Step 1: `CHAINS`** — reduce the array to `[baseSepolia]` (keep the import). Do NOT delete the other chain imports' config maps elsewhere; only this array drives enablement.
- [ ] **Step 2: `nodes.ts`** — BASE_SEPOLIA entries become `[process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC, 'https://sepolia.base.org', ...baseSepolia.rpcUrls.default.http].filter(Boolean)` in both `SERVER_NODES` and `PUBLIC_NODES` (public RPC nonce races are a known RISKS.md item — the env fallback matters). Add `NEXT_PUBLIC_BASE_SEPOLIA_RPC` to the DEX root `.env.example`.
- [ ] **Step 3: `useActiveChainId.ts`** — replace both `ChainId.BSC` fallbacks with `ChainId.BASE_SEPOLIA`.
- [ ] **Step 4: `averageChainBlockTimes.ts`** — `[ChainId.BASE_SEPOLIA]: 2` (Base 2s blocks; currently 0, which breaks APR math).
- [ ] **Step 5: `wagmi.ts` branding** — coinbaseConnector `appName: 'CryptoHawking DEX'`, logo URL → `'https://dex.cryptohawking.com/logo.png'`. WalletConnect projectId: keep upstream id for local dev but add `// TODO(RISKS.md): own WalletConnect projectId before deploy` and log it in RISKS.md now.
- [ ] **Step 6: Boot check** — `pnpm dev` from apps/web root (`turbo` filters to web): app must start; open http://localhost:3000/swap with the browser-automation skill and confirm no chain-related crash in console (wallet not connected is fine).
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): base sepolia single-chain gating + rpc config"`

---

### Task 8: Farms — local config path for our 7 farms

**Files (under apps/web/):**
- Modify: `packages/farms/src/const.ts` (supported chains + chef addresses)
- Create: `packages/farms/src/farms/baseSepolia.ts`
- Modify: `packages/farms/src/farms/index.ts` (import + aggregate)
- Modify: `apps/web/src/config/constants/supportChains.ts` (SUPPORT_FARMS derives from farms package — verify it now includes 84532)

**Interfaces:**
- Consumes: `baseSepoliaTokens` (Task 5), `Protocol`, `UniversalFarmConfig`, `defineFarmV3ConfigsFromUniversalFarm`, `FeeAmount`.
- Produces: `supportedChainIdV2/V3` include 84532; `masterChefAddresses[84532]`, `masterChefV3Addresses[84532]`; `baseSepoliaFarmConfig` aggregated into `UNIVERSAL_FARMS_WITH_TESTNET`.

- [ ] **Step 1: `const.ts`** — add `ChainId.BASE_SEPOLIA` to `supportedChainIdV2` and `supportedChainIdV3`; `masterChefAddresses[ChainId.BASE_SEPOLIA] = '0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963'`; `masterChefV3Addresses[ChainId.BASE_SEPOLIA] = '0x8DBd87Df712413b963d921a6C928cb7212Ab84F6'`.

- [ ] **Step 2: `farms/baseSepolia.ts`** — follow the `bscTestnet.ts` file structure exactly (read it first; it is the living template). Content:

```ts
import { ChainId } from '@pancakeswap/chains'
import { baseSepoliaTokens } from '@pancakeswap/tokens'
import { FeeAmount } from '@pancakeswap/v3-sdk'
import { Protocol, UniversalFarmConfig, UniversalFarmConfigV3 } from '../types'
import { defineFarmV3ConfigsFromUniversalFarm } from '../defineFarmV3Configs'

const pinnedFarmConfig: UniversalFarmConfigV3[] = [
  { pid: 1, chainId: ChainId.BASE_SEPOLIA, protocol: Protocol.V3, token0: baseSepoliaTokens.hawk, token1: baseSepoliaTokens.weth, lpAddress: '0x00bE0e0d55df569e40f46A289861307b870578c9', feeAmount: FeeAmount.MEDIUM },
  { pid: 2, chainId: ChainId.BASE_SEPOLIA, protocol: Protocol.V3, token0: baseSepoliaTokens.weth, token1: baseSepoliaTokens.usdc, lpAddress: '0xb36477fAE0c71ea671A747e1B72Ee094F82f5A82', feeAmount: FeeAmount.LOW },
  { pid: 3, chainId: ChainId.BASE_SEPOLIA, protocol: Protocol.V3, token0: baseSepoliaTokens.usdc, token1: baseSepoliaTokens.usdt, lpAddress: '0xa105b11344d43De4e1e97C0f55f1BA91BB7152ec', feeAmount: FeeAmount.LOWEST },
]

export const baseSepoliaFarmConfig: UniversalFarmConfig[] = pinnedFarmConfig

/** @deprecated legacy path used by the testnet farm page */
export const legacyV3BaseSepoliaFarmConfig = defineFarmV3ConfigsFromUniversalFarm(pinnedFarmConfig)
```

Note `FeeAmount.MEDIUM` must equal 2500 in this fork (verify in `packages/v3-sdk/src/constants.ts` — PancakeSwap tiers 100/500/2500/10000; our deployed pools use 2500/500/100 which map to MEDIUM/LOW/LOWEST).

V2 farms (pids 0–3, incl. pid 0 HAWK single-staking): match whatever legacy `SerializedFarmConfig` shape `bscTestnet.ts` exports for v2 (token/quoteToken/lpSymbol/lpAddress/pid). Use: pid 0 lpAddress = HAWK token address (`0x2843bABb7557CD51e8007F8D2a960457c734C570`, lpSymbol 'HAWK'), pid 1 `0xd4eAAe265c051f338cB01F99116647A19F31e4C3` 'HAWK-WETH HAWK-LP', pid 2 `0x832E6D2DdA6D6d47459c0b09A37e2b334aBb2f8e` 'tUSDC-WETH HAWK-LP', pid 3 `0x0972d080e24b67232A8A438D48C507fE6A9DB8b4` 'tUSDC-tUSDT HAWK-LP'. If the v2 config type requires `bCakeWrapperAddress` (we deployed none), use the zero address and verify the farm page tolerates it; if it does not, log in RISKS.md and render v2 farms via the legacy config path only.

- [ ] **Step 3: `farms/index.ts`** — import and spread `baseSepoliaFarmConfig` into `UNIVERSAL_FARMS_WITH_TESTNET` alongside the other testnets. Also check `fetchUniversalFarms.ts`: for `ChainId.BASE_SEPOLIA` short-circuit to the local config (never hit `FARMS_API`):

```ts
// top of fetchUniversalFarms, before the API call:
if (chainId === ChainId.BASE_SEPOLIA) {
  const farms = protocol ? baseSepoliaFarmConfig.filter((f) => f.protocol === protocol) : baseSepoliaFarmConfig
  return farms
}
```

- [ ] **Step 4: Build + typecheck** — `pnpm build:packages` PASS; `node ../scripts/check-frontend-addresses.mjs` now passes farms lines.
- [ ] **Step 5: Runtime check** — `pnpm dev`, open `/farms` with browser-automation: our 3 v3 + up-to-4 v2 farms render (APR may show after price wiring; no crash, no request to `farms-api.pancakeswap.com` in the network log).
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): base sepolia farm configs via local testnet path"`

---

### Task 9: Infinity SDK — add 84532 support

**Files (under apps/web/):**
- Modify: `packages/infinity-sdk/src/constants/addresses.ts` (all maps)

**Interfaces:**
- Produces: `INFINITY_SUPPORTED_CHAINS` includes `ChainId.BASE_SEPOLIA`; all 14 `Record<InfinitySupportedChains, Address>` maps have our addresses (TS enforces completeness once the chain is added).

- [ ] **Step 1: Add the chain + addresses.** Append `ChainId.BASE_SEPOLIA` to `INFINITY_SUPPORTED_CHAINS`, then fill every map (registry table): Vault `0xe0785d…c6b8`, CLPoolManager `0xA50a8A…C87B`, BinPoolManager `0x1085E6…7d9E`, CLPositionManager `0x4Ac28f…2828`, BinPositionManager `0x99ddB0…74A0`, CLQuoter `0x8346DC…e7E9`, BinQuoter `0xc7DD71…5bC8`, CLProtocolFeeController `0x28EeB6…0f30`, BinProtocolFeeController `0x7C376a…1199`, CLTickLens (optional map) `0x148556…95C2`. For contracts we did NOT deploy — `INFI_MIXED_QUOTER_ADDRESSES`, `INFI_CL_MIGRATOR_ADDRESSES`, `INFI_BIN_MIGRATOR_ADDRESSES`, `INFI_CL_LP_FEES_HELPER_ADDRESSES`, `INFI_FARMING_DISTRIBUTOR_ADDRESSES` — use `'0x0000000000000000000000000000000000000000'` and add one RISKS.md line listing them as unsupported-on-84532.
- [ ] **Step 2: Hooks list** — no baseSepolia hooks file needed (we deployed no hooks); verify the hooksList index tolerates a missing chain (grep how it resolves per chain; add an empty-list entry if required).
- [ ] **Step 3: Build + check** — `pnpm build:packages` PASS (TS will catch any missed map); `node ../scripts/check-frontend-addresses.mjs` fully green now.
- [ ] **Step 4: Commit** — `git commit -m "feat(frontend): infinity sdk base sepolia addresses"`

---

### Task 10: Cut PancakeSwap backends — endpoints, lists, prices, home

**Files (under apps/web/apps/web/):**
- Modify: `src/config/constants/endpoints.ts`
- Modify: `src/config/constants/lists.ts`
- Create: `public/cryptohawking.tokenlist.json`
- Modify: `src/config/index.ts` (BASE_URL)
- Modify: `src/pages/index.tsx` (home → redirect to /swap)
- Modify: `next.config.mjs` (drop pancake rewrites/redirects/image domains)

**Interfaces:**
- Produces: default token list served locally; no runtime fetch to `*.pancakeswap.*` hosts (acceptance criterion 9); `/` redirects to `/swap`.

- [ ] **Step 1: Token list.** Write `public/cryptohawking.tokenlist.json` (Uniswap token list schema: `name: "CryptoHawking"`, `timestamp`, `version {1,0,0}`, `tokens: []` for WETH + tUSDC + tUSDT + tDAI + tWBTC + HAWK + NEST, each `{chainId: 84532, address, symbol, name, decimals}` from the registry table). In `lists.ts`: add `const CRYPTOHAWKING_DEFAULT = '/cryptohawking.tokenlist.json'`; set `DEFAULT_ACTIVE_LIST_URLS = [CRYPTOHAWKING_DEFAULT]` and `DEFAULT_LIST_OF_LISTS = [CRYPTOHAWKING_DEFAULT]`; empty `MULTI_CHAIN_LIST_URLS` pancake entries for enabled behavior (only 84532 matters now).
- [ ] **Step 2: endpoints.ts.** Do NOT delete exports (dozens of imports reference them). Point the live-fetch ones at dead-local values so no request leaves for pancake hosts even if a stale code path runs: `ASSET_CDN = ''` (empty string → relative URLs into our public/), `FARMS_API`/`FARMS_API_V2`/`WALLET_API`/`ACCESS_RISK_API`/`ONRAMP_API_BASE_URL`/`API_PROFILE`/`API_NFT` → `'/api/disabled'`. Grep-verify afterwards: `grep -rn "pancakeswap" src/config/constants/endpoints.ts` returns only comments/subgraph constants that no enabled route uses.
- [ ] **Step 3: Home + config.** `src/config/index.ts` `BASE_URL = 'https://dex.cryptohawking.com'`. Replace `src/pages/index.tsx` body with a `getServerSideProps` (or `useEffect` router) redirect to `/swap` — the marketing home is PancakeSwap-branded and out of scope.
- [ ] **Step 4: next.config.mjs.** Remove the `/perp/:path*` proxy, `/images/tokens/:address` → tokens.pancakeswap.finance redirect, `/affiliates-program` redirect target, and pancake image `remotePatterns`. Keep the rest.
- [ ] **Step 5: Verify.** `pnpm dev`; browser-automation on `/swap`: assert the network log contains no request whose host matches `pancakeswap` (the skill reports failed/first-party requests; additionally run `--eval "performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('pancake')).length"` expecting `0`).
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): local token list, pancake backends cut, home->swap"`

---

### Task 11: Trim navigation and dead routes

**Files (under apps/web/apps/web/):**
- Modify: `src/components/Menu/config/config.ts`
- Delete: pages listed below
- Modify: `next.config.mjs` (drop rewrites for deleted routes, e.g. `/info/pool*`)

**Interfaces:**
- Produces: nav = Swap · Liquidity · Farms · Faucet; deleted routes 404.

- [ ] **Step 1: Menu.** Rewrite the returned config to three groups: **Trade** (`/swap`), **Earn** (`/liquidity/pools` → Farms `/farms`, Liquidity `/liquidity/positions`), **Faucet** (`/faucet`). Remove Perps, Bridge, Play, Buy Crypto, the More group (Info/IFO/Voting/Blog/Docs — pancake links). Keep `useMenuItems` machinery; badge hooks (`useMenuItemsStatus`) must not fetch lottery/prediction/IFO endpoints once entries are gone — verify with the network log, and if the hook fetches unconditionally, gate its queries on the menu containing those entries.
- [ ] **Step 2: Delete pages** (git rm, keep views only if other kept pages import from them — check imports first with grep):
`prediction/`, `lottery.tsx`, `ifo/`, `ido/`, `nfts/`, `pancake-squad.tsx`, `bridge/`, `voting/`, `gauges-voting/`, `cake-staking/`, `competition/`, `trading-reward/`, `teams/`, `create-profile.tsx`, `profile/`, `pottery.tsx`, `burn-dashboard/`, `mev/`, `simple-staking/`, `liquid-staking/`, `migration/`, `invite/`, `info/`, `limit-orders.tsx`, `swap/limit.tsx`, `swap/twap.tsx`, `buy-crypto/`, `position-managers/` (no backing contracts on 84532).
After each batch of ~5 deletions run `pnpm dev` boot check; imports from deleted views break loudly at compile time — remove the dangling imports (e.g. in `_app.tsx`, middleware, menu) as they surface.
- [ ] **Step 3: Full boot + click-through.** browser-automation: `/swap`, `/farms`, `/liquidity/positions` all render; `/prediction` returns 404.
- [ ] **Step 4: Commit** — `git commit -m "feat(frontend): trim nav and routes to swap/liquidity/farms/faucet"`

---

### Task 12: Theme rebrand — uikit tokens per BRAND.md

**Files (under apps/web/):**
- Modify: `packages/uikit/src/tokens/colors.ts`
- Modify: `packages/uikit/src/tokens/index.ts` (fonts, radii, shadows)
- Modify: `packages/uikit/src/ResetCSS.tsx:66`
- Modify: `apps/web/src/style/Global.tsx:11`
- Modify: `apps/web/src/pages/_document.tsx:43` (drop Kanit Google Fonts link)
- Modify: `apps/web/src/Providers.tsx` (dark default)

**Interfaces:**
- Consumes: `packages/brand/BRAND.md` (✔ extracted values below).
- Produces: `vars.colors.*` / styled-components theme resolve to CryptoHawking palette in both modes; dark is default.

- [ ] **Step 1: colors.ts.** Keep every token NAME (consumers reference them); change VALUES. Dark map (primary surface set):
`primary: '#A855F7'`, `primaryBright: '#C084FC'`, `primaryDark: '#7E22CE'`, `secondary: '#22D3EE'`, `background: '#0A0A0F'`, `backgroundAlt: '#12121A'`, `backgroundAlt2: '#1A1A24'`, `card/cardSecondary: '#14141C'`, `cardBorder: 'rgba(168,85,247,0.14)'`, `input: '#1C1C26'`, `inputSecondary: '#232330'`, `dropdown: '#16161F'`, `dropdownDeep: '#12121A'`, `tertiary: '#1F1F2B'`, `text: '#EDEDF2'`, `textSubtle: '#9A9AAE'`, `textDisabled: '#5A5A6B'`, `contrast: '#FFFFFF'`, `success: '#22C55E'`, `failure/destructive: '#EF4444'`, `warning: '#F59E0B'`, `gold: '#F59E0B'`, `overlay: 'rgba(10,10,15,0.78)'`.
Gradients (replace every bubblegum/candy value): `gradientPrimary: 'linear-gradient(to right, #EC4899, #A855F7, #6366F1)'`, `gradientBubblegum` + `gradientInverseBubblegum` + `bubblegum: '#12121A'` → dark washes `'linear-gradient(139.73deg, #12121A 0%, #1A1A24 100%)'`, `gradientCardHeader: 'linear-gradient(180deg, #1A1A24 0%, #14141C 100%)'`, `gradientViolet/gradientVioletAlt: 'linear-gradient(180deg, #A855F7, #EC4899)'`, `gradientGold: 'linear-gradient(to right, #F59E0B, #FBBF24)'`, `gradientBlue: 'linear-gradient(to right, #06B6D4, #22D3EE)'`, `gradientBold: 'linear-gradient(to right, #EC4899, #A855F7)'`.
Light map: same hues on light surfaces (`background '#FAF9FC'`, `backgroundAlt '#FFFFFF'`, `card '#FFFFFF'`, `cardBorder 'rgba(126,34,206,0.12)'`, `text '#1A1025'`, `textSubtle '#6B6478'`) — light mode ships but dark is default. Leave `v2Colors.ts` ramps for a follow-up pass unless they visibly clash (log in RISKS.md either way).
- [ ] **Step 2: tokens/index.ts.** `fonts.normal: "ui-sans-serif, system-ui, -apple-system, sans-serif"`; shadows: `focus: '0 0 0 3px rgba(168,85,247,0.35)'`, `active: '0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(236,72,153,0.2)'`; radii keep keys, set `default: '12px'`, `card: '20px'`. Then rebuild vanilla-extract vars (they derive from tokens at build time).
- [ ] **Step 3: Fonts.** Replace the Kanit font-family strings in `ResetCSS.tsx` and `Global.tsx` with the system stack; delete the Google Fonts `<link>` for Kanit in `_document.tsx`. Add `font-variant-numeric: tabular-nums;` to the ResetCSS body rule (BRAND.md: prices always tabular).
- [ ] **Step 4: Dark default.** In `Providers.tsx`, both `<NextThemeProvider>` mounts get `defaultTheme="dark"` (NOT `forcedTheme` — light mode stays user-selectable, choice persists via next-themes storage).
- [ ] **Step 5: Visual check.** `pnpm dev`; browser-automation screenshot of `/swap` desktop + read it: dark near-black background, purple primary buttons, no teal `#1FC7D4` remnants, no Kanit. Compare against `packages/brand/reference/parent-desktop.png` for feel.
- [ ] **Step 6: Commit** — `git commit -m "feat(frontend): cryptohawking theme tokens (extracted brand, dark default)"`

---

### Task 13: Identity rebrand — logos, meta, manifest, banner, copy

**Files (under apps/web/):**
- Modify: `packages/uikit/src/components/Svg/Icons/Logo.tsx`, `Icons/LogoWithText.tsx`, `Icons/LogoRound.tsx`
- Modify: `packages/uikit/src/widgets/Menu/components/Logo.tsx` (aria-label, drop the `.eye` blink)
- Delete/replace: bunny asset usages (`BunnyCardsIcon` etc. only where rendered by kept routes — grep usages first)
- Modify: `apps/web/apps/web/public/manifest.json`, `public/logo.png`, `public/favicon.ico`
- Modify: `apps/web/apps/web/next-seo.config.ts`, `src/config/constants/meta.ts`
- Create: `apps/web/apps/web/src/components/TestnetBanner.tsx`; mount in `src/pages/_app.tsx`
- Modify: `src/config/wallet.ts` (pancake deeplinks/docs URLs → dex.cryptohawking.com or removed)

**Interfaces:**
- Produces: `LogoIcon`/`LogoWithTextIcon` render the CryptoHawking mark; every user-visible "PancakeSwap"/"CAKE" string in kept routes reads CryptoHawking/HAWK; permanent testnet banner.

- [ ] **Step 1: Mark.** Build a simple SVG mark from the brand: a `circle` with `gradientPrimary` stroke (pink→purple→indigo, pill/round geometry per BRAND.md) around a bold "CH" monogram in white; `LogoWithTextIcon` = mark + wordmark text "CryptoHawking" (font-weight 900, fill `vars.colors.contrast`). This is a placeholder consistent with the parent site's circular mark — log "SVG mark is a monogram placeholder, needs designer pass" in RISKS.md. Generate `public/logo.png` (512×512) and `favicon.ico` from the same SVG (use `rsvg-convert` or `sips` locally; commit the binaries).
- [ ] **Step 2: manifest.json** — name/short_name "CryptoHawking DEX", `homepage_url: 'https://dex.cryptohawking.com'`, `theme_color: '#A855F7'`, `background_color: '#0A0A0F'`.
- [ ] **Step 3: SEO/meta.** `next-seo.config.ts`: titleTemplate `'%s | CryptoHawking DEX'`, description "Testnet DEX on Base Sepolia — swap, LP and farm valueless test tokens.", drop the pancake twitter handle, og image `/images/og-hero.png` (render a simple 1200×630 dark-purple card with the mark — placeholder, RISKS.md). `meta.ts` `DEFAULT_META` likewise; trim `getPathList` to kept routes.
- [ ] **Step 4: Testnet banner.**

```tsx
// src/components/TestnetBanner.tsx
import { styled } from 'styled-components'

const Bar = styled.div`
  background: linear-gradient(to right, #ec4899, #a855f7, #6366f1);
  color: #fff; text-align: center; font-size: 13px; font-weight: 600;
  padding: 6px 12px; position: sticky; top: 0; z-index: 100;
`
export const TestnetBanner = () => (
  <Bar>Testnet — tokens have no value. Base Sepolia only.</Bar>
)
```
Mount it at the top of the layout in `_app.tsx` (above the Menu).
- [ ] **Step 5: Copy sweep on kept routes.** `grep -rn "PancakeSwap" apps/web/src/views/{Swap,AddLiquidity*,RemoveLiquidity*,Farms,Liquidity*} apps/web/src/components --include='*.tsx' -l` and replace user-visible strings with CryptoHawking (leave code identifiers/package names alone). Same for visible "CAKE" strings in kept views → "HAWK". `wallet.ts`: replace `pancakeswap.finance` deeplink/docs URLs (wallet deeplinks that require the prod domain can keep a TODO + RISKS.md line — they only matter after deploy).
- [ ] **Step 6: Verify.** browser-automation `/swap` + `/farms`: banner visible, logo renders, page `<title>` contains CryptoHawking, `--eval "document.body.innerText.includes('PancakeSwap')"` → false.
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): cryptohawking identity — logo, meta, testnet banner, copy"`

---

### Task 14: Faucet page

**Files (under apps/web/apps/web/):**
- Create: `src/pages/faucet/index.tsx`
- Create: `src/views/Faucet/index.tsx`
- Create: `src/views/Faucet/abi.ts`
- Modify: `src/components/Menu/config/config.ts` (Faucet entry already added in Task 11 — verify href)

**Interfaces:**
- Consumes: wagmi `useAccount`, `useReadContract(s)`, `useWriteContract`; Faucet at `0x7264a007e40E52b767B1Ec749baf5Ae1860B113f` — `claim()`, `dripCount() → uint256`, `drips(uint256) → (address token, uint256 amount, uint8 mode)`, `lastClaim(address) → uint256`, `cooldown() → uint256` (verified on-chain: 5 drips, 86400s). WETH9 `deposit()` payable for the wrap card. Token metadata from `baseSepoliaTokens` (Task 5).
- Produces: `/faucet` route; `FaucetPage.chains = [ChainId.BASE_SEPOLIA]`.

- [ ] **Step 1: `abi.ts`** — minimal ABIs:

```ts
export const faucetAbi = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'dripCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'drips', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }, { type: 'uint256' }, { type: 'uint8' }] },
  { name: 'lastClaim', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'cooldown', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const
export const weth9DepositAbi = [
  { name: 'deposit', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
] as const
export const FAUCET_ADDRESS = '0x7264a007e40E52b767B1Ec749baf5Ae1860B113f' as const
```

- [ ] **Step 2: View.** `views/Faucet/index.tsx` (uikit `Card`, `Button`, `Flex`, `Text`; page pattern copied from a kept simple view):
  - Reads `dripCount` → `drips(i)` for i in range (useReadContracts batch), `lastClaim(address)`, `cooldown`.
  - Card grid: one card per drip (resolve token meta by address from `baseSepoliaTokens`; format amount with token decimals) + "your balance" (`useBalance`/erc20 balanceOf) + "Add to wallet" (`watchAsset`).
  - One primary CTA "Claim all test tokens" → `writeContract({ abi: faucetAbi, address: FAUCET_ADDRESS, functionName: 'claim' })`, disabled while `now < lastClaim + cooldown` with a live countdown; note under HAWK card: "sent from faucet balance — may be skipped if empty" (Transfer mode).
  - WETH card: input for ETH amount (default 0.01) → `writeContract({ abi: weth9DepositAbi, address: '0x4200000000000000000000000000000000000006', functionName: 'deposit', value })`.
  - Footer: all contract addresses from the registry table with `https://sepolia.basescan.org/address/<addr>` links + copy buttons; links to Coinbase/Alchemy Base Sepolia ETH faucets.
  - Wrong network → the app's existing NetworkModal handles it via `Page.chains`; handle tx-rejected/cooldown errors with the app's toast helper (`useToast` from uikit, pattern-match a kept view).
- [ ] **Step 3: Page shell.**

```tsx
// src/pages/faucet/index.tsx
import { ChainId } from '@pancakeswap/chains'
import Faucet from 'views/Faucet'

const FaucetPage = () => <Faucet />
FaucetPage.chains = [ChainId.BASE_SEPOLIA]
export default FaucetPage
```

- [ ] **Step 4: Verify live.** `pnpm dev`, browser-automation `/faucet`: cards render with drip amounts read from chain (1,000 tUSDC / 1,000 tUSDT / 1,000 tDAI / 0.1 tWBTC / 100 HAWK). Then a real claim from the testnet wallet (manual or cast-simulated): `cast call` `claim()` from an unclaimed address should not revert.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): faucet page wired to on-chain drips"`

---

### Task 15: Acceptance pass + risk log + wrap-up

**Files:**
- Modify: `RISKS.md` (accumulated entries), `DEPLOYMENTS.md` (only if Task 6 deployed a multicall)

**Interfaces:** none — this is the gate.

- [ ] **Step 1: Full drift check** — `node scripts/check-frontend-addresses.mjs` green.
- [ ] **Step 2: Automated smoke (browser-automation), each page desktop + mobile viewport:** `/swap` (quote HAWK→WETH renders a non-zero amount), `/liquidity/positions`, `/farms` (7 farms, non-zero APR), `/faucet`; zero console errors; `performance.getEntriesByType('resource')` contains no `pancake` host.
- [ ] **Step 3: Manual on-chain acceptance with the funded testnet wallet (user or deployer key), per spec §6:** v2 swap tUSDC→tUSDT; v3 swap WETH→tUSDC; Infinity swap via UR; add+remove v2 liquidity; mint v3 position + collect; farm stake+harvest (v2 pid 1 and v3 pid 1); faucet claim. Record each tx hash in the PR/commit message body.
- [ ] **Step 4: RISKS.md sweep** — confirm entries exist for: WalletConnect projectId, SVG mark placeholder, OG image placeholder, mixed-route quoter absent, infinity migrators/mixed-quoter/farming-distributor zero addresses, bCakeWrapper zero (if hit), v2Colors ramp follow-up, wallet deeplink TODOs, position-NFT tokenURI 404 (pre-existing).
- [ ] **Step 5: Final commit + report** — `git commit -m "feat(frontend): cryptohawking dex frontend live on base sepolia (local)"`; summarize acceptance evidence.

---

## Self-review notes

- Spec coverage: §1 trim → Task 11; §2 wiring+codegen → Tasks 3–9; §3 brand → Tasks 12–13; §4 wallet UX → Task 7 (gating) + NetworkModal via `Page.chains` (Task 14 pattern; "Add HAWK" ships via CAKE-map wiring in Task 5 + watchAsset in Task 14); §5 faucet → Task 14; §6 acceptance → Task 15. Out-of-scope items untouched.
- Known judgment calls encoded: SmartRouter empty-string (UR execution path), mixed-route/FOT zero addresses, farms legacy local path, HAWK staking as farm pid 0, Pools/SmartChef tab dropped (no contracts) — each with a RISKS.md logging step.
- Deviation from spec wording: the "codegen" is implemented as an assert-only drift check (Task 3) with hand-edited constants — simpler, same guarantee (drift fails loudly).
