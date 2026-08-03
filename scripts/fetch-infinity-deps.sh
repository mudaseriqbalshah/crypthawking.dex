#!/usr/bin/env bash
# Clones the pinned foundry libs for contracts/infinity/{core,periphery}
# (gitignored). Pins mirror upstream infinity-core@397723e / infinity-periphery
# HEAD gitlinks. Idempotent.
set -euo pipefail
cd "$(dirname "$0")/../contracts/infinity"

fetch_pin() { # dir url sha
  local dir=$1 url=$2 sha=$3
  if [ -d "$dir/.git" ] && [ "$(git -C "$dir" rev-parse HEAD)" = "$sha" ]; then
    echo "== $dir already at ${sha:0:10} (skip)"; return
  fi
  rm -rf "$dir"; mkdir -p "$dir"
  git -C "$dir" init -q
  git -C "$dir" remote add origin "$url"
  git -C "$dir" fetch -q --depth 1 origin "$sha"
  git -C "$dir" checkout -q FETCH_HEAD
  echo "== $dir @ ${sha:0:10}"
}

fetch_pin core/lib/forge-std https://github.com/foundry-rs/forge-std 726a6ee5fc8427a0013d6f624e486c9130c0e336
fetch_pin core/lib/openzeppelin-contracts https://github.com/OpenZeppelin/openzeppelin-contracts 659f3063f82422cef820de746444e6f6cba6ca7c
fetch_pin core/lib/solmate https://github.com/transmissions11/solmate fadb2e2778adbf01c80275bfb99e5c14969d964b
fetch_pin periphery/lib/permit2 https://github.com/pancakeswap/permit2 cc8b7c0715a5916ee1a1c6c3640d98e06326ead6

# periphery sees our core package as lib/infinity-core
mkdir -p periphery/lib
[ -e periphery/lib/infinity-core ] || ln -s ../../core periphery/lib/infinity-core
echo "done."
