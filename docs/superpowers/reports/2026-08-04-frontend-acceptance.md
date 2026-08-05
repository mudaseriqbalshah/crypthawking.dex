# Task 15 — Acceptance pass (frontend phase)

Date: 2026-08-05 (run), branch `feat/frontend-phase`, chain **Base Sepolia (84532)**.
Deployer / acceptance account: `0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95`.
Explorer prefix for every hash below: `https://sepolia.basescan.org/tx/<hash>`.

TESTNET ONLY — all tokens are valueless test assets.

Commits landed: `4663445` (fix(frontend): close remaining pancake-host leaks) and
`4a199a3` (test(frontend): acceptance pass — tx-verified on base sepolia).
`.superpowers/sdd/**` is gitignored, so this report is not in either commit.

---

## 1. Address drift check

```
node scripts/check-frontend-addresses.mjs
```

Exit 0. All 18 checked constants match `packages/deployments/base-sepolia.json`
(v2 factory + INIT_CODE_PAIR_HASH, v3 factory/deployer/POOL_INIT_CODE_HASH/NPM,
UniversalRouter, Permit2, v2 router, QuoterV2, TickLens, routing-sdk quoter, tUSDC-as-USDC,
MasterChef, MasterChefV3, infinity Vault, CLPoolManager, BinPoolManager).

## 2. Dev server

```
pkill -f 'next dev'
cd apps/web && nohup pnpm dev > /tmp/dex-dev.log 2>&1 &
```

