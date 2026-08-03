# DEPLOYMENTS — Base Sepolia (chainId 84532)

Canonical registry: `packages/deployments/base-sepolia.json`. This file is the
human-readable log; every entry must state **who deployed it, when, and how it was
verified**.

## Pre-phase infra verification

2026-08-03 — `cast chain-id --rpc-url https://sepolia.base.org` → **84532** ✔

`cast code <addr> --rpc-url https://sepolia.base.org` results:

| Contract | Address | Result |
|---|---|---|
| WETH9 (OP-stack predeploy) | `0x4200000000000000000000000000000000000006` | code present (2041 bytes) ✔ |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | code present (3808 bytes) ✔ |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` | code present (9152 bytes) ✔ — no deploy needed |
| Deterministic deployer | `0x4e59b44847b379578588920cA78FbF26c0B4956C` | code present (69 bytes) ✔ |

## Our deployments

Deployer: `0x8DAFaBcEb8B05629cf1591A32f5fd8A1c0a75e95` (user-provided testnet key in
gitignored `.env`; funded 0.4767 ETH, confirmed 2026-08-03). Supersedes the earlier
generated `0xE2ec…5147`, which was never used and holds nothing.

| Phase | Contract | Address | Verified |
|---|---|---|---|
| 1 | HawkToken (HAWK) | `0x2843bABb7557CD51e8007F8D2a960457c734C570` | Blockscout ✔ |
| 1 | TestERC20 tUSDC | `0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2` | Blockscout ✔ |
| 1 | TestERC20 tUSDT | `0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988` | Blockscout ✔ |
| 1 | TestERC20 tDAI | `0x66dbAe86eC0689cC398eF3f1D4486261EC1ffa07` | pending (rate-limited) |
| 1 | TestERC20 tWBTC | `0xE5839C45b8c282E6786D6CC7Dc1c6aB70D5b3D70` | Blockscout ✔ |
| 1 | Faucet (24h cooldown) | `0x7264a007e40E52b767B1Ec749baf5Ae1860B113f` | pending (rate-limited) |

| 2 | HawkingFactory | `0x8F2F1F21AaFfEC52E6A390E922E784bEA9E7D8C4` | pending (rate-limited) |
| 2 | HawkingRouter (02) | `0x57B76A5a7abAF54Ba7f88b402863CD313667B380` | pending (rate-limited) |

| 3 | NestBar (NEST) | `0x8f7BE274b5e85C4b244CAe562AeBf023f70a185f` | pending (rate-limited) |
| 3 | MasterChef | `0x30cCe7f0eE4314Ca353cC16ecaAcb2E2aE4E6963` | pending (rate-limited) |
| 3b | MasterChefV3 | `0x8DBd87Df712413b963d921a6C928cb7212Ab84F6` | pending (rate-limited) |
| 3b | HawkingV3LmPoolDeployer | `0x64FF5CFAcc106032DeDBbF2B65cADD5d47185C57` | pending (rate-limited) |

Phase 3b (v3 position farming) deployed 2026-08-03 via
`contracts/farms/masterchef-v3/scripts/deploy.js`. Wiring: v3factory.setLmPoolDeployer,
chef.setLMPoolDeployer, receiver=deployer (max HAWK allowance), 3 farm pools added
(HAWK/WETH 200, WETH/tUSDC 100, tUSDC/tUSDT 100 — an LmPool auto-deployed per pool,
addresses discoverable via `v3pool.lmPool()`), funded via `upkeep(100k HAWK, 30d)`.
Live smoke: staked position NFT #1 into MCv3, harvested 0.308641 HAWK ✔ (rate matches
alloc share). MCv3 keeps upstream `pendingCake`/`CAKE` ABI names for frontend compat.
| 4 | HawkingV3PoolDeployer | `0x2E2530dFbcb1bcCdf10Bf8Cd53179217d8264565` | pending (rate-limited) |
| 4 | HawkingV3Factory | `0xf5c64e43dfF3CA1D6B64ebE13C857ae14fc41C61` | pending (rate-limited) |
| 4 | SwapRouter (v3) | `0x4f8dBB1545F49CBfDeC3CC3693548f7a1FAEf17D` | pending (rate-limited) |
| 4 | NFT PositionDescriptor (off-chain) | `0x1D67c1ae79fA8482196294140ec40AC74eA2FD88` | pending (rate-limited) |
| 4 | NonfungiblePositionManager | `0x85d440B2Bf52243239bb35D8BCeA865596cDc371` | pending (rate-limited) |
| 4 | QuoterV2 | `0x2D4CB92B4282A2185063Fe8D9D4DA1e88342e220` | pending (rate-limited) |
| 4 | TickLens | `0xd0EEc8981C05AA0919C4bE972d4F3a42dC9518FD` | pending (rate-limited) |
| 4 | HawkingInterfaceMulticall | `0xD6aE563d02F89DEC2437E01632359ad997BE46FA` | pending (rate-limited) |

| 5 | Vault (infinity) | `0xe0785d1F460C89e6665645f7188E5E3C9E42c6b8` | pending (rate-limited) |
| 5 | CLPoolManager | `0xA50a8A0867d7ACc239D71e6CBb0072F9c49aC87B` | pending (rate-limited) |
| 5 | BinPoolManager | `0x1085E6a51E7e9575d3808479b0D6Fa89eAB07d9E` | pending (rate-limited) |
| 5 | CL/Bin ProtocolFeeControllers | `0x28EeB6…0f30` / `0x7C376a…1199` | pending (rate-limited) |
| 5 | CLPositionManager | `0x4Ac28f614D735FD5c664DDbB51C9FDEc47992828` | pending (rate-limited) |
| 5 | BinPositionManager | `0x99ddB0Cf91E45DE1fA0f15F8DC7a5F2D240574A0` | pending (rate-limited) |
| 5 | CLPositionDescriptor (off-chain) | `0x85ED0ABe1b308b7370358ff45EC5319847dd3A46` | pending (rate-limited) |
| 5 | CLQuoter / BinQuoter / CLTickLens | `0x8346DC…e7E9` / `0xc7DD71…15bC8` / `0x148556…95C2` | pending (rate-limited) |

| 5 | **UniversalRouter** | `0x0180e61b23201479111D7595c7084Ce1D50f88d4` | pending (rate-limited) |

**UniversalRouter** (the frontend's single swap entrypoint) deployed 2026-08-03 with our
v2 INIT_CODE_PAIR_HASH + v3 POOL_INIT_CODE_HASH as constructor immutables and the
hawkingV3SwapCallback ABI. Stable-swap immutables are zero (not deployed). Tri-protocol
live smoke: 3 on-chain swaps of 5 tUSDC → tUSDT each through v2, v3, and Infinity CL in
sequence — all receipts status 1, total 14.936461 tUSDT out — which also end-to-end
validates both init code hashes (a wrong hash reverts with a mispredicted pool address).

Phase 5 deployed 2026-08-03 via `scripts/deploy-infinity.sh` (core pinned upstream
`397723e`; vault↔pool-manager apps registered, fee controllers set). First CL pool
seeded via `SeedInfinity.s.sol`: tUSDC/tUSDT 0.01%, tickSpacing 1, full-range 2000e6
liquidity through CLPositionManager (Permit2 flow). Verified on-chain: idempotent
re-run reads pool as initialized+funded; CLQuoter static quote 10 tUSDC → 9.948773
tUSDT ✔. No tx-swap entrypoint yet — universal router is the next phase.

Phase 3 deployed 2026-08-03 via `contracts/farms/scripts/deploy.js`. HAWK + NEST
ownership → MasterChef (irreversible, standard MCv1); emissions 1 HAWK/block + 10% dev
cut to deployer. Pools (registry `farms.pools`): 0 HAWK staking (1000), 1 HAWK/WETH LP
(4000), 2 tUSDC/WETH LP (1000), 3 tUSDC/tUSDT LP (1000). Live smoke: deposited 2.179
HAWK-LP into pid 1, accrued 2.5 HAWK in ~4 blocks, harvested 8.25 HAWK ✔
MasterChefV3 + lm-pool deferred (RISKS.md).

Phase 4 deployed 2026-08-03 via `contracts/v3/periphery/scripts/deploy.js` + `seed-pools.js`.
**v3 POOL_INIT_CODE_HASH = `0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5`**
(recomputed after rebrand — pool/deployer at solc 0.7.6, istanbul, optimizer 400 runs,
metadata bytecodeHash none; patched into periphery `PoolAddress.sol`, stored in registry
`v3.poolInitCodeHash`; frontend v3-sdk MUST use it). Callback ABI renamed
`pancakeV3*Callback` → `hawkingV3*Callback` consistently across core+periphery.
Wiring: poolDeployer.setFactoryAddress(factory) done. 3 pools seeded full-range:
HAWK/WETH 0.25% (`0x00bE0e0d…78c9`), WETH/tUSDC 0.05% (`0xb36477fA…5A82`),
tUSDC/tUSDT 0.01% (`0xa105b113…52ec`). Live smoke swap: 10 tUSDC → 9.979043 tUSDT ✔

Phase 2 deployed 2026-08-03 via `contracts/v2/scripts/deploy.js` + `seed-liquidity.js`.
**v2 INIT_CODE_PAIR_HASH = `0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e`**
(recomputed after rebrand, patched into HawkingLibrary.pairFor, cross-checked against
on-chain `factory.INIT_CODE_PAIR_HASH()`; also stored in registry `v2.initCodePairHash` —
the frontend v2-sdk MUST use this value). feeToSetter = deployer. 5 pairs seeded:
HAWK/WETH (380 + 0.05 ETH), tUSDC/WETH (190 + 0.05 ETH), tUSDC/tUSDT (10k/10k),
tDAI/tUSDC (10k/10k), tWBTC/tUSDC (1/115k). Live smoke swap: 10 tUSDC → 9.965059 tUSDT ✔

Phase 1 deployed 2026-08-03 by `0x8DAF…5e95` via `scripts/deploy-tokens.sh` (idempotent,
re-runnable). Post-deploy state verified on-chain: HAWK supply 11M (10M deployer / 1M
faucet), 5 drips configured, faucet minter on all 4 test tokens, live `claim()` smoke
test passed (1000 tUSDC + 0.1 tWBTC + 1000 tUSDT + 1000 tDAI + 100 HAWK received).
Basescan verification still pending an API key (Blockscout used instead — keyless).
