# RISKS / open assumptions

Running log of anything guessed, stubbed, or blocked. Newest first.

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