(`corepack pnpm dev` fails in this sandbox — corepack cannot write
`~/.cache/node/corepack`; the repo's pinned pnpm 9.11.0 on PATH was used instead.)
`/swap` returned 200 after ~5 min of first-run workspace builds. Exactly one `next dev`
process for the whole run.

## 3. Browser smoke

Runner: `node ~/.codegpt/skills/browser-automation/browser.mjs <url> --script scripts/acceptance/smoke.mjs`
(patchright/Playwright). Desktop 1440x900, mobile 390x844.

```
node <skill>/browser.mjs http://localhost:3000/swap --script scripts/acceptance/smoke.mjs --timeout 180000   # VIEWPORT=desktop SETTLE_MS=16000
SKIP_QUOTE=1 VIEWPORT=mobile SETTLE_MS=8000 node <skill>/browser.mjs ... --timeout 120000
SETTLE_MS=25000 node <skill>/browser.mjs http://localhost:3000/{farms,faucet} --script <scratch>/page-probe.mjs
node <skill>/browser.mjs http://localhost:3000/swap --script scripts/acceptance/quote.mjs --timeout 180000
```

| page | viewport | HTTP | title | banner | `pancake` resources | Pancake brand text |
|---|---|---|---|---|---|---|
| /swap | desktop | 200 | `Exchange \| CryptoHawking DEX` | ✅ | **0** | none |
| /liquidity/positions | desktop | 200 | `My Positions \| CryptoHawking DEX` | ✅ | **0** | none |
| /farms | desktop | 200 (probed alone; nav timed out inside the 4-page script) | `Farms \| CryptoHawking DEX` | ✅ | **0** | ⚠ `CAKE` |
| /faucet | desktop | 200 | `CryptoHawking DEX` | ✅ | **0** | none |
| /swap | mobile | 200 | ✅ | ✅ | **0** | none |
| /liquidity/positions | mobile | 200 | ✅ | ✅ | **0** | none |
| /farms | mobile | nav timeout (dev compile ~5.5 min) | ✅ | — | **0** | — |
| /faucet | mobile | 200 (re-probe) | ✅ | ✅ | **0** | none |

**The §6.9 criterion — zero `*.pancakeswap.*` requests — passed on every page at both
viewports.** That is the criterion the 15 leak-fix files target.

`/farms` content (probed alone, 25s settle): farm list renders with live APRs
**403%, 594.9%, 513.02%, 631.58%** plus two 0% rows, and `HAWK-ETH` / `HAWK-WETH`
labels.

`/faucet` content: "Testnet Faucet — Claim valueless CryptoHawking test tokens on Base
Sepolia. One claim() call drips all five tokens below. Cooldown: 24 hours." ✅

### Console errors — not zero

The "zero console errors" criterion **FAILS**. Everything observed falls into
already-logged degradations, but they are real errors:

| error | class |
|---|---|
| 404 `/web/native/84532.png`, `/web/wallets/*.png`, `/web/universalFarms/empty_list_bunny.png` | ASSET_CDN deliberately blanked (leak fix) → relative asset paths with nothing behind them |
| `https://bscrpc.com/` 401, `wss://nbstream.binance.click/wallet-connector` DNS fail | `@binance/w3w-core` connector probes BSC — logged |
| `https://www.googletagmanager.com/gtm.js?id=undefined` blocked | GTM id unset — logged |
| `/api/pools/tvlref` 400, `/api/pools/candidates` → `[]` | no pools/explore backend for 84532 |
| `/_next/static/chunks/quote-worker.js` ERR_ABORTED | quote worker |
| `auth.privy.io/...` aborted | Privy app id still upstream's — logged |

### Live quote on /swap — FAIL (superseded — see §7, now **PASS**)

`scripts/acceptance/quote.mjs` (120s of polling, default ETH→HAWK pair): the input keeps
its value, the page renders fully (banner, chain selector, `ETH` → `HAWK`, Connect
Wallet), and **no output amount ever appears**.

Root cause narrowed this run: the candidate-pool source is empty.
`GET /api/pools/candidates?...&protocol=v2,v3` → `{"data":[],...}`, and the dev server
logs `Failed to parse URL from /cached/pools/candidates/infinity/baseSepolia/...`
(`NEXT_PUBLIC_EXPLORE_API_ENDPOINT` blank — it was a PancakeSwap host) and
`API request failed with status 422`. With no candidate pools the router has nothing to
route over, so no quote is produced. Fix belongs in
`apps/web/apps/web/src/quoter/utils/edgePoolQueries.ts` (on-chain / registry-backed
candidate pools for 84532) or by deploying the subgraphs in `subgraphs/`.

## 4. On-chain acceptance flows

Two runners were used:

* `scripts/acceptance/onchain.mjs` — viem, deployer key from repo-root `.env`, calls the
  same contracts + selectors the frontend calls.
* `contracts/infinity/universal-router/script/TriSwapSmoke.s.sol` (forge) — drives all
  three protocols through the **UniversalRouter**, which is exactly the frontend's swap
  entrypoint (`SMART_ROUTER_ADDRESSES` is stubbed, so the UI always routes via UR).

All flows are **FALLBACK (script-driven)**, not UI-click-driven — see §6 for why.

### Swaps

| flow | path | tx | result |
|---|---|---|---|
| v2 swap tUSDC→tUSDT (direct router) | `HawkingRouter.swapExactTokensForTokens` | `0xfe01018c941bdb6205062080566ccc55be3adad907fa0e8d3d004fb5273041ba` | ✅ 1.000000 tUSDC → 0.993428 tUSDT |
| v3 swap WETH→tUSDC | `SwapRouter.exactInputSingle` fee 500 | `0x5c01d2defe22c7625790bb2c19b083188e7a0b3a7ce452223e87ce67a98ee526` | ✅ 0.0002 WETH → 0.744667 tUSDC |
| Permit2 approve for UR | `Permit2.approve(tUSDC, UR)` | `0x48a9b95f662ece9b5f67edc7696cb65f5743e9c36fbc98331c0c023e0d22acc9` | ✅ |
| **v2 swap via UniversalRouter** | `UR.execute(V2_SWAP_EXACT_IN)` | `0x5971fd88eee418892687168fb6f663b305c9399b78ed2622ba6fcbf370622710` | ✅ 5 tUSDC in |
| **v3 swap via UniversalRouter** | `UR.execute(V3_SWAP_EXACT_IN)` fee 100 | `0x9f64e9da175b04a9c53fed9e32eaaf79dfc1e624f3bb06118bc55e3db5524191` | ✅ 5 tUSDC in |
| **Infinity swap via UniversalRouter** | `UR.execute(INFI_SWAP)` CL fee 100 / tickSpacing 1 | `0x103c3ba854254395677c2f75e675015d2da0cfcbfc8f982451115b0f677cf586` | ✅ 5 tUSDC in |

Tri-protocol total out: **14.857752 tUSDT** for 15 tUSDC in. A successful UR execute also
re-validates both init code hashes end-to-end (a stale hash mis-predicts the pair/pool
address and reverts).

### Liquidity

| flow | tx | result |
|---|---|---|
| v2 addLiquidity tUSDC/tUSDT | `0xf8920764731827c2be3a78317210667578f9ee137b7fcfa4c027ba6f411d9884` | ✅ 1.000000 tUSDC + 0.995818 tUSDT → 0.997903 HAWK-LP minted |
| v2 removeLiquidity tUSDC/tUSDT | `0x8558f053947b4578afa672c346c4437aeda16a8e8936ba7a4ad6e0078a61b97b` | ✅ burned 0.997903 LP → 1.000510 tUSDC + 0.995881 tUSDT |
| v3 NPM.mint (tUSDC/tUSDT fee 100, ±20 ticks) | `0x35555de4786d62041ffd3b10ca329802f73f3d22a5047f0c7c54ada97041ec62` | ✅ tokenId **5** |
| v3 NPM.collect (tokenId 5) | `0x307e69e00d7b95b8438a77e2edbd6ac1f44c45eaca9b1ff0c1ea1de43006e581` | ✅ status 1 (0 fees — position just opened) |

### Farms

| flow | tx | result |
|---|---|---|
| MasterChef.deposit(pid 1, stake) | `0x2486802144ea922a58d5907506e9ee12d0d2cf1fb2405732c07debf91267e28c` | ✅ HAWK-WETH LP staked, pending HAWK accruing |
| harvest `deposit(1, 0)` — attempt 1 | `0xb181a174737ebe04bfd34b1b8645e54c047dc4a3d196156561a98b7c4be8fe3a` | ❌ reverted **OutOfGas** (viem estimate too low for the mint path) |
| harvest `deposit(1, 0)` — retry with `--gas-limit 900000` | `0xb3ba588bab493f42bceb9e64bc2e1939c9c875eff45ceda820375c93f1b02613` | ✅ 60.5 HAWK harvested (+6.05 HAWK dev cut minted) |
| MasterChef.withdraw(pid 1, stake) | `0x8a6d728797864cd7cbe507200406e7cd1233b481c7bda9cf5d7a667fda426f3c` | ✅ unstaked |

The OutOfGas is a **harness** issue (viem `estimateGas` on a path that mints + updates
pools), not a contract or frontend issue — wagmi/viem in the app applies a gas multiplier.
Flagged in RISKS.md.

### Faucet / WETH

| flow | tx | result |
|---|---|---|
| WETH wrap 0.001 ETH | `0x065a9b945a6359795aac094caa148f16226749828de05811feb3c4c74108a1b2` | ✅ `WETH9.deposit()` |
| `Faucet.claim()` from deployer | — | ⏳ reverts `Faucet: cooldown` (deployer claimed during Phase 1) |
| `Faucet.claim()` simulated from a never-claimed address | — | ✅ simulates cleanly → claim path live |

## 5. RISKS.md sweep

All required entries verified present before this run:

| required entry | present |
|---|---|
| WalletConnect projectId still upstream's | ✅ |
| SVG mark placeholder + OG image placeholder | ✅ (brand-extraction-gaps entry) |
| mixed-route quoter / SmartRouter / FOT detector absent | ✅ |
| infinity migrators / mixed-quoter / farming-distributor zero addresses | ✅ |
| v2Colors ramp follow-up | ✅ |
| wallet deeplink TODOs | ✅ |
| position-NFT tokenURI 404 (pre-existing) | ✅ |

A dated acceptance-summary entry was appended (UI-driven vs fallback, remaining
degradations).

## 6. Honest gaps

1. **No UI-driven, wallet-connected flow was proven.** The prior agent burned six attempts
   on three provider-injection mechanisms (`page.addInitScript`, CDP
   `Page.addScriptToEvaluateOnNewDocument`, HTML-response rewrite via `page.route`) — all
   suppressed by patchright, and post-load `page.evaluate` injection is too late because
   `walletsConfig`'s `installed` getter runs at mount. Full detail already in RISKS.md.
   **Every on-chain result above is FALLBACK (script), not a UI click.** Closing this needs
   a real browser profile with a MetaMask extension (Synpress-style) or plain Playwright.
2. **Swap quote does not render** (§6.2/§6.3 via the UI) — see §3. This is the single
   biggest open gap; the underlying contracts all swap fine by script.
3. **Console errors are not zero** — see the table in §3. All are classified degradations,
   none are `*.pancakeswap.*`.
4. **`CAKE` string reproduced on `/farms`.** RISKS.md had it logged as a one-off flake; it
   appeared again in this run's farms probe. It is a real intermittent copy leak and needs
   a follow-up hunt (the visible farm rows were correctly branded).
5. **`/farms` compile time in `next dev` reached ~5.5 min**, exceeding the 180s navigation
   budget inside the 4-page script. Pages were pre-warmed with `curl` before the final
   runs; a production build would not have this problem, but it means the multi-page
   scripted smoke is flaky on a cold server.
6. **Faucet `claim()` could not be executed from the deployer** (24h cooldown, claimed in
   Phase 1). Proven live by simulating from a never-claimed address instead.
7. **The MasterChef harvest needed a manual gas limit** after viem's estimate produced
   OutOfGas. Not reproduced through the app (which applies a gas multiplier), but worth
   watching.
8. `corepack pnpm` is unusable in this sandbox (cannot write `~/.cache/node/corepack`);
   the run used the pnpm 9.11.0 already on PATH, which matches the repo's pin.

---

## 7. Quote gap closed — §6.2/§6.3 criterion now **PASS**

Follow-up run, 2026-08-05. Commit `6cb5705`
(`fix(frontend): on-chain candidate pools for base sepolia quoting`), branch
`feat/frontend-phase`, single file changed:
`apps/web/apps/web/src/quoter/utils/poolQueries.ts`.

### Root cause (confirmed, more precise than §3)

The quoting pipeline runs three strategies (`single`, `routing-sdk`, `full`, see
`quoter/atom/routingStrategy.ts`). Two of them (`single`, `full`) fetch candidates through
**`fetchCandidatePoolsLite`**, which — unlike `fetchCandidatePools` — had **no testnet
short-circuit**. It called `edgePoolQueryClient.getAllCandidates` →
`/api/pools/candidates`, which proxies `NEXT_PUBLIC_EXPLORE_API_ENDPOINT` (a PancakeSwap
host, intentionally blanked in this fork).

The decisive detail: that endpoint answers **HTTP 200 with an empty list**, not an error.
`createAsyncCallWithFallbacks` only falls through on rejection/timeout, so a *successful*
empty response meant the on-chain fallback **never fired** and the router received zero
pools. (When the edge handler did error it returned 400 — also observed — but by then the
client had already cached the empty success.)

Two secondary blockers on the same path:

* the lite branch's infinity leg (`getInfinityCandidatePoolsLight`) fetches
  `/api/pools/tvlref`, backed by the same absent explorer API. `getEdgeChainName(84532)`
  is undefined → 400 → the leg rejects → the whole `Promise.all` rejects, discarding the
  v2/v3 pools that *did* resolve.
* `cacheByLRU`'s `requestTimeout: 3_000` is tuned for the remote pool API. On-chain
  candidate resolution is a full multicall round-trip against a public testnet RPC and
  regularly exceeds it.

### Fix (scoped to 84532; all other chains byte-identical)

On-chain candidate path preferred over any static registry list, so pools deployed later
are picked up with no config change:

1. `fetchCandidatePoolsLite` short-circuits for `ChainId.BASE_SEPOLIA` to the same on-chain
   sources `fetchCandidatePools` already uses for testnets — `getStableSwapPools`,
   `getV2CandidatePools`, `getV3PoolsWithTicksOnChain`, `getInfinityCandidatePools`
   (the fully on-chain variants, which carry their own ticks/bins and never touch
   `/api/pools/tvlref`).
2. `Promise.allSettled` instead of `Promise.all` on that branch — one failing protocol leg
   no longer discards the others' pools.
3. `requestTimeout` 3s → 20s for 84532 only.

No economic logic, no address constants, no package changes (so no `build:packages`).

### Verification — browser, DOM-asserted

Detached `next dev` (pnpm 9.11.0 on PATH; `corepack pnpm` still unusable in this sandbox),
runner `node <skill>/browser.mjs <url> --script scripts/acceptance/quote.mjs --timeout
180000`. Token pair selected via URL params so no token-picker clicking is involved.

| pair | url params | input | **DOM output amount** | route / detail shown |
|---|---|---|---|---|
| tUSDC → tUSDT | `inputCurrency=0x582800AF…59c2&outputCurrency=0x85323e23…D988` | `1` | **`0.99224` tUSDT** | Route `tUSDC → tUSDT`, Fee `0.0025 tUSDC`, Min received `0.9873 tUSDT`, Price Impact `<0.01%` |
| HAWK → WETH | `inputCurrency=0x2843bABb…C570&outputCurrency=0x42000000…0006` | `1` | **`0.000130` WETH** | Route `HAWK → ETH`, Fee `0.0025 HAWK`, Min received `0.0001302 WETH`, Price Impact `0.26%` |

Both runs report `"quoted": true` with a non-zero `amountOut` read back off the output
`<input>`, plus the full trade-detail panel rendered in `document.body.innerText`.
The 0.25% fee line confirms the v2 pair was routed over; the HAWK→WETH leg exercises the
HAWK/WETH pools. **Both pairs quote — criterion §6.2/§6.3 PASS.**

`*.pancakeswap.*` requests in both runs: **0** (§6.9 still holds). `/api/pools/candidates`
is no longer requested at all from `/swap` on this chain. Console errors are unchanged
from §3 (asset 404s, `bscrpc.com` 401, binance w3w WebSocket) — the "zero console errors"
criterion still FAILS for those already-logged degradations.

`npx tsc --noEmit -p apps/web/apps/web/tsconfig.json | grep -c "error TS"` → **31**,
baseline unchanged (verified on the exact committed code).

### Residual concerns

* **First quote after a cold start can still miss.** The first two probe runs of this
  session returned no amount before the 120s budget; later runs quoted reliably. On-chain
  candidate resolution is cold-cache expensive and shares an RPC that intermittently
  Cloudflare-403s (below). The 20s `requestTimeout` mitigates but does not eliminate this.
* **`https://sepolia.base.org` returned HTTP 403 (Cloudflare "Sorry, you have been
  blocked") to the Next edge runtime several times during this run**, while plain
  `curl`/`node fetch` to the same URL from the same host succeeded. Both `SERVER_NODES`
  and `PUBLIC_NODES` for 84532 list `sepolia.base.org` twice (the wagmi default is the same
  URL), so there is effectively **no RPC fallback**. Setting
  `NEXT_PUBLIC_BASE_SEPOLIA_RPC`, or adding a genuinely different public endpoint
  (`https://base-sepolia-rpc.publicnode.com` and `https://base-sepolia.gateway.tenderly.co`
  were both verified live this session), would make quoting materially more robust. Not
  done here — it is an RPC/config change outside this fix's scope.
* **`console.log` from app code does not reach the browser console in this build** (the
  Next compiler strips it), which is why in-page instrumentation had to be abandoned during
  diagnosis. Worth knowing for future debugging.
* The `/api/pools/candidates` and `/api/pools/tvlref` edge routes remain broken for 84532.
  They are now unused by `/swap`, but any future consumer of them will hit the same wall.

---

## Fix-wave — final review findings (2026-08-05)

Three findings from the whole-branch review, all fixed on `feat/frontend-phase`.

### 1. MUST-FIX — CAKE branding leak on `/farms`

`t('CAKE + Fees')` → `t('HAWK + Fees')` in
`apps/web/apps/web/src/views/Farms/components/FarmCard/FarmCard.tsx:85` and
`apps/web/apps/web/src/views/Farms/components/FarmCard/V3/FarmV3Card.tsx:62`;
`t('CAKE')` → `t('HAWK')` in
`apps/web/apps/web/src/views/Farms/components/MultiChainHarvestModal.tsx:143`. Grepped all
three files for sibling `CAKE` literals — each had exactly the one instance listed, nothing
else.

Since `packages/localization/src/config/translations.json` is the dictionary
`Provider.tsx` actually consumes (see §1 residual note this task's Task 11 report — a
missing key resolves to `''`, not the raw string), added `"HAWK + Fees": "HAWK + Fees"`
and `"HAWK": "HAWK"` next to the existing `CAKE` entries (kept, not removed — other,
untouched call sites still reference them) at
`apps/web/packages/localization/src/config/translations.json:585,1761` (post-edit line
numbers `586`/`1763`).

**Browser-verified** (dev server, `/farms`, card view via `#clickFarmCardView`): all three
V3 farms and all three V2 farms render `Earn: HAWK + Fees`. `document.body.innerText`
no longer contains `"CAKE + Fees"` anywhere on the page.

**Known out-of-scope residual:** `document.body.innerText.includes('CAKE')` is still
`true` in both table and card views — from `Reward/Day: 57600.00 CAKE` etc., which comes
from `apps/web/apps/web/src/views/PositionManagers/components/RewardPerDay.tsx:20`
(`{symbol ?? t('CAKE')}`), a shared component not among the three files/lines in this
fix-wave's findings list and not touched here per the "fix these, nothing else" scope.
Flagging for a future pass.

### 2. RECOMMENDED — RPC hardening for Base Sepolia

Added `'https://base-sepolia-rpc.publicnode.com'` immediately after
`'https://sepolia.base.org'` in both the `SERVER_NODES` and `PUBLIC_NODES`
`ChainId.BASE_SEPOLIA` arrays in `apps/web/apps/web/src/config/nodes.ts` (lines 91-96 and
180-185), directly addressing the "no RPC fallback" residual noted above in this same
report — `sepolia.base.org` is listed only once now with a genuinely different endpoint
backing it up. Env-var-first order (`NEXT_PUBLIC_BASE_SEPOLIA_RPC` still first) preserved.

### 3. MINOR — quoter fallback semantics alignment

`apps/web/apps/web/src/quoter/utils/poolQueries.ts`:
- `fetchCandidatePools`'s testnet `fallbackQuery` (used whenever `isTestnetChainId(chainId)`
  — i.e. every request on this deployment) switched from `Promise.all` to
  `Promise.allSettled`, with the same fulfilled-legs-kept / rejected-legs-dropped semantics
  already used by `fetchCandidatePoolsLite`'s on-chain-only path, so one protocol leg
  failing (RPC hiccup, no pools deployed for that protocol yet) no longer discards every
  other leg's results.
- Both `allSettled` rejection filters (the one just added and the pre-existing one in
  `fetchCandidatePoolsLite`) now log `console.warn('[quoter] candidate pool leg failed',
  reason)` on each rejected leg instead of silently dropping it.

`fetchCandidatePoolsLite`'s non-on-chain-only `fallbackQuery` (line ~257-265, still
`Promise.all`) was left as-is: it's only reached when `!isOnChainOnlyChain(chainId)`, i.e.
never on Base Sepolia, and is out of the stated scope (only the testnet fallback path and
the allSettled rejection filter were named).

