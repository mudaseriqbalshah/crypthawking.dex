#!/usr/bin/env bash
# Phase 1: deploy HAWK, test ERC20s, and the faucet to Base Sepolia.
# Idempotent: every deploy is skipped when the registry already holds an address
# with code; every config tx is guarded by an on-chain state read. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
REG=packages/deployments/base-sepolia.json
RPC=${RPC_URL:-https://sepolia.base.org}
PKG=contracts/tokens
DEPLOYER=$(cast wallet address "$DEPLOYER_PRIVATE_KEY")
echo "deployer: $DEPLOYER  balance: $(cast balance "$DEPLOYER" --rpc-url "$RPC" --ether) ETH"

reg_get() { jq -r ".tokens.\"$1\" // empty" "$REG"; }
reg_set() { local tmp; tmp=$(mktemp); jq ".tokens.\"$1\" = \"$2\"" "$REG" > "$tmp" && mv "$tmp" "$REG"; echo "   registry: tokens.$1 = $2"; }

# deploy <registry-key> <path:Contract> [constructor args...]
deploy() {
  local key=$1 target=$2; shift 2
  local addr; addr=$(reg_get "$key")
  if [ -n "$addr" ] && [ "$(cast code "$addr" --rpc-url "$RPC")" != "0x" ]; then
    echo "== $key already deployed at $addr (skip)"; return
  fi
  echo "== deploying $key ($target)"
  local out
  if [ $# -gt 0 ]; then
    out=$(forge create --root "$PKG" "$target" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --json --constructor-args "$@")
  else
    out=$(forge create --root "$PKG" "$target" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" --broadcast --json)
  fi
  addr=$(echo "$out" | jq -r '.deployedTo // empty')
  [ -n "$addr" ] || { echo "deploy of $key failed: $out" >&2; exit 1; }
  reg_set "$key" "$addr"
}

send() { cast send "$1" "$2" "${@:3}" --rpc-url "$RPC" --private-key "$DEPLOYER_PRIVATE_KEY" >/dev/null; }

deploy HAWK   src/HawkToken.sol:HawkToken
deploy tUSDC  src/TestERC20.sol:TestERC20 "Test USD Coin" tUSDC 6
deploy tUSDT  src/TestERC20.sol:TestERC20 "Test Tether USD" tUSDT 6
deploy tDAI   src/TestERC20.sol:TestERC20 "Test Dai Stablecoin" tDAI 18
deploy tWBTC  src/TestERC20.sol:TestERC20 "Test Wrapped BTC" tWBTC 8
deploy Faucet src/Faucet.sol:Faucet 86400

HAWK=$(reg_get HAWK); FAUCET=$(reg_get Faucet)

echo "== minter grants"
for t in tUSDC tUSDT tDAI tWBTC; do
  addr=$(reg_get "$t")
  if [ "$(cast call "$addr" 'isMinter(address)(bool)' "$FAUCET" --rpc-url "$RPC")" = "false" ]; then
    echo "   $t.setMinter(faucet, true)"
    send "$addr" 'setMinter(address,bool)' "$FAUCET" true
  fi
done

echo "== faucet drips"
if [ "$(cast call "$FAUCET" 'dripCount()(uint256)' --rpc-url "$RPC")" != "5" ]; then
  send "$FAUCET" 'setDrip(address,uint256,uint8)' "$(reg_get tUSDC)" 1000000000 0                  # 1000 tUSDC (mint)
  send "$FAUCET" 'setDrip(address,uint256,uint8)' "$(reg_get tUSDT)" 1000000000 0                  # 1000 tUSDT (mint)
  send "$FAUCET" 'setDrip(address,uint256,uint8)' "$(reg_get tDAI)"  1000000000000000000000 0      # 1000 tDAI (mint)
  send "$FAUCET" 'setDrip(address,uint256,uint8)' "$(reg_get tWBTC)" 10000000 0                    # 0.1 tWBTC (mint)
  send "$FAUCET" 'setDrip(address,uint256,uint8)' "$HAWK" 100000000000000000000 1                  # 100 HAWK (transfer)
  echo "   5 drips configured"
else
  echo "   already configured (skip)"
fi

echo "== initial HAWK supply (guards are independent so partial runs self-heal)"
if [ "$(cast call "$HAWK" 'totalSupply()(uint256)' --rpc-url "$RPC" | awk '{print $1}')" = "0" ]; then
  send "$HAWK" 'mint(address,uint256)' "$DEPLOYER" 10000000000000000000000000   # 10M HAWK to deployer (LP seed + farm funding)
  echo "   minted 10M HAWK -> deployer"
fi
if [ "$(cast call "$HAWK" 'balanceOf(address)(uint256)' "$FAUCET" --rpc-url "$RPC" | awk '{print $1}')" = "0" ]; then
  send "$HAWK" 'mint(address,uint256)' "$FAUCET" 1000000000000000000000000      # 1M HAWK to faucet
  echo "   minted 1M HAWK -> faucet"
fi

echo "done. addresses:"
jq '.tokens' "$REG"
