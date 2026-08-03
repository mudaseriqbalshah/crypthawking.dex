# @cryptohawking/v2-contracts

Rename-only fork of PancakeSwap v2 (exchange-protocol) for Base Sepolia:
HawkingFactory + HawkingPair (LP token "Hawking LPs" / HAWK-LP) at solc 0.5.16,
HawkingRouter (Router02) at 0.6.6. Optimizer 99999 runs (upstream settings —
do not change without recomputing the init code hash).

## INIT_CODE_PAIR_HASH — read this before touching HawkingPair

`HawkingLibrary.pairFor` hardcodes `keccak256(HawkingPair creationCode)`.
After ANY change affecting pair bytecode (source, solc version, optimizer):

```bash
npx hardhat compile && npm run init-hash   # prints the new hash
# patch contracts/libraries/HawkingLibrary.sol + frontend v2-sdk + registry
npx hardhat test                           # test suite cross-checks all three
```

Current hash: `0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e`

## Deviations from upstream (tooling only, logic untouched)

- `TransferHelper.sol` vendored from Uniswap/solidity-lib (was `@uniswap/lib` npm dep)
- `PancakeRouter01.sol`, `PancakeZapV1.sol` not forked (legacy / deferred)
- fresh minimal hardhat toolchain instead of the 2021 upstream one

## Commands

```bash
pnpm install && npx hardhat test                            # 5 fork tests
npx hardhat run scripts/deploy.js --network baseSepolia     # idempotent
npx hardhat run scripts/seed-liquidity.js --network baseSepolia
npx hardhat verify --network baseSepolia <addr> <ctor args> # Basescan if key, else Blockscout
```
