# RISKS / open assumptions

Running log of anything guessed, stubbed, or blocked. Newest first.

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
