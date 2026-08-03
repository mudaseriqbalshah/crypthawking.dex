# CryptoHawking DEX — design & phase plan (2026-08-03)

Source of truth for requirements is the project brief in `CLAUDE.md` (user-authored;
non-negotiable rules, chain constants, naming map, layout). This doc only fixes the
execution order and the decisions the brief leaves open.

## Approach

Fork real upstream source (shallow clones in `upstream/`), copy the needed packages into
`contracts/*`, rebrand names/symbols only, deploy fresh per phase with idempotent scripts
that read/write `packages/deployments/base-sepolia.json`, verify on Basescan, then wire
subgraphs and the trimmed frontend last. Alternatives considered and rejected:
re-implementing contracts from scratch (rule: fork, don't reinvent) and deploying from
unmodified upstream artifacts (branding is a hard requirement and v2/v3 init-code hashes
must be recomputed anyway once bytecode changes).

## Phases (each = its own plan → implement → verify cycle)

0. **Infra verify + scaffold** — DONE 2026-08-03 (see DEPLOYMENTS.md).
1. **Tokens** (`contracts/tokens`, foundry): HAWK (Crypto Hawking Token, 18 dec),
   test ERC20s (tUSDC 6 dec, tUSDT 6 dec, tDAI 18 dec, tWBTC 8 dec — names prefixed
   "Test", UI labels them valueless), faucet with per-address cooldown.
2. **v2** (`contracts/v2`, hardhat 0.5.16/0.6.6): HawkingFactory, HawkingPair
   (symbol HAWK-LP), HawkingRouter02; recompute INIT_CODE_PAIR_HASH after rebrand and
   patch PancakeLibrary + frontend v2-sdk; seed initial pairs + liquidity.
3. **Farms** (`contracts/farms`): NEST bar, MasterChefV2 (+V3 later), HAWK emissions
   funded from deployer-held supply. Emission rate: keep upstream default scaled down;
   exact number decided in the phase plan.
4. **v3** (`contracts/v3`, hardhat 0.7.6): deployer+factory split, periphery
   (NonfungiblePositionManager etc.), recompute POOL_INIT_CODE_HASH, SmartRouter,
   lm-pools + MasterChefV3.
5. **Infinity** (`contracts/infinity`, foundry 0.8.26): Vault, CLPoolManager,
   BinPoolManager, periphery position managers/routers, universal router (Permit2 reused).
6. **Subgraphs** — blocked on indexing decision (self-hosted graph-node vs Goldsky/Studio
   free tier). Zero-budget constraint applies; decide when reached.
7. **Frontend** (`apps/web`): fork pancake-frontend turborepo, trim to swap/liquidity/
   farms on one chain (84532), rebrand per naming map, UI styled to match the
   cryptohawking-migration site; `apps/api` replaces PCS backend endpoints the web app
   needs (prices, farm APRs, token list). Faucet UI is a route inside apps/web.
8. **Hosting** — dex.cryptohawking.com. Open decision: the shared VPS has hard
   do-not-touch constraints (trendcompare on port 3000, nginx quirks) — ask user before
   touching it; static-export or a new pm2 app on a free port are the candidates.

## Cross-cutting

- **Error handling in deploy scripts:** every script re-reads the registry, skips
  already-deployed addresses (idempotent), and aborts on nonce/verification failure —
  two failures on the same step = stop and report (brief rule 6 / discipline).
- **Testing:** run upstream test suites after rebrand per package (they must stay green —
  proof economic logic untouched); fork-level smoke test script per phase doing a real
  swap/mint against Base Sepolia.
- **Licensing:** NOTICE at root, upstream LICENSE files retained per package.

## Blockers needing user input

1. **Deployer key**: need a fresh, testnet-only private key funded with Base Sepolia ETH
   (faucets: Alchemy/Coinbase/QuickNode). I can generate one (`cast wallet new`) and the
   user funds it — approval requested.
2. **Basescan API key** (free) for verification — needs user's account.
3. Subgraph indexing choice (phase 6) and hosting (phase 8) — decisions deferred until
   those phases; both have zero-budget constraints.
