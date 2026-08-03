// Deploys v3 position farming: MasterChefV3 + HawkingV3LmPoolDeployer, wires the
// v3 factory (setLmPoolDeployer) and MCv3 (setLMPoolDeployer, receiver), adds the
// three live v3 pools as farms, and funds 30 days of HAWK emissions via upkeep.
// Idempotent: registry-gated deploys, on-chain-guarded wiring.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../../packages/deployments/base-sepolia.json");
const lmArtifact = require(path.join(
  __dirname,
  "../../v3-lm-pool/artifacts/contracts/HawkingV3LmPoolDeployer.sol/HawkingV3LmPoolDeployer.json"
));

const UPKEEP_AMOUNT = ethers.parseEther("100000"); // 100k HAWK over 30 days
const UPKEEP_DURATION = 30n * 24n * 3600n;
const FARM_POOLS = [
  { name: "HAWK/WETH", a: "HAWK", b: "WETH", fee: 2500, alloc: 200 },
  { name: "WETH/tUSDC", a: "WETH", b: "tUSDC", fee: 500, alloc: 100 },
  { name: "tUSDC/tUSDT", a: "tUSDC", b: "tUSDT", fee: 100, alloc: 100 },
];

async function main() {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const save = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n");
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  async function ensure(key, deployFn) {
    const existing = reg.farms[key];
    if (existing && (await ethers.provider.getCode(existing)) !== "0x") {
      console.log(`== ${key} already at ${existing} (skip)`);
      return existing;
    }
    console.log(`== deploying ${key}`);
    const c = await deployFn();
    await c.deploymentTransaction().wait(2);
    const addr = await c.getAddress();
    reg.farms[key] = addr;
    save();
    console.log(`   registry: farms.${key} = ${addr}`);
    return addr;
  }

  const chefAddr = await ensure("MasterChefV3", async () =>
    (await ethers.getContractFactory("MasterChefV3")).deploy(
      reg.tokens.HAWK, reg.v3.NonfungiblePositionManager, reg.infra.WETH9
    )
  );
  const lmAddr = await ensure("HawkingV3LmPoolDeployer", async () =>
    (await ethers.getContractFactoryFromArtifact(lmArtifact)).deploy(chefAddr)
  );

  const chef = await ethers.getContractAt("MasterChefV3", chefAddr);
  const factory = new ethers.Contract(
    reg.v3.HawkingV3Factory,
    [
      "function lmPoolDeployer() view returns (address)",
      "function setLmPoolDeployer(address)",
      "function getPool(address,address,uint24) view returns (address)",
    ],
    deployer
  );
  const hawk = new ethers.Contract(
    reg.tokens.HAWK,
    ["function allowance(address,address) view returns (uint256)", "function approve(address,uint256)"],
    deployer
  );

  if ((await factory.lmPoolDeployer()) !== lmAddr) {
    console.log("== v3factory.setLmPoolDeployer");
    await (await factory.setLmPoolDeployer(lmAddr)).wait(2);
  }
  if ((await chef.LMPoolDeployer()) !== lmAddr) {
    console.log("== chef.setLMPoolDeployer");
    await (await chef.setLMPoolDeployer(lmAddr)).wait(2);
  }
  if ((await hawk.allowance(deployer.address, chefAddr)) !== ethers.MaxUint256) {
    console.log("== approving HAWK to chef (required before setReceiver)");
    await (await hawk.approve(chefAddr, ethers.MaxUint256)).wait(2);
  }
  if ((await chef.receiver()) !== deployer.address) {
    console.log("== chef.setReceiver(deployer)");
    await (await chef.setReceiver(deployer.address)).wait(2);
  }

  if ((await chef.poolLength()) === 0n) {
    console.log("== adding v3 farm pools (deploys an LmPool per pool)");
    reg.farms.v3Pools = {};
    const tokenAddr = (n) => (n === "WETH" ? reg.infra.WETH9 : reg.tokens[n]);
    let pid = 1;
    for (const p of FARM_POOLS) {
      const pool = await factory.getPool(tokenAddr(p.a), tokenAddr(p.b), p.fee);
      if (pool === ethers.ZeroAddress) throw new Error(`no v3 pool for ${p.name}`);
      await (await chef.add(p.alloc, pool, true)).wait(2);
      reg.farms.v3Pools[pid] = { name: p.name, pool, fee: p.fee, alloc: p.alloc };
      console.log(`   pid ${pid}: ${p.name} pool=${pool}`);
      pid++;
    }
    save();
  } else {
    console.log(`== pools already added (poolLength=${await chef.poolLength()}, skip)`);
  }

  if ((await chef.latestPeriodEndTime()) < BigInt(Math.floor(Date.now() / 1000))) {
    console.log("== funding upkeep: 100k HAWK / 30 days");
    await (await chef.upkeep(UPKEEP_AMOUNT, UPKEEP_DURATION, true)).wait(2);
  } else {
    console.log("== emission period already active (skip)");
  }

  console.log("done. MCv3:", chefAddr, "LmPoolDeployer:", lmAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
