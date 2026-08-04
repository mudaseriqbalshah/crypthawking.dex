# RISKS / open assumptions

Running log of anything guessed, stubbed, or blocked. Newest first.

- **2026-08-04 — frontend farms (Task 8): V2 classic-MasterChef farms (pid 0-3, incl.
  HAWK single-staking) do not render on `/farms` for Base Sepolia; only the 3 V3 farms do.**
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
