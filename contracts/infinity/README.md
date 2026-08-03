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

Not deployed (see RISKS.md): universal router (next phase — until then Infinity
swaps are quote-only; no tx swap entrypoint), MixedQuoter (requires a stable-swap
factory we don't run), InfinityRouter is abstract by design.

## Commands

```bash
../../scripts/fetch-infinity-deps.sh     # pinned libs (gitignored)
cd core && forge build
cd ../periphery && forge build
../../scripts/deploy-infinity.sh         # idempotent deploy + wiring
forge script script/SeedInfinity.s.sol --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY --broadcast   # seed pool + quote check
```
