// Deploys the full v3 stack to Base Sepolia: core (PoolDeployer + Factory, from
// the core package's artifacts so bytecode matches POOL_INIT_CODE_HASH exactly),
// then periphery (SwapRouter, position descriptor, NPM, QuoterV2, TickLens,
// InterfaceMulticall). Idempotent via the shared registry; the deployer<->factory
// wiring and descriptor initialize are guarded by on-chain reads.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../../packages/deployments/base-sepolia.json");
const coreArtifact = (name) =>
  require(path.join(__dirname, `../../core/artifacts/contracts/${name}.sol/${name}.json`));

const POOL_INIT_CODE_HASH = "0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5";
const NFT_BASE_URI = "https://dex.cryptohawking.com/api/v3/nft/";

async function main() {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const save = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n");
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  // Sanity: the core artifact this script deploys must match the patched hash.
  const localHash = ethers.keccak256(coreArtifact("HawkingV3Pool").bytecode);
  if (localHash !== POOL_INIT_CODE_HASH) {
    throw new Error(`core artifact hash ${localHash} != patched ${POOL_INIT_CODE_HASH} — recompile/patch first`);
  }

  async function ensure(key, deployFn) {
    const existing = reg.v3[key];
    if (existing && (await ethers.provider.getCode(existing)) !== "0x") {
      console.log(`== ${key} already at ${existing} (skip)`);
      return existing;
    }
    console.log(`== deploying ${key}`);
    const c = await deployFn();
    await c.deploymentTransaction().wait(2);
    const addr = await c.getAddress();
    reg.v3[key] = addr;
    save();
    console.log(`   registry: v3.${key} = ${addr}`);
    return addr;
  }

  const WETH9 = reg.infra.WETH9;

  const poolDeployerAddr = await ensure("HawkingV3PoolDeployer", async () =>
    (await ethers.getContractFactoryFromArtifact(coreArtifact("HawkingV3PoolDeployer"))).deploy()
  );
  const factoryAddr = await ensure("HawkingV3Factory", async () =>
    (await ethers.getContractFactoryFromArtifact(coreArtifact("HawkingV3Factory"))).deploy(poolDeployerAddr)
  );

  const poolDeployer = new ethers.Contract(
    poolDeployerAddr,
    ["function factoryAddress() view returns (address)", "function setFactoryAddress(address)"],
    deployer
  );
  if ((await poolDeployer.factoryAddress()) === ethers.ZeroAddress) {
    console.log("== wiring poolDeployer.setFactoryAddress(factory)");
    await (await poolDeployer.setFactoryAddress(factoryAddr)).wait(2);
  } else {
    console.log("== poolDeployer already wired (skip)");
  }

  await ensure("SwapRouter", async () =>
    (await ethers.getContractFactory("SwapRouter")).deploy(poolDeployerAddr, factoryAddr, WETH9)
  );

  const descriptorAddr = await ensure("NonfungibleTokenPositionDescriptorOffChain", async () =>
    (await ethers.getContractFactory("NonfungibleTokenPositionDescriptorOffChain")).deploy()
  );
  const descriptor = new ethers.Contract(
    descriptorAddr,
    ["function tokenURI(address,uint256) view returns (string)", "function initialize(string)"],
    deployer
  );
  // tokenURI returns "" until initialize() has set the base URI.
  if ((await descriptor.tokenURI(deployer.address, 1)) === "") {
    console.log("== initializing descriptor baseTokenURI");
    await (await descriptor.initialize(NFT_BASE_URI)).wait(2);
  } else {
    console.log("== descriptor already initialized (skip)");
  }

  await ensure("NonfungiblePositionManager", async () =>
    (await ethers.getContractFactory("NonfungiblePositionManager")).deploy(
      poolDeployerAddr, factoryAddr, WETH9, descriptorAddr
    )
  );
  await ensure("QuoterV2", async () =>
    (await ethers.getContractFactory("QuoterV2")).deploy(poolDeployerAddr, factoryAddr, WETH9)
  );
  await ensure("TickLens", async () => (await ethers.getContractFactory("TickLens")).deploy());
  await ensure("HawkingInterfaceMulticall", async () =>
    (await ethers.getContractFactory("HawkingInterfaceMulticall")).deploy()
  );

  reg.v3.poolInitCodeHash = POOL_INIT_CODE_HASH;
  save();
  console.log("done. v3:", JSON.stringify(reg.v3, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
