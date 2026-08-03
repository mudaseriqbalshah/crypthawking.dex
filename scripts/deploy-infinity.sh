#!/usr/bin/env bash
# Phase 5: deploy the Infinity (v4 singleton) stack to Base Sepolia.
# Core: Vault + CL/Bin pool managers + protocol fee controllers, then periphery:
# position descriptor/managers + quoters + tick lens. Idempotent: registry-gated
# deploys, on-chain-guarded wiring. Swap router = universal router (later phase).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
REG=packages/deployments/base-sepolia.json
RPC=${RPC_URL:-https://sepolia.base.org}
NFT_URI="https://dex.cryptohawking.com/api/infinity/nft/"
UNSUB_GAS=300000

reg_get() { jq -r ".infinity.\"$1\" // empty" "$REG"; }
reg_set() { local tmp; tmp=$(mktemp); jq ".infinity.\"$1\" = \"$2\"" "$REG" > "$tmp" && mv "$tmp" "$REG"; echo "   registry: infinity.$1 = $2"; }
infra() { jq -r ".infra.\"$1\"" "$REG"; }

# deploy <pkg-dir> <registry-key> <path:Contract> [ctor args...]
deploy() {
  local pkg=$1 key=$2 target=$3; shift 3
  local addr; addr=$(reg_get "$key")
  if [ -n "$addr" ] && [ "$(cast code "$addr" --rpc-url "$RPC")" != "0x" ]; then
    echo "== $key already at $addr (skip)"; return
  fi
  echo "== deploying $key"
  local out
  if [ $# -gt 0 ]; then
    out=$(forge create --root "contracts/infinity/$pkg" "$target" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --json --constructor-args "$@")
  else
    out=$(forge create --root "contracts/infinity/$pkg" "$target" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --json)
  fi
  addr=$(echo "$out" | jq -r '.deployedTo // empty')
  [ -n "$addr" ] || { echo "deploy of $key failed: $out" >&2; exit 1; }
  reg_set "$key" "$addr"
}

send() { cast send "$1" "$2" "${@:3}" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null; }

# ---- core ----
deploy core Vault src/Vault.sol:Vault
VAULT=$(reg_get Vault)
deploy core CLPoolManager src/pool-cl/CLPoolManager.sol:CLPoolManager "$VAULT"
deploy core BinPoolManager src/pool-bin/BinPoolManager.sol:BinPoolManager "$VAULT"
CLPM=$(reg_get CLPoolManager); BINPM=$(reg_get BinPoolManager)

for app in $CLPM $BINPM; do
  if [ "$(cast call "$VAULT" 'isAppRegistered(address)(bool)' "$app" --rpc-url "$RPC")" = "false" ]; then
    echo "== vault.registerApp($app)"
    send "$VAULT" 'registerApp(address)' "$app"
  fi
done

deploy core CLProtocolFeeController src/ProtocolFeeController.sol:ProtocolFeeController "$CLPM"
deploy core BinProtocolFeeController src/ProtocolFeeController.sol:ProtocolFeeController "$BINPM"
for pair in "$CLPM:$(reg_get CLProtocolFeeController)" "$BINPM:$(reg_get BinProtocolFeeController)"; do
  pm="${pair%%:*}"; ctrl="${pair#*:}"
  if [ "$(cast call "$pm" 'protocolFeeController()(address)' --rpc-url "$RPC")" != "$ctrl" ]; then
    echo "== setProtocolFeeController on $pm"
    send "$pm" 'setProtocolFeeController(address)' "$ctrl"
  fi
done

# ---- periphery ----
PERMIT2=$(infra Permit2); WETH9=$(infra WETH9)
deploy periphery CLPositionDescriptor src/pool-cl/CLPositionDescriptorOffChain.sol:CLPositionDescriptorOffChain "$NFT_URI"
deploy periphery CLPositionManager src/pool-cl/CLPositionManager.sol:CLPositionManager "$VAULT" "$CLPM" "$PERMIT2" "$UNSUB_GAS" "$(reg_get CLPositionDescriptor)" "$WETH9"
deploy periphery BinPositionManager src/pool-bin/BinPositionManager.sol:BinPositionManager "$VAULT" "$BINPM" "$PERMIT2" "$WETH9"
deploy periphery CLQuoter src/pool-cl/lens/CLQuoter.sol:CLQuoter "$CLPM"
deploy periphery BinQuoter src/pool-bin/lens/BinQuoter.sol:BinQuoter "$BINPM"
deploy periphery CLTickLens src/pool-cl/lens/TickLens.sol:TickLens "$CLPM"

echo "done. infinity:"
jq '.infinity' "$REG"
