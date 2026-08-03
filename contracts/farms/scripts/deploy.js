// Deploys NestBar + MasterChef and wires farming: HAWK/NEST ownership moves to
// MasterChef (standard MCv1 design — HAWK minting is then emissions-only,
// irreversible; the faucet keeps dispensing from its pre-minted balance), and
// three v2 LP farm pools are added next to the built-in HAWK staking pool 0.
// Idempotent via registry + on-chain guards.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../packages/deployments/base-sepolia.json");
const HAWK_PER_BLOCK = ethers.parseEther("1"); // ~43k HAWK/day at Base 2s blocks (testnet)

const FARM_POOLS = [
  { name: "HAWK/WETH", alloc: 4000 },
  { name: "tUSDC/WETH", alloc: 1000 },
  { name: "tUSDC/tUSDT", alloc: 1000 },
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

  const nestAddr = await ensure("NestBar", async () =>
    (await ethers.getContractFactory("NestBar")).deploy(reg.tokens.HAWK)
  );
  const startBlock = await ethers.provider.getBlockNumber();
  const chefAddr = await ensure("MasterChef", async () =>
    (await ethers.getContractFactory("MasterChef")).deploy(
      reg.tokens.HAWK, nestAddr, deployer.address, HAWK_PER_BLOCK, startBlock
    )
  );

  for (const [label, addr] of [["HAWK", reg.tokens.HAWK], ["NestBar", nestAddr]]) {
    const c = await ethers.getContractAt("HawkToken", addr);
    const owner = await c.owner();
    if (owner === deployer.address) {
      console.log(`== transferring ${label} ownership -> MasterChef`);
      await (await c.transferOwnership(chefAddr)).wait(2);
    } else if (owner === chefAddr) {
      console.log(`== ${label} already owned by MasterChef (skip)`);
    } else {
      throw new Error(`${label} owned by unexpected address ${owner}`);
    }
  }

  const chef = await ethers.getContractAt("MasterChef", chefAddr);
  const v2factory = new ethers.Contract(
    reg.v2.HawkingFactory,
    ["function getPair(address,address) view returns (address)"],
    deployer
  );
  const tokenAddr = (name) => (name === "WETH" ? reg.infra.WETH9 : reg.tokens[name]);

  if ((await chef.poolLength()) === 1n) {
    console.log("== adding farm pools");
    reg.farms.pools = { 0: { name: "HAWK staking", lp: reg.tokens.HAWK, alloc: 1000 } };
    let pid = 1;
    for (const p of FARM_POOLS) {
      const [a, b] = p.name.split("/");
      const lp = await v2factory.getPair(tokenAddr(a), tokenAddr(b));
      if (lp === ethers.ZeroAddress) throw new Error(`no v2 pair for ${p.name}`);
      await (await chef.add(p.alloc, lp, true)).wait(2);
      reg.farms.pools[pid] = { name: `${p.name} HAWK-LP`, lp, alloc: p.alloc };
      console.log(`   pid ${pid}: ${p.name} (alloc ${p.alloc}) lp=${lp}`);
      pid++;
    }
    save();
  } else {
    console.log(`== pools already added (poolLength=${await chef.poolLength()}, skip)`);
  }

  console.log("done. farms:", JSON.stringify(reg.farms, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