### Verification

- `npx tsc --noEmit -p apps/web/apps/web/tsconfig.json` (run from repo root) →
  **31 errors**, all pre-existing (`views/Gift/**`, `useHasDynamicHook.ts`,
  `packages/utils/cacheByLRU.ts`), none in any file touched this wave. Baseline unchanged.
- `/farms`, card view, browser-driven: `innerText` contains `HAWK + Fees` (all 6 farms),
  does **not** contain `CAKE + Fees`. (`CAKE` alone still present — see residual above.)
- `/swap`: `scripts/acceptance/quote.mjs` against a warmed route returned a quote
  (`amountOut: "361.861"` for the default probe pair) with a populated route on the first
  try — no retry needed this run.
- Dev server run detached via `nohup … next dev &` from `apps/web/apps/web` (yarn itself
  failed with `EACCES` on `~/.config/yarn`, worked around with `npx next dev` directly),
  polled with short `curl`s, killed with `pkill -f "next dev"` at the end.

### Follow-up — remaining CAKE display fallbacks (2026-08-05)

Item 1's acceptance criterion was "no CAKE rendered on /farms", not just the three
reviewer-located `file:line`s. The `/farms` probe above still showed `CAKE` via
`Reward/Day: 57600.00 CAKE`, traced to
`apps/web/apps/web/src/views/PositionManagers/components/RewardPerDay.tsx:20`
(`{symbol ?? t('CAKE')}`) — a shared component consumed by both
`views/Farms/components/FarmCard/FarmCard.tsx` and
`views/Farms/components/FarmTable/Row.tsx`, so it renders in both card and table views.
Fixed: `t('CAKE')` → `t('HAWK')`.

