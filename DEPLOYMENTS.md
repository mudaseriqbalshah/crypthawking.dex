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

Phase 1 deployed 2026-08-03 by `0x8DAF…5e95` via `scripts/deploy-tokens.sh` (idempotent,
re-runnable). Post-deploy state verified on-chain: HAWK supply 11M (10M deployer / 1M
faucet), 5 drips configured, faucet minter on all 4 test tokens, live `claim()` smoke
test passed (1000 tUSDC + 0.1 tWBTC + 1000 tUSDT + 1000 tDAI + 100 HAWK received).
Basescan verification still pending an API key (Blockscout used instead — keyless).
