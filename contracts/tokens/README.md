# @cryptohawking/tokens

HAWK token, valueless test ERC20s, and the faucet for the CryptoHawking DEX on
Base Sepolia. **Testnet-only assets.**

- `src/HawkToken.sol` — fork of PancakeSwap `CakeToken` (rename-only: "Crypto Hawking
  Token" / HAWK, 18 dec, owner-mint + Compound-style governance). Owner will become
  MasterChef in the farms phase.
- `src/vendor/bsc-library/` — upstream BEP20 base (pancakeswap/bsc-library), unmodified.
- `src/TestERC20.sol` — minimal mintable ERC20 with configurable decimals and a
  minter allowlist (the faucet is a minter).
- `src/Faucet.sol` — dispenses all registered drips per claim, 24h per-address cooldown.
  Mint-mode for test tokens; transfer-mode for HAWK (from a pre-minted 1M balance).

## Dependencies (gitignored `lib/`, restore with:)

```bash
git clone --depth 1 --branch v3.4.2 https://github.com/OpenZeppelin/openzeppelin-contracts.git lib/openzeppelin-contracts
git clone --depth 1 --branch v1.9.7 https://github.com/foundry-rs/forge-std.git lib/forge-std
```

## Commands

```bash
forge build && forge test        # 8 tests
../../scripts/deploy-tokens.sh   # idempotent deploy + config (reads ../../.env)
```

Deployed addresses live in `packages/deployments/base-sepolia.json` (`.tokens`).
