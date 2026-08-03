# @cryptohawking/infinity

PancakeSwap Infinity (v4 singleton) fork for Base Sepolia. Sources are vendored
verbatim (contract names are brand-neutral; upstream copyright headers retained):

- `core/` — Vault, CLPoolManager, BinPoolManager, ProtocolFeeController.
  Pinned to upstream infinity-core `397723e` (2025-02-14, the commit
  infinity-periphery pins — chosen for compile compatibility over newer HEAD).
  Settings: solc 0.8.26, via-ir, 25666 runs, cancun, bytecode_hash none.
- `periphery/` — CLPositionManager (+off-chain descriptor), BinPositionManager,
  CLQuoter/BinQuoter/TickLens, Planner libs. 1M runs except CLPositionManager
  at 9000 (size limit). `lib/infinity-core` symlinks to `../core`.

Changes vs upstream (rename-only):
- position NFT branding: "CryptoHawking Infinity Positions NFT" / HAWK-INFINITY-POSM
- external v3/v2 integration interfaces renamed IPancake*→IHawking* and callback
  `pancakeV3SwapCallback`→`hawkingV3SwapCallback` (matches our v3 fork's ABI)

- `universal-router/` — UniversalRouter, the single swap entrypoint for v2 + v3 +
  Infinity. Our v2/v3 init code hashes are constructor immutables (registry has
  them); v3 callback renamed to `hawkingV3SwapCallback`; stable-swap immutables
  zero (not deployed). Settings: 20000 runs via-ir. lib/* symlink into ../core
  and ../periphery.

Not deployed (see RISKS.md): MixedQuoter (requires a stable-swap factory we
don't run). InfinityRouter is abstract by design — UniversalRouter is the
concrete swap entrypoint.

## Commands

```bash
../../scripts/fetch-infinity-deps.sh     # pinned libs (gitignored)
cd core && forge build
cd ../periphery && forge build
../../scripts/deploy-infinity.sh         # idempotent deploy + wiring
forge script script/SeedInfinity.s.sol --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast   # seed pool + quote check
```
