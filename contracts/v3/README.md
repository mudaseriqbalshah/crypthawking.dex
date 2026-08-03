# @cryptohawking/v3

Rename-only fork of PancakeSwap v3 (CLAMM) for Base Sepolia, split like upstream:

- `core/` — HawkingV3PoolDeployer, HawkingV3Factory, HawkingV3Pool (solc 0.7.6,
  istanbul, metadata bytecodeHash none; pool+deployer at optimizer 400 runs,
  rest 1,000,000 — upstream settings, do not change).
- `periphery/` — SwapRouter, NonfungiblePositionManager, off-chain position
  descriptor, QuoterV2, TickLens, HawkingInterfaceMulticall. Depends on core via
  `file:../core`; imported core sources compile under core's own optimizer
  settings (see hardhat.config.js overrides) so pool bytecode stays identical.

## POOL_INIT_CODE_HASH — read before touching HawkingV3Pool

`periphery/contracts/libraries/PoolAddress.sol` hardcodes
`keccak256(HawkingV3Pool creationCode)`. After ANY pool bytecode change:

```bash
cd core && npx hardhat compile && npm run init-hash   # prints new hash
# patch periphery PoolAddress.sol + scripts/deploy.js + frontend v3-sdk + registry
cd ../periphery && npx hardhat test                   # cross-checks hash 3 ways
```

Current hash: `0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5`

## Fork deviations (logic untouched)

- Callback ABI renamed `pancakeV3{Mint,Swap,Flash}Callback` → `hawkingV3…` across
  core interfaces and periphery implementations (coordinated, tested).
- `IHawkingV3LmPool` vendored into `core/contracts/interfaces/lm/` (was an
  `@pancakeswap/v3-lm-pool` npm import).
- Not deployed: V3Migrator, on-chain NFT descriptor (off-chain variant used),
  test/example contracts. See RISKS.md.

## Commands

```bash
cd core && pnpm install && npx hardhat compile
cd periphery && pnpm install && npx hardhat test                     # 4 fork tests
npx hardhat run scripts/deploy.js --network baseSepolia              # idempotent
npx hardhat run scripts/seed-pools.js --network baseSepolia          # 3 pools
```
