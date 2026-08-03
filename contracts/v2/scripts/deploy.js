// Deploys HawkingFactory + HawkingRouter to Base Sepolia. Idempotent: skips
// anything already in the registry with code on-chain. Cross-checks the on-chain
// INIT_CODE_PAIR_HASH against the local artifact before finishing.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../packages/deployments/base-sepolia.json");

async function main() {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const save = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n");
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  async function ensure(key, deployFn) {
    const existing = reg.v2[key];
    if (existing && (await ethers.provider.getCode(existing)) !== "0x") {
      console.log(`== ${key} already at ${existing} (skip)`);
      return existing;
    }
    console.log(`== deploying ${key}`);
    const c = await deployFn();
    await c.deploymentTransaction().wait(2);
    const addr = await c.getAddress();
    reg.v2[key] = addr;
    save();
    console.log(`   registry: v2.${key} = ${addr}`);
    return addr;
  }

  const factoryAddr = await ensure("HawkingFactory", async () =>
    (await ethers.getContractFactory("HawkingFactory")).deploy(deployer.address)
  );
  await ensure("HawkingRouter", async () =>
    (await ethers.getContractFactory("HawkingRouter")).deploy(factoryAddr, reg.infra.WETH9)
  );

  const factory = await ethers.getContractAt("HawkingFactory", factoryAddr);
  const onchain = await factory.INIT_CODE_PAIR_HASH();
  const artifact = await hre.artifacts.readArtifact("HawkingPair");
  const local = ethers.keccak256(artifact.bytecode);
  if (onchain !== local) {
    throw new Error(`INIT_CODE_PAIR_HASH mismatch: onchain ${onchain} != local ${local}`);
  }
  reg.v2.initCodePairHash = onchain;
  save();
  console.log("INIT_CODE_PAIR_HASH cross-checked:", onchain);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
