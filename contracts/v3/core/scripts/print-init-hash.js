// Prints keccak256(HawkingV3Pool creationCode) — the v3 POOL_INIT_CODE_HASH.
// Patch into periphery contracts/libraries/PoolAddress.sol and the frontend
// v3-sdk after ANY pool bytecode change.
const hre = require("hardhat");

async function main() {
  const artifact = await hre.artifacts.readArtifact("HawkingV3Pool");
  console.log(hre.ethers.keccak256(artifact.bytecode));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