Grepped `views/` for every other `t('CAKE'…)` / `'CAKE '`-shaped display literal
(`grep -rEn "t\('CAKE[' ]|t\(\"CAKE[\" ]|'CAKE '|\"CAKE \"" src/`), then checked each hit's
reachability from a live route on this Base-Sepolia-only deployment (does any file under
`pages/` import it, transitively, and is that page's `.chains` gate satisfied for
`ChainId.BASE_SEPOLIA`):

- **Unreachable, left alone** (confirmed no `pages/**` imports them, matching Task 11's
  page-deletion audit — `CakeStaking`, `Voting`, `Ifos`, `TradingCompetition`,
  `TradingReward`, `GaugesVoting`, `AffiliatesProgram`, `Lottery`, `Migration` all still
  have views on disk but no route reaches them): `views/CakeStaking/**`,
  `views/Voting/**`, `views/Ifos/**`, `views/TradingCompetition/**`,
  `views/TradingReward/**`, `views/GaugesVoting/**`, `views/AffiliatesProgram/**`,
  `views/Lottery/**`, `views/Migration/**`.
- **Unreachable for this chain specifically**: `views/Pools/index.tsx` ("Looking for v1
  CAKE syrup pools?") and `views/Pools/components/LockedPool/hooks/useUserEnoughCakeValidator.ts`
  ("Insufficient CAKE balance") — `pages/pools/index.tsx` gates on
  `@pancakeswap/pools`'s `SUPPORTED_CHAIN_IDS`, which does not include
  `ChainId.BASE_SEPOLIA`.
- **Fixed** — two additional reachable literals beyond `RewardPerDay.tsx`:
  - `apps/web/apps/web/src/components/Menu/UserMenu/WalletInfo.tsx:234` — `t('CAKE
    Balance')` → `t('HAWK Balance')`. `WalletInfo` is the connected-wallet dropdown
    rendered from the site-wide header `UserMenu`, reachable from every kept page
    including `/farms`, `/swap`, `/liquidity`, `/faucet`.
  - `apps/web/apps/web/src/views/universalFarms/components/PositionItem/PositionInfo.tsx:263`
    — `t('CAKE earned')` → `t('HAWK earned')`. Reachable via `pages/liquidity/pools.tsx`
    and `pages/liquidity/positions.tsx` → `UniversalFarms` → `PositionList` →
    `PositionItem` → `PositionInfo`.
- **Deliberately not touched, flagged for a future pass**: `views/Farms/components/YieldBooster/components/bCakeV3/StatusView.tsx`
  and `components/CrossChainVeCakeModal/**` contain several `veCAKE`/`Cake` display
  strings gated behind the cross-chain veCAKE-sync feature (comparing the locked/synced
  state against BSC). Most branches are BSC-only and inert here, matching the pattern Task
  11 already documented for adjacent hooks (`chainId === ChainId.BSC`, never true on Base
  Sepolia); one branch (`chainId !== ChainId.BSC`) is theoretically reachable but requires
  a connected wallet with an active, un-synced V3 farm stake to render, so it wasn't
  exercised or fixed in this pass to avoid an unverified, deeper rename inside a
  multi-chain sync feature whose behavior (and whether "CAKE" there means our token at all
  vs. real CAKE on BSC) needs a dedicated look. `components/AdPanel/Ads/AdPicks.tsx`'s
  `"PANCAKE PICKS"` was also left alone — that's a `PANCAKE`→brand-name match, not a
  `CAKE`-token-symbol literal, out of this fix-wave's stated pattern.

Also added `translations.json` keys for the two newly-fixed strings (same "missing key
resolves to `''`" reasoning as item 1): `"HAWK Balance": "HAWK Balance"` next to `"CAKE
Balance"`, and `"HAWK earned": "HAWK earned"` next to `"CAKE earned"`.

**Re-verified** (`/farms`, dev server, browser-driven): `#clickFarmCardView` clicked
in-script. `innerText.includes('CAKE')` → **`false`** in both table view (default) and
card view. `innerText.includes('HAWK + Fees')` → `true` in card view. Full card-view
snippet confirms `Reward/Day: 57600.00 HAWK` / `14400.00 HAWK` (was `CAKE`) alongside the
`Earn: HAWK + Fees` from item 1.

`npx tsc --noEmit -p apps/web/apps/web/tsconfig.json` (repo root) → 31 errors, unchanged,
none in files touched this follow-up.

Commit: `fix(frontend): remaining CAKE display fallbacks`.

## Wallet-connected UI pass (live) — 2026-08-05

Closes §6.1, the single biggest gap in this report: **"No UI-driven, wallet-connected flow
was proven."** It is now proven. Every transaction below was produced by clicking the real
UI on the deployed site — not by a script calling a contract.

- Target: **https://dex.cryptohawking.com** (production build, not `next dev`)
- Account: deployer `0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95`, Base Sepolia (84532)
- Harness: `scripts/acceptance/wallet-live.mjs` (new)

### The patchright wall is gone — plain Playwright injects fine

§6.1 concluded that provider injection was impossible because patchright suppressed
`page.addInitScript`, CDP `Page.addScriptToEvaluateOnNewDocument`, and (via `page.route`)
HTML-response rewriting. That conclusion was correct **about patchright** and wrong as a
general statement.

Under **plain Playwright** (installed in a throwaway dir, not added to any repo
`package.json`), `context.addInitScript` + `context.exposeFunction` works on the first
attempt: the page reported `{hasEthereum: true, isMetaMask: true}` before the app mounted,
so `walletsConfig`'s `installed` getter saw the provider and the wallet modal listed
Metamask as installed. No variant hunting was needed — the very first injection attempt
succeeded. **No technical wall remains; the blocker was the automation driver, not the app.**

The provider is a Node-side viem `walletClient` bridged into the page, announced over both
EIP-6963 (`rdns: io.metamask`) and legacy `window.ethereum`.

### Results

| flow | UI path | tx | result |
|---|---|---|---|
| **Connect wallet** | header "Connect Wallet" → modal → Metamask tile | — | ✅ header chip shows `0x...5e95`, balances render |
| **Swap 0.5 tUSDC → tUSDT** | `/swap`, amount 0.5, **Swap** → **Confirm Swap** | [`0xe99bd084f384147f4e0120c5f31159929869e981436671fd9c5f81b55a8d7abb`](https://sepolia.basescan.org/tx/0xe99bd084f384147f4e0120c5f31159929869e981436671fd9c5f81b55a8d7abb) | ✅ status 1, gasUsed 109,636, `to` = **UniversalRouter** `0x0180e61b…f88d4`. UI quoted 0.5 → 0.496145 tUSDT, price impact <0.01%, and rendered a "Transaction receipt / View on Basescan" toast |
| **Faucet WETH wrap 0.001** | `/faucet`, amount 0.001, **Wrap ETH** | [`0x240af06d3ceee2a3f9753d051c60ffef59993dd2305a48479ab1e68d27cb1715`](https://sepolia.basescan.org/tx/0x240af06d3ceee2a3f9753d051c60ffef59993dd2305a48479ab1e68d27cb1715) | ✅ status 1, gasUsed 27,766, `to` = WETH9 predeploy `0x4200…0006` |
| **Farm harvest** | `/farms`, **Harvest** on the staked row | [`0x497b82b911767e53983a3ae25af0a19e48b3b9fb88c612b231396cdd6265518c`](https://sepolia.basescan.org/tx/0x497b82b911767e53983a3ae25af0a19e48b3b9fb88c612b231396cdd6265518c) | ✅ status 1, gasUsed 122,457, `to` = **MasterChefV3** `0x8DBd87Df…84F6` |

No approval step appeared for the swap — the Permit2 allowance granted to the
UniversalRouter during the Task 15 script pass is still live, so the UI went straight to
**Swap → Confirm Swap**. The successful UR execute re-validates both init code hashes
end-to-end through the frontend's own routing, this time from a real click.

### Finding — selecting either swap token resets the other side

Reproduced deterministically on the live site, 4 rounds in a row:

- open the **To** selector and choose tUSDT → the panel becomes **ETH → tUSDT** (the From
  side snapped back to the ETH default)
- open the **From** selector and choose tUSDC → the panel becomes **tUSDC → HAWK** (the To
  side snapped back to the HAWK default)

So an arbitrary pair **cannot be assembled with two modal picks** — one side always
reverts to its default. The harness works around it by seeding both sides from the URL
(`/swap?inputCurrency=<addr>&outputCurrency=<addr>`), which resolves correctly to
`tUSDC → tUSDT` and is the path a shared swap link uses. This is a real usability defect
on the deployed build and should get its own fix pass; it is not a harness artifact —
`document.body.innerText` was asserted after every pick, and screenshots were captured.

Note this also explains §3/§6.2's original "no output amount ever appears" symptom being so
sticky: an operator driving the UI by hand lands on a nonsense pair (e.g. ETH → tUSDT with a
90% price impact and "Insufficient ETH balance") rather than the pair they selected.

### Other live-site observations

- `https://wallet-api.pancakeswap.com/v1/balances/<account>` is requested from the live
  origin and fails CORS. Upstream endpoint reached from three places
  (`apps/web/apps/web/src/hooks/useAddressBalance.ts:42` — overridable via
  `NEXT_PUBLIC_WALLET_API_BASE_URL`; `packages/price-api-sdk/src/getCurrencyPrice.ts:5`;
  `packages/smart-router/evm/v3-router/providers/getCommonTokenPrices.ts:155`). Not an
  address leak, but it is a live `*.pancakeswap.*` dependency on the deployed site.
- Console still logs `Error: client chain not configured. multicallAddress is required.`
  and the `nbstream.binance.click` / `bscrpc.com` probes from §3 — unchanged.
- One request returned **502** mid-run (site briefly unavailable); a retry passed.
- The wallet session does **not** survive a full page reload — wagmi's autoConnect has no
  extension storage behind an injected-only provider, so the header falls back to
  "Connect Wallet". Expected for this harness, not a site defect.

### Harness notes (`scripts/acceptance/wallet-live.mjs`)

Selector lessons worth keeping, all found the hard way against the live DOM:

- The `Swap | TWAP | Limit` **tab** also reads "Swap"; clicking it **resets the form**. The
  commit button is distinguished by width (tab w=129, commit w=446).
- Wallet-modal tiles and token rows are styled `<div>`s. A synthetic `el.click()` does not
  select; a computed row-centre mouse click can land on padding and dismiss the modal via
  its outside-click handler. Playwright's `locator.click()` on the symbol label is what works.
- Reading the selected pair by DOM order or geometry is unreliable — it matches the
  laid-out-but-offscreen language menu (it once reported the From token as "Suomalainen").
  Parse `document.body.innerText` for `<SYM>\nBase Sepolia` instead.
- Playwright/viem are deliberately **not** repo dependencies; install them in a scratch dir
  and pass `PW_DIR`.

The §6.7 concern — "the MasterChef harvest needed a manual gas limit after viem's estimate
produced OutOfGas" — did **not** reproduce through the UI: the app's own gas handling
produced a clean 122,457-gas harvest on the first click, exactly as §6.7 predicted it would.

Remaining §6 gaps not closed by this pass: §6.4 (intermittent `CAKE` leak — separately
addressed by the 2026-08-05 fix-wave above), §6.5 (`next dev` compile times — not
applicable to the production build tested here), §6.6 (faucet `claim()` cooldown — the
WETH wrap card was exercised instead, `claim()` is still on the deployer's cooldown), and
§6.8 (`corepack pnpm` in this sandbox).
