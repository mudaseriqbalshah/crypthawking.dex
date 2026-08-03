// Prints keccak256(HawkingPair creationCode) — the v2 INIT_CODE_PAIR_HASH.
// Run after ANY change to pair bytecode (source or compiler settings), then patch
// the hardcoded hash in contracts/libraries/HawkingLibrary.sol (pairFor) and the
// frontend v2-sdk. The on-chain factory exposes the same value as
// INIT_CODE_PAIR_HASH so the patch can always be cross-checked.
const hre = require("hardhat");

async function main() {
  const artifact = await hre.artifacts.readArtifact("HawkingPair");
  console.log(hre.ethers.keccak256(artifact.bytecode));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
