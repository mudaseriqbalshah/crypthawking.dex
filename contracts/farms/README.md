# @cryptohawking/farms

v2-side farming stack, forked rename-only from PancakeSwap farms-pools
(solc 0.6.12, optimizer 99999 runs): MasterChef (v1 design) + NestBar
(SyrupBar fork — "NestBar Token" / NEST).

**ABI compatibility note:** function/variable names like `pendingCake`,
`cakePerBlock`, `cake()`, `enterStaking` are intentionally KEPT so the forked
frontend's farm ABIs work unchanged. Only type names and token branding changed
(CakeToken→HawkToken, SyrupBar→NestBar).

**Ownership model (standard MCv1, irreversible):** HAWK + NEST are owned by
MasterChef, which mints 1 HAWK/block (+10% dev cut to the deployer address)
distributed by allocPoint. The deployer can no longer mint HAWK directly; the
faucet dispenses from its pre-minted balance.

Pools: 0 = HAWK staking (alloc 1000, mints NEST receipts), 1 = HAWK/WETH LP
(4000), 2 = tUSDC/WETH LP (1000), 3 = tUSDC/tUSDT LP (1000). Full map with LP
addresses in the registry under `farms.pools`.

Also here: masterchef-v3/ (MCv3, solc 0.8.10) + v3-lm-pool/ (LmPool per farmed v3 pool, solc 0.7.6) — v3 position farming, funded via upkeep() rather than minting.

## Commands

```bash
pnpm install && npx hardhat test                        # 4 fork tests
npx hardhat run scripts/deploy.js --network baseSepolia # idempotent deploy + wiring
```
