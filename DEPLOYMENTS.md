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

_None yet. Deployer address: TBD (waiting on funded Base Sepolia key — see RISKS.md)._

| Phase | Contract | Address | Tx | Basescan verified |
|---|---|---|---|---|
