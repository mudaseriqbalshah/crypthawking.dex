# RISKS / open assumptions

Running log of anything guessed, stubbed, or blocked. Newest first.

- **2026-08-05 — FRONTEND PHASE ACCEPTANCE (Task 15): what actually passed, and how.**
  Full evidence in `.superpowers/sdd/2026-08-04-frontend-phase/task-15-report.md`.
  Summary of the gate:
  - **Ran UI-driven (browser, real DOM):** page render + HTTP 200 + testnet banner +
    no-Pancake-branding + no-`*.pancakeswap.*`-resource checks on `/swap`,
    `/liquidity/positions`, `/farms`, `/faucet` at 1440x900 and 390x844. **Re-verified
    2026-08-05 (final run):** `performance.getEntriesByType('resource')` contained
    **zero** `pancake` hosts on all four pages at both viewports — the §6.9 criterion
    the leak fixes target. `/farms` renders the farm list with live APRs
    (403%, 594.9%, 513.02%, 631.58% + two 0% rows) and `HAWK-ETH` / `HAWK-WETH`
    labels. Caveats from that run, all dev-server artifacts or already-logged
    degradations: `/farms` needs up to ~5.5 min to compile in `next dev` and exceeded
    the 180s navigation budget inside the multi-page script (it passes when probed
    alone); the previously "flaky" `CAKE` string on `/farms` **did reproduce** this
    time (`brand: "CAKE"` with the farm rows otherwise correctly branded) — it is a
    real, intermittent copy leak on that page, not just a loading artifact, and needs
    a follow-up; local `/web/native/84532.png`, `/web/wallets/*.png`,
    `/web/universalFarms/empty_list_bunny.png` 404 (ASSET_CDN deliberately blanked);
    `/api/pools/tvlref` 400 and `/api/pools/candidates` returns `[]`.
  - **Ran FALLBACK (script-driven, same contracts/selectors the UI calls):** every
    on-chain flow — v2 swap, v3 swap, Infinity swap, v2 add+remove liquidity, v3 mint
    + collect, farm stake/harvest/unstake, faucet claim, WETH wrap. All tx hashes are
    in the report. **No wallet-connected flow was exercised through the UI.**
  - **FAILED:** the swap form renders no quote for any pair (see the quote entry below),
    so §6.2/§6.3 "on-chain tx succeeds *from the UI*" is unproven end-to-end.
    **New root-cause evidence 2026-08-05:** the candidate-pool source is empty, so the
    router has nothing to route over. `GET /api/pools/candidates?...&protocol=v2,v3`
    returns `{"data":[]}`, and the dev server logs
    `Failed to parse URL from /cached/pools/candidates/infinity/baseSepolia/...`
    (`NEXT_PUBLIC_EXPLORE_API_ENDPOINT` is blank because it pointed at a PancakeSwap
    host) plus `API request failed with status 422`. `/api/pools/tvlref` 400s. The
    browser also shows `/_next/static/chunks/quote-worker.js net::ERR_ABORTED`.
    So the fix is: give `edgePoolQueries` an on-chain/registry-backed candidate-pool
    path for 84532 (or deploy the subgraphs in `subgraphs/`), not a quoter tweak.
  - Remaining degradations carried out of the phase: local `/web/**` asset 404s, no
    quoting/APR/explore backends, Privy+Firebase still upstream's, `@binance/w3w-core`
    probing public BSC RPCs, WalletConnect projectId still upstream's.

- **2026-08-05 — Swap quote does not render on Base Sepolia (Task 15 acceptance, OPEN,
  blocks spec §6.2/§6.3 via the UI).** Typing an amount into `/swap` produces no output
  amount and no error in the swap card, for the default ETH→HAWK pair *and* for
  tUSDC→tUSDT (a pair with live v2, v3 and Infinity pools — all three were swapped
  successfully by script in the same session). Verified over 60s of polling, input value
  sticks (`0.01`), the USD estimate for the input renders (`~10.00 USD`), so token
  metadata and pricing resolve; only the route/quote is missing. Not conclusively
  isolated. Candidate causes, in order of suspicion: (1) the quoter is wired to the
  upstream X-API (`NEXT_PUBLIC_QUOTING_API`, previously `https://x.pancakeswap.com`,
  blanked in this task because it is a PancakeSwap host — §6.9) with no working
  client-side fallback for 84532; (2) SmartRouter / mixed-route quoter absent on
  Base Sepolia (already logged below, 2026-08-04); (3) the quote worker chunk
  (`quote-worker.js`) failing to load. Next step for whoever picks this up: instrument
  `apps/web/src/quoter/**` and confirm whether the on-chain quote provider (which is why
  `HawkingMulticall` was deployed in Task 6) is reached at all.

