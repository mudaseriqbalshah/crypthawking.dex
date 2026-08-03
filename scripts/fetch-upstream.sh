#!/usr/bin/env bash
# Shallow-clone (or update) all PancakeSwap upstream sources into upstream/.
# Idempotent: re-running fetches the latest default branch of anything present.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p upstream

REPOS=(
  pancakeswap/pancake-smart-contracts
  pancakeswap/pancake-swap-core
  pancakeswap/pancake-v3-contracts
  pancakeswap/infinity-core
  pancakeswap/infinity-periphery
  pancakeswap/infinity-universal-router
  pancakeswap/pancake-frontend
  pancakeswap/token-list
  pancakeswap/pancake-subgraph
)

for repo in "${REPOS[@]}"; do
  name="${repo#*/}"
  if [ -d "upstream/$name/.git" ]; then
    echo "== updating $name"
    git -C "upstream/$name" fetch --depth 1 origin
    git -C "upstream/$name" reset --hard origin/HEAD 2>/dev/null || true
  else
    echo "== cloning $name"
    git clone --depth 1 "https://github.com/$repo.git" "upstream/$name"
  fi
  git -C "upstream/$name" log -1 --format="   %h %cs %s" || true
done
echo "done."