- **2026-08-05 — Headless wallet-connected UI acceptance is not achievable with the
  current browser tooling (Task 15).** Six attempts across three injection mechanisms;
  a viem-backed EIP-1193 provider (`scripts/acceptance/wallet.mjs`) works correctly in
  Node but cannot be made visible to the app at the right time:
  1. `page.addInitScript` — patchright (the stealth Playwright fork the browser-automation
     skill drives) executes init scripts in an **isolated world**; probed and confirmed
     (`window.__initRan === false` in the main world while `page.exposeFunction` bindings
     and `page.evaluate` globals *are* visible there).
  2. CDP `Page.addScriptToEvaluateOnNewDocument` (with `Page.enable`/`Runtime.enable`,
     `runImmediately`) — accepted without error, script never runs. Also suppressed.
  3. Rewriting the HTML document response via `page.route` and prepending an inline
     `<script>` (CSP nonce copied from Next.js's own tags) — the fulfil succeeds,
     the script still does not execute.
  Post-load `page.evaluate` injection *does* work (`window.ethereum.isMetaMask === true`,
  correct `selectedAddress`) but is too late: `walletsConfig`'s `installed` getter in
  `apps/web/src/config/wallet.ts` is evaluated as the app mounts, so the connect modal
  renders the "Metamask is not installed / Install" step instead of connecting, and the
  connector never issues a single RPC call. Two incidental findings worth keeping:
  the Next.js dev overlay (`<nextjs-portal>`) covers the viewport and silently eats
  Playwright clicks (`killDevOverlay` in `wallet.mjs` strips it), and the wallet-list
  entries are styled-component `<div>`s, not `<button>`s, so role/name lookups miss them.
  Consequence: **all wallet-connected acceptance ran script-driven, not UI-driven.**
  To close this properly, either run a real browser profile with a MetaMask extension
  (Synpress-style) or drive standard Playwright rather than patchright.

- **2026-08-05 — PancakeSwap-host leaks closed during the acceptance pass (Task 15,
  spec §6.9).** The smoke found live requests to PancakeSwap-operated hosts on the
  acceptance pages, which §6.9 forbids. Fixed in this task (disclosed as scope beyond a
  pure gate, because the criterion is binary):
  `packages/uikit/src/util/endpoints.ts`, `packages/widgets-internal/utils/endpoints.ts`,
  `packages/ui-wallets/src/WalletModal.tsx`, `packages/ui-wallets/src/components/
  SocialLoginModal.tsx` (ASSET_CDN default `https://assets.pancakeswap.finance` → `''`);
  `apps/web/src/components/Logo/CurrencyLogoV2.tsx` and `apps/web/src/views/Info/
  components/CurrencyLogo/index.tsx` (native/token image CDNs dropped);
  `packages/widgets-internal/components/CurrencyLogo/utils.ts` and
  `apps/web/src/utils/tokenImages.ts` (`tokens.pancakeswap.finance` → optional
  `NEXT_PUBLIC_TOKEN_IMAGE_CDN`, unset ⇒ no URL);
  `apps/web/src/components/AdPanel/hooks/usePicksConfig.tsx`,
  `packages/smart-router/evm/v3-router/functions/getAdditionalBase.ts`,
  `apps/web/src/quoter/atom/routingStrategy.ts` (proofs.pancakeswap.com CMS fetches now
  gated on `NEXT_PUBLIC_PROOF_API`, unset ⇒ skipped);
  `apps/web/src/state/farmsV4/state/poolApr/fetcher.ts` (Merkl `mainProtocolId=pancake-swap`
  query gated on `NEXT_PUBLIC_MERKL_API`); and `apps/web/.env` + `.env.development`
  (MM/quoting/proof/explore endpoints blanked). Not exhaustive — `grep -rn
  'pancakeswap\.\(finance\|com\)'` still hits ~20 files under trimmed/unreachable views
  (Pools, CakeStaking, Pottery, AffiliatesProgram, IFO, solana/jupiter packages) and the
  `PANCAKE_*` token-list constants in `config/constants/lists.ts`. Those did not fire on
  the acceptance pages but should be swept before any public deploy.

- **2026-08-05 — Privy social login + Firebase still use upstream PancakeSwap's project
  credentials (Task 15, violates CLAUDE.md rule 1, OPEN).** `NEXT_PUBLIC_PRIVY_APP_ID`
  (`cm9jd1prg03msl80mz1jnuv9f`), `NEXT_PUBLIC_PRIVY_CLIENT_ID`, `NEXT_PUBLIC_FIREBASE_API_KEY`
  and `NEXT_PUBLIC_FIREBASE_APP_ID` in `apps/web/apps/web/.env.development` are
  PancakeSwap's. Blanking them was attempted and **reverted**: `@privy-io/react-auth`
  hard-throws `Cannot initialize the Privy provider with an invalid Privy app ID` and the
  whole app 500s, because `usePrivy` is consumed unconditionally by
  `apps/web/src/components/WalletModalV2/WalletModal.tsx` and
  `apps/web/src/contexts/Privy/provider.tsx`. Properly removing the social-login stack
  (or gating the provider behind a feature flag with stubbed hooks) is follow-up work.
  The upstream `console.error` on missing Privy env vars was removed in
  `apps/web/src/contexts/Privy/privy.tsx` since unconfigured is our intended state.
  Live consequence: every page load hits `auth.privy.io` (fails, non-fatal).

- **2026-08-05 — `/web/**` static assets 404 locally (Task 15; the deferred Task-10
  `ASSET_CDN=''` item, now confirmed live).** With `NEXT_PUBLIC_ASSET_CDN=''` the wallet,
  chain and native-currency icons resolve to relative paths that do not exist under
  `apps/web/apps/web/public/`: `/web/wallets/{metamask,trust,okx-wallet,binance-w3w,
  coinbase,walletconnect,opera,brave}.png`, `/web/chains/84532.png`,
  `/web/chains/square/84532.svg`, `/web/native/84532.png`,
  `/web/universalFarms/empty_list_bunny.png`. ~10 console 404s per page load on every
  acceptance page. Not a Pancake-host leak (that was the point of the change) and not
  functional — the UI renders with broken images — but it is the single largest source of
  console noise and should be closed by adding our own icons under `public/web/**`.

- **2026-08-05 — No quoting / APR / explore backends exist for 84532 (Task 15).** With
  the upstream endpoints blanked, the app now requests local URLs that nothing serves:
  `/v1/routes` (bridge API, 404), `/api/pools/tvlref` and `/api/pools/candidates`
  (HTTP 400 on `/liquidity/positions`), and `http://localhost:4123/cached/pools/apr/
  {v2,v3,stable}/base-sepolia/farms-lp` (connection refused — `NEXT_PUBLIC_EXPLORE_API_ENDPOINT`
  blank falls back to a hardcoded `http://localhost:4123` in
  `apps/web/src/state/info/api/client.ts`). Farms still show non-zero APR because the
  values are computed on-chain; the explore API is only a cache. These are Phase-7
  (`apps/api` + subgraphs) work, explicitly out of scope for this phase.

- **2026-08-05 — `@binance/w3w-core` probes public BSC RPCs on every page load
  (Task 15).** `https://bscrpc.com/` (HTTP 401), `bsc-dataseed2.ninicoin.io`,
  `rpc.ankr.com/bsc`, `binance.nodereal.io`, plus a `wss://nbstream.binance.click/
  wallet-connector` websocket that fails DNS. Comes from the Binance Web3 Wallet
  connector in `apps/web/src/utils/wagmi.ts`, not from our chain config. Harmless but
  noisy, and it is a third-party network dependency on a testnet-only fork — consider
  dropping the connector from `CONNECTORS`.

- **2026-08-05 — "CAKE" text reproduced on `/farms` (Task 15).** The flaky observation
  logged 2026-08-04 (bottom of this file) **reproduced deterministically** during the
  acceptance smoke: `document.body.innerText` on `/farms` matches `CAKE` once farm rows
  have loaded. Farm pair labels themselves are correct (`HAWK-ETH`, `ETH-tUSDC`,
  `tUSDC-tUSDT`, `HAWK-WETH`, `tUSDC-WETH`), so this is a residual label elsewhere on the
  page (likely a reward-token or earnings column). Spec §6.10 says branding must show no
  Pancake marks — treat as an open branding defect, not a flake.

- **2026-08-04 — frontend Infinity SDK: 5 contracts unsupported on Base Sepolia (Task 9).**
  `INFI_MIXED_QUOTER_ADDRESSES`, `INFI_CL_MIGRATOR_ADDRESSES`, `INFI_BIN_MIGRATOR_ADDRESSES`,
  `INFI_CL_LP_FEES_HELPER_ADDRESSES`, `INFI_FARMING_DISTRIBUTOR_ADDRESSES` (all in
  `apps/web/packages/infinity-sdk/src/constants/addresses.ts`) point at the zero address for
  `ChainId.BASE_SEPOLIA` — none of these are deployed on 84532. Vault, CLPoolManager,
  BinPoolManager, CLPositionManager, BinPositionManager, CLQuoter, BinQuoter,
  CLProtocolFeeController, BinProtocolFeeController and CLTickLens are all live and wired
  to the addresses in `packages/deployments/base-sepolia.json`.

- **2026-08-04 — frontend farms (Task 8 fix round): RESOLVED — V2 farms now render with
  live on-chain data, and HAWK/USD is derived on-chain with zero BSC/Chainlink
  dependency.** Supersedes the two Task 8 entries below (kept for history).
  What the fix round changed:
  1. *Chain-aware V2 fetch.* `createFarmFetcher.fetchFarms` (`packages/farms/src/index.ts`)
     now resolves the chef via `masterChefAddresses[chainId]` (falling back to the old
     `isTestnet ? BSC_TESTNET : BSC` guess only for chains with no entry), and
     `fetchMasterChefV2Data`/`fetchMasterChefData` (`packages/farms/src/v2/fetchFarmsV2.ts`)
     take a real `chainId` instead of deriving one from `isTestnet`. `ChainId.BASE_SEPOLIA`
     is now in `supportedChainIdV2`. BSC/BSC_TESTNET resolve to the identical addresses and
     chain ids they did before.
  2. *Legacy config gate.* `getLegacyFarmConfig` gated the whole legacy V2 config on
     `supportedChainIdV4` — a list that also drives the Merkl APR API, the explorer pool
     queries and the farmsV4/Infinity fetchers, none of which know chain 84532. It now
     allows BASE_SEPOLIA explicitly; every other chain keeps its previous gate exactly.
  3. *Our chef is MasterChef **v1**, not MasterChefV2.* `contracts/farms/contracts/MasterChef.sol`
     (deployed at `0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963`) exposes `totalAllocPoint()`,
     `cakePerBlock()` and a 4-field `poolInfo` — the frontend spoke MasterChefV2's
     `totalRegularAllocPoint()`/`totalSpecialAllocPoint()`/`cakePerBlock(bool)` and 5-field
     `poolInfo`, so every call reverted (verified on-chain). `fetchFarmsV2.ts` now carries a
     `CLASSIC_MASTERCHEF_V1_CHAIN_IDS` list (BASE_SEPOLIA only) and a v1 ABI branch in both
     fetchers; chains off that list are untouched.
  4. *No PancakeSwap price API.* `farmV2FetchFarms` fell back to `getCurrencyListUsdPrice`
     (PancakeSwap-hosted, no chain-84532 coverage) for any token it couldn't price, and that
     call *throws* rather than resolving empty — one unpriced test token rejected the whole
     V2 fetch and left every row in its loading skeleton. Skipped for v1-chef chains; prices
     come from `getFarmsPrices`' on-chain reserve cascade off the tUSDC/WETH anchor in
     `evmNativeStableLpMap` instead.
  5. *HAWK/USD price.* `fetchBaseSepoliaHawkUsdPrice` (`packages/farms/src/fetchFarmsV3.ts`)
     derives it live from our own V2 pairs — HAWK/WETH reserves priced through tUSDC/WETH
     with tUSDC pegged $1 — reading `token0()`/`getReserves()` each call rather than
     assuming ordering. `useCakePrice` / `getCakePriceFromOracle` now use it for 84532
     instead of reading the BSC mainnet Chainlink CAKE feed. Verified: on-chain reserves
     380 HAWK : 0.05 WETH and 0.05 WETH : 190 tUSDC (6dp) => $3800/WETH => **HAWK = $0.50**,
     which is what the UI displays.
  6. *Non-boosted V2 APR.* `FarmTable.tsx` forced APR to 0 whenever
     `!farm.bCakePublicData?.isRewardInRange`, which is `!undefined` === true for any farm
     without a bCake wrapper (we deployed none). Now only applied when the farm actually has
     a `bCakeWrapperAddress`; unchanged for every boosted upstream farm.
  **Remaining degradations (all cosmetic/data-completeness, none crash or block):**
  - pid 0 (HAWK single-staking) is filtered off `/farms` by upstream's `farm.pid !== 0`
    rule — that pool belongs on `/pools`. Its config exists and is fetched correctly.
  - The tUSDC-WETH and tUSDC-tUSDT V2 farms show blank liquidity / 0% APR because they
    genuinely have 0 LP staked in the chef right now — an on-chain fact, not a wiring bug.
    HAWK-WETH (the one with LP staked) shows $190 staked liquidity and a live APR.
  - tUSDT resolves to price '0' in the V2 path: the tUSDC/tUSDT pair has no WETH leg for
    `getFarmsPrices` to cascade from, and the external price-API fallback is deliberately
    off for this chain.
  - V2 CAKE APR uses upstream's `BLOCKS_PER_YEAR`, which assumes BSC's 3s blocks; Base
    Sepolia blocks are 2s, so the figure is proportionally off. Cosmetic on a testnet with
    valueless tokens, but it should be made chain-aware before any APR is taken seriously.
  - "Reward Per Day" reads `0.00 CAKE` — that column is fed by bCake wrapper data and we
    deployed no bCake wrappers.
  - V3 TVL is a best-effort `balanceOf(pool)` on-chain proxy (whole-pool liquidity, not the
    staked-only portion) because the hosted `/v3/{chainId}/liquidity` aggregator 504s for
    chain 84532. V3 TVL/APR therefore read lower than the true staker-only figure.
  - Reward-token strings still say "CAKE" in several farm UI labels; that is branding work,
    not farm wiring.

- **2026-08-04 — frontend farms (Task 8): V2 classic-MasterChef farms (pid 0-3, incl.
  HAWK single-staking) do not render on `/farms` for Base Sepolia; only the 3 V3 farms do.**
  *(SUPERSEDED by the fix-round entry above — both root causes are now fixed.)*
  Root cause is NOT `bCakeWrapperAddress` (confirmed optional/safe everywhere it's read —
  `packages/farms/src/getLegacyFarmConfig.ts:35,50`, `packages/farms/src/v2/fetchFarmsV2.ts:65`).
  It's two separate, pre-existing architectural issues in this fork's V2 legacy-farm
  pipeline, neither of which is Base-Sepolia-specific:
  1. `apps/web/src/state/farms/hooks.ts:144` only dispatches the V2 public-data fetch when
     `supportedChainIdV2.includes(chainId)`. `packages/farms/src/index.ts:44-48`
     (`createFarmFetcher.fetchFarms`) and `fetchMasterChefV2Data`/`fetchMasterChefData`
     (`packages/farms/src/v2/fetchFarmsV2.ts:258,295`) hardcode
     `chainId = isTestnet ? ChainId.BSC_TESTNET : ChainId.BSC` and call
     `provider({ chainId })` with that hardcoded chain — completely ignoring the actual
     active chain. Since this fork's wagmi client config (`apps/web/apps/web/src/utils/wagmi.ts`)
     has no BSC/BSC_TESTNET client (Base Sepolia only per the engineering rules),
     `provider(...)` resolves to `undefined` and `.multicall(...)` throws, crashing the
     whole `/farms` page with an unhandled runtime error. Confirmed by reproducing:
     adding `ChainId.BASE_SEPOLIA` to `supportedChainIdV2` immediately produced
     `TypeError: Cannot read properties of undefined (reading 'multicall')` at
     `packages/farms/src/index.ts:42` (`fetchMasterChefV2Data`) on page load.
  2. Fixing (1) is out of scope for the local-config task (it requires parameterizing
     `createFarmFetcher`/`fetchMasterChefV2Data` by the real chainId, touching core
     `packages/farms/src/index.ts` and `v2/fetchFarmsV2.ts` logic — a bigger, riskier
     change than "add local config").
  **Resolution taken:** `ChainId.BASE_SEPOLIA` was deliberately left OUT of
  `supportedChainIdV2` (`packages/farms/src/const.ts`, see inline comment) to avoid
  triggering the crash; it IS in `supportedChainIdV3` (V3 farms use a completely separate,
  correctly-chainId-parameterized fetch path — `apps/web/src/state/farmsV3/hooks.ts:75-119`
  — confirmed working end-to-end against our deployed MasterChefV3). `masterChefAddresses[BASE_SEPOLIA]`
  and a `legacyFarmConfig` array for pid 0-3 were still added to
  `packages/farms/src/farms/baseSepolia.ts` for when `createFarmFetcher` gets fixed to be
  chain-aware — they are currently dead code on this path. Follow-up task: parameterize
  `createFarmFetcher`/`fetchMasterChefV2Data`/`fetchMasterChefData` by the actual chainId
  (using `masterChefAddresses[chainId]` instead of the hardcoded BSC/BSC_TESTNET branch),
  then add `BASE_SEPOLIA` to `supportedChainIdV2`.

- **2026-08-04 — frontend farms (Task 8): fixed a separate, also pre-existing, V3 farm
  bug that would have blocked V3 farms too.** `farmV3FetchFarms`
  (`packages/farms/src/fetchFarmsV3.ts`, was line 43) unconditionally calls
  `provider({ chainId: ChainId.BSC }).readContract(...)` against a Chainlink CAKE/USD
  price feed that only exists on BSC mainnet, to compute `cakePrice` for every chain's
  APR math — regardless of which chain the farms are actually on. With no BSC client
  configured in this fork, that call throws `TypeError: Cannot read properties of
  undefined (reading 'readContract')`, which aborted `Promise.all(...)` and made
  `farmV3FetchFarms` (and therefore the whole V3 farm list) fail for every chain, not
  just Base Sepolia — reproduced identically via both the client-side hook and the
  `/api/v3/[chainId]/farms` route (500, same stack trace). Patched narrowly: the
  Chainlink lookup is now wrapped so a missing/failing BSC provider degrades to a `'0'`
  price (logged via `console.error`) instead of throwing, letting the rest of the pool
  data (pool pairs, fee tiers, multipliers, on-chain liquidity) render normally. APR
  will read 0% until a real price source is wired up for this fork (separate task) —
  this only restores farm-card rendering, it does not add price data. This file
  (`packages/farms/src/fetchFarmsV3.ts`) was not in Task 8's declared file list; the fix
  was necessary to meet the task's core "3 v3 farms render" acceptance criterion and is
  narrowly scoped (one call site, defensive try/catch, no behavior change for chains that
  do have a working BSC client).

- **2026-08-04 — frontend WalletConnect projectId is still upstream PancakeSwap's**
  (`e542ff314e26ff34de2d4fba98db70bb`, in `apps/web/apps/web/src/utils/wagmi.ts`,
  `walletConnectConnector` + `walletConnectNoQrCodeConnector`). Fine for local dev
  (WalletConnect just needs *a* registered projectId to issue relay sessions), but before
  any real deploy we need our own WalletConnect Cloud project so wallet-side branding/
  metadata is ours and we're not riding on PancakeSwap's rate limits. TODO comment left
  at the call site.

- **2026-08-04 — frontend SDK: no SmartRouter, no MixedRouteQuoter, no FOT detector on
  Base Sepolia (Task 4).** `SMART_ROUTER_ADDRESSES[BASE_SEPOLIA]`,
  `MIXED_ROUTE_QUOTER_ADDRESSES[BASE_SEPOLIA]` (in both
  `packages/smart-router/evm/constants/v3.ts` and
  `packages/routing-sdk/addons/quoter/src/constants/mixedRouteQuoterV1.ts`), and
  `feeOnTransferDetectorAddresses[BASE_SEPOLIA]` all point at `''`/zero-address stubs —
  none of these contracts are deployed. Consequences: swaps route exclusively through the
  UniversalRouter (matches the 2026-08-03 Infinity resolution above); the mixed v2+v3
  single-quote path is unsupported (routing-sdk/smart-router fall back to separate v2/v3
  quotes); fee-on-transfer detection is skipped (fine — all our test tokens are plain
  ERC-20s, not FOT). Revisit only if a future task needs on-chain FOT detection or a
  deployed SmartRouter.

- **2026-08-04 — brand extraction gaps (frontend phase).**
  `vibe.cryptohawking.com` does not resolve in DNS — no tokens could be extracted
  from Vibe Hawking; re-extract when it goes live. Parent-site OG image URL 404s
  and no vector wordmark exists — DEX needs its own OG image + SVG mark (guessed,
  needs designer confirmation). Tokens marked ⚠ in `packages/brand/BRAND.md`
  (flat surface hexes, textSubtle/textDisabled, focus ring, 20px card radius,
  hover/pressed button states, type scale) are fallback values from the design
  brief, not extracted — guessed, needs designer confirmation. Everything marked
  ✔ was read from the live compiled CSS / computed styles / screenshots on
  2026-08-04.

- **RESOLVED 2026-08-03 (same day): Infinity tx swaps now live via UniversalRouter**
  (`0x0180e61b…88d4`) — tri-protocol smoke passed (v2+v3+infinity in 3 on-chain txs).
  Still skipped: MixedQuoter (ctor requires a stable-swap factory — we don't run stable
  swap; UR's stableFactory/stableInfo immutables are zero — stable-swap commands would
  revert if ever issued). Core pinned to upstream `397723e` (periphery's pin) rather
  than newer core HEAD `7c04695` — re-evaluate when bumping periphery. UR's periphery
  submodule pin (`481650d`) differs from our vendored periphery HEAD — compiled clean
  against ours; watch on upgrades.
- **RESOLVED 2026-08-03 (same day): v3 position farming live** — MasterChefV3
  `0x8DBd…84F6` + LmPoolDeployer `0x64FF…5C57`, 3 pools, 100k HAWK/30d upkeep funded
  from deployer balance, stake+harvest smoke passed. Emissions need a re-`upkeep`
  after 2026-09-02 (30-day period) — deployer holds ~9.9M HAWK for refills. Skipped
  from upstream masterchef-v3: keeper/, receiver/ (FarmBooster + upkeep automation
  — manual upkeep suffices on testnet).
- **2026-08-03 — public RPC nonce races.** sepolia.base.org load-balances across nodes
  with inconsistent pending state; roughly 1 in 10 back-to-back txs fails with "nonce too
  low" after the tx actually landed. All deploy scripts are idempotent re-runs; balance
  reads right after a tx can also be stale — re-poll before concluding failure.
- **2026-08-03 — v3 NFT descriptor is the off-chain variant with a stub base URI.**
  `NonfungibleTokenPositionDescriptorOffChain` initialized with
  `https://dex.cryptohawking.com/api/v3/nft/` — that API route doesn't exist yet
  (apps/api phase must serve position-NFT metadata there, or we redeploy NPM with the
  on-chain SVG descriptor later). Position NFTs work; only their tokenURI metadata 404s.
  Also deferred from v3-periphery: V3Migrator deployment (needs v2 pair linkage — farms/
  later), SmartRouter (upstream removed it from pancake-v3-contracts; frontend may need
  the standalone smart-router package instead — decide in frontend phase).
- **2026-08-03 — source verification backlog (Blockscout 429s).** This IP is currently
  hard-throttled by Blockscout's API. Unverified: tDAI, Faucet, HawkingFactory,
  HawkingRouter. All submissions are one command each (see contracts/*/README.md);
  sweep them once the limit resets or ETHERSCAN_API_KEY (Basescan) is provided.
  Bytecode integrity is meanwhile assured by tests + on-chain INIT_CODE_PAIR_HASH check.
- **2026-08-03 — 2 of 6 phase-1 contracts unverified.** Blockscout rate-limits this IP's
  anonymous verification requests; tDAI (`0x66db…fa07`) and Faucet (`0x7264…113f`) failed
  twice post-cooldown → parked per fails-twice rule. Retry later or verify on Basescan
  once ETHERSCAN_API_KEY lands. tDAI shares bytecode with verified tUSDC and may
  auto-match on its own. HawkToken/tUSDC/tUSDT/tWBTC are verified.
- **2026-08-03 — v2 fork deviations from upstream (path/tooling only):** vendored
  `TransferHelper.sol` from Uniswap/solidity-lib master (MIT) into
  `contracts/v2/contracts/libraries/` instead of the `@uniswap/lib` npm dep; skipped
  `PancakeRouter01.sol` (legacy, undeployed upstream) and `PancakeZapV1.sol` + Babylonian
  (zap feature deferred). Upstream hardhat test suite not resurrected (2021 toolchain);
  replaced with targeted fork tests (init-hash consistency, add/swap/remove liquidity).

- **2026-08-03 — upstream pancake-frontend deleted from GitHub.** `pancakeswap/pancake-frontend`
  returns a hard 404 (no redirect; absent from the org's repo list). Using mirror
  `germartinez/pancake-frontend-candidate-009` pinned to upstream commit
  `55653883b7daaa4f039e3a3d13ef62b9bc15e291` (chefjackson, PR #12010, 2025-07-30).
  Provenance check: that exact SHA exists in 5 independently-uploaded mirrors
  (germartinez, yashgo0018, dipanshuhappy, blobitty, ensdomains) — git content-addressing
  makes identical SHA = identical history/tree. Residual risk: snapshot is ~1 year old;
  any upstream fixes after 2025-07-30 are not included. Frontend is GPL-3.0 so using the
  mirror is license-clean.

- **2026-08-03 — No deployer key.** No `.env` with a Base Sepolia private key exists yet.
  All deploys are blocked until the user provides (or approves generating) a fresh
  testnet-only key and funds it from a Base Sepolia faucet. Never reuse any production key.
- **2026-08-03 — yarn not installed** (host has git/node24/pnpm9/npm11/foundry 1.5.1/jq).
  Upstream pancake contract repos use yarn workspaces; plan is to drive them with
  their lockfile-respecting installs (`corepack enable` gives yarn) rather than converting.
- **2026-08-03 — graph-cli not installed.** Needed only in the subgraph phase; also needs
  a Graph node/Studio decision for Base Sepolia (self-hosted vs hosted). Deferred.
- **2026-08-03 — Anthropic/infra spend constraint** (from project memory 2026-08-01: user
  currently has no budget for paid services). Prefer free tiers: public RPC, Basescan free
  API key, no paid indexing until approved.
- **2026-08-04 — v2Colors.ts ramps left untouched (Task 12 theme rebrand).** Per task-12
  brief, `packages/uikit/src/tokens/v2Colors.ts` (v2Primary/Secondary/Tertiary/Positive/
  Warning/Destructive/Disabled/DecorativeBlue ramps, teal-based) was left as-is — a
  follow-up pass should re-derive it from the purple/pink CryptoHawking palette. Checked
  consumers: `Badges.tsx` (Liquidity), `PoolAprButton/AprButton.tsx`, `PoolTokensBar.tsx`
  (PoolDetail), `RemoveBinPosition.tsx`/`RemoveClPosition.tsx` (RemoveLiquidityInfinity) —
  none render on `/swap` or `/farms` (the Task 12 verification routes), so no visible clash
  today, but liquidity/pool-detail pages will still show old teal accents until v2Colors
  is rebranded.
- **2026-08-04 — Kanit font-family literals remain in ~20 view/component files**
  (`TradingViewChart.tsx`, `HomeV2/*`, `CakeStaking/*`, `FarmCard/CardActionsContainer.tsx`,
  etc.) outside Task 12's file list (`ResetCSS.tsx`, `Global.tsx`, `tokens/index.ts`,
  `_document.tsx`). Since the Kanit Google Fonts `<link>` is now removed, these
  `font-family: Kanit` declarations fail to resolve and the browser falls back to the
  next stack entry (usually `sans-serif`/system default) — so no blocky Kanit glyphs
  render in practice — but the dead literals should be swept in a follow-up pass for
  cleanliness.
- **2026-08-04 — Logo mark is a placeholder monogram (Task 13 identity rebrand).** The
  "CH" circular mark used in `packages/uikit/src/components/Svg/Icons/{Logo,LogoWithText,
  LogoRound}.tsx`, `public/logo.png`, `public/favicon.ico`, and `public/images/og-hero.png`
  is a programmatically-generated placeholder (gradient-stroked circle + bold "CH" text),
  consistent in spirit with the parent site's circular mark
  (`packages/brand/reference/logo.jpg`) but not a designed asset. Needs a real designer
  pass before production launch.
- **2026-08-04 — CryptoHawking docs site does not exist yet (Task 13, `src/config/
  wallet.ts`).** `getDocLink()` and `mevDocLink` still point at PancakeSwap's upstream
  docs (`docs.pancakeswap.finance/...`) because there is no `docs.cryptohawking.com` (or
  equivalent) content to link to. Wallet deeplinks/download links (MetaMask, Trust Wallet,
  OKX) were repointed to `dex.cryptohawking.com` since that domain is fixed per
  `CLAUDE.md`, but these two doc links were left with `TODO(cryptohawking)` comments in
  `wallet.ts` — repoint once a CryptoHawking docs site exists.
- **2026-08-04 — Ad panel disabled entirely (Task 13 identity rebrand).** The upstream
  `AdPanel` system (`apps/web/apps/web/src/components/AdPanel/**`, driven by
  `useAdConfig()` in `config.tsx` and `useAdsConfigs()` in `hooks/useAdsConfig.ts`) is
  a rotating carousel of PancakeSwap promotional campaigns — "Pancake Gifts", Binance
  Alpha trading competitions, "Solana PancakeSwap" liquidity, one-click cross-chain swap
  launches, Springboard, IFOs, PCSX — none of which exist on this Base-Sepolia-only
  testnet fork. Rather than rebrand copy for campaigns that don't apply here (and that
  link out to `pancakeswap.finance`/`blog.pancakeswap.finance`), `useAdConfig()` now
  always returns `[]` and `useAdsConfigs()`'s underlying list is emptied, so the ad
  carousel renders nothing on `/swap` and `/farms`. This was found because
  `document.body.innerText.includes('PancakeSwap')` was still `true` after the initial
  copy sweep — the ad text ("Provide Liquidity on Solana PancakeSwap", "Introducing
  Pancake Gifts.") is user-facing but lives in a `.ts` config file the `--include='*.tsx'`
  grep in the brief's step 5 command does not match. Individual `Ads/*.tsx` components
  (`AdCrossChain`, `AdSolana`, `AdSpringboard`, `AdIfo`, `AdPCSX`, trading-competition ads)
  were left as-is since they're now unreachable dead code, not fixed in place — a future
  cleanup pass could delete them outright.
- **2026-08-04 — Site footer trimmed and partially TODO'd (Task 13, `packages/uikit/src/
  widgets/Menu/components/footerConfig.ts`).** The upstream footer (rendered on every
  page, including `/swap` and `/farms`) was a 5-column, 20-link list where nearly every
  `href` pointed at `pancakeswap.finance`/`docs.pancakeswap.finance` (merch store,
  business partnerships, analytics, IFOs, legacy products, careers, bug bounty) and two
  labels read "CAKE Incentives" / "CAKE Emission Projection". Trimmed to the columns/links
  that have a real CryptoHawking destination (Trade, Earn, Staking Pools all now point at
  `dex.cryptohawking.com`) and renamed "CAKE" labels to "HAWK"; the remaining entries
  (Github, Documentation, Tokenomics) have no CryptoHawking equivalent yet and were left
  pointing at the PancakeSwap upstream with a `TODO(cryptohawking)` comment — repoint once
  a CryptoHawking docs site / public repo exists. Also fixed `src/components/Menu/
  index.tsx`'s `buyCakeLabel`/`buyCakeLink` (was "Buy CAKE" linking to the real BSC-mainnet
  CAKE token, chainId 56 — completely wrong for this fork); now "Buy HAWK" linking to the
  deployed Base Sepolia HAWK token (`0x2843bABb7557CD51e8007F8D2a960457c734C570`,
  chainId 84532) via `packages/deployments/base-sepolia.json`.
- **2026-08-04 — Pre-existing (not Task 13) dev-only error overlay: "Unrecognized list
  URL protocol."** During Task 13 visual verification, `/swap` intermittently showed a
  Next.js dev-mode error overlay (`packages/token-lists/dist/react.mjs:456`) thrown while
  resolving `CRYPTOHAWKING_DEFAULT = '/cryptohawking.tokenlist.json'` in
  `apps/web/apps/web/src/config/constants/lists.ts` — a relative path, which the
  `@uniswap/token-lists`-derived resolver doesn't recognize as a URL protocol (it wants
  `http(s)://`/`ipfs://`). `git log` confirms `lists.ts` was last touched in commit
  `211ef3d` ("local token list, pancake backends cut, home->swap"), a prior task in this
  pipeline — Task 13 did not modify this file. The underlying page content still renders
  correctly underneath the overlay (confirmed via `innerText` extraction), and the overlay
  is dev-only (Next.js error boundary), so it does not block Task 13's verification gates,
  but the root cause (an absolute URL is required) should be fixed in a follow-up — likely
  by resolving `CRYPTOHAWKING_DEFAULT` to an absolute URL (e.g. `${window.location.origin}/
  cryptohawking.tokenlist.json` or a build-time absolute path) before Task 13's screenshots
  were taken, the overlay was dismissed programmatically for a clean capture.
- **2026-08-04 — Flaky "CAKE" text observed once on `/farms` during Task 13 verification,
  not reproduced on retry.** One `document.body.innerText.includes('CAKE')` check
  returned `true` immediately after an APR-data fetch returned HTTP 504 (`https://
  stingray-app-m57u6.ondigitalocean.app/cached/pools/apr/.../base-sepolia/farms-lp`);
  the very next check (and the saved screenshot) returned `false` with all farm rows
  showing correct "HAWK-ETH LP" etc. naming. Most likely a transient loading-skeleton
  placeholder tied to the failed APR fetch, not a static copy leak — grep confirms no
  remaining "CAKE" string literals in `src/views/Farms/**`. Flagged here in case it
  reproduces consistently once live APR data is available post-deploy.
- **2026-08-05 — Asset hygiene sweep of `apps/web/apps/web/public/`.** Deleted PancakeSquad
  NFT art, IFO bunny art, NFT-market art, `collections/` (pancake-squad avatar/banners +
  `team bg/storm.png`), the migration bunnies, `bunny-santa.svg`, and
  `tc-easter-bunnies.png` / `tc-fantoken-bunnies.png` after confirming (via `grep` +
  transitive import trace from `src/pages/**`) that the only referencing code lives in
  `src/views/{PancakeSquad,Ifos,Nft,Migration,Profile,ProfileCreation,TradingCompetition,
  AffiliatesProgram}` and none of those views are imported by anything under `src/pages`
  — i.e. they are unreachable dead code on this fork's trimmed route set (swap/liquidity/
  pools/farms/faucet/cake-staking/home only). Kept (still reachable, do not delete without
  a code change first): `web3-notification-bunny.png` (lazy-loaded `views/Notifications`
  is pulled in globally by `components/Menu` → `pages/_app.tsx`) and
  `pancake-3d-spinner-v2.gif` (backs the shared `packages/uikit` `Spinner` component used
  throughout the routed Swap/PoolDetail/IncreaseLiquidity trees). Left untouched as
  out-of-scope-for-this-sweep / unsure: `images/ido/*` (third-party partner logos, not
  PancakeSwap brand art, also orphaned via `views/Idos`), and the generic
  cake-themed decorative assets (`cake.svg`, `burnt-cake.png`, `cakeGrey.png`, `pan-bg*.svg`,
  etc.) — these are a rebrand-copy concern (out of scope: code/CAKE→HAWK renaming is
  explicitly a separate, code-touching task per `CLAUDE.md`), not a license/asset-hygiene
  one. Did not touch `images/wallets/*` (separate, still-referenced legacy path from an
  older UI) — new `/web/wallets/*` and `/web/chains/84532.png` were added instead per the
  live 404 report, matching the `${ASSET_CDN}/web/...` paths actually read by
  `src/config/wallet.ts`, `src/components/Logo/ChainLogo.tsx`, etc. (`NEXT_PUBLIC_ASSET_CDN`
  is unset, so these resolve same-origin to `public/web/...`).
