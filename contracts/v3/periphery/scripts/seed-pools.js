// Seeds three v3 pools with full-range liquidity at test-price anchors
// (ETH $3800, HAWK $0.50, stables 1:1). Idempotent: initialized pools with
// liquidity are skipped; WETH wrapping and token mints are need-based.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../../packages/deployments/base-sepolia.json");
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function deposit() payable",
];
const POOL_ABI = [
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint32, bool)",
];

function bigintSqrt(n) {
  if (n < 2n) return n;
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}
// price = token1 raw units per token0 raw unit, as num/den
const sqrtPriceX96 = (num, den) => bigintSqrt((num << 192n) / den);

async function main() {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const [deployer] = await ethers.getSigners();
  const npm = await ethers.getContractAt("NonfungiblePositionManager", reg.v3.NonfungiblePositionManager);
  const factoryAbi = ["function getPool(address,address,uint24) view returns (address)"];
  const factory = new ethers.Contract(reg.v3.HawkingV3Factory, factoryAbi, deployer);
  const t = (addr) => new ethers.Contract(addr, ERC20_ABI, deployer);

  const WETH = reg.infra.WETH9;
  const { HAWK, tUSDC, tUSDT } = reg.tokens;

  // token0/token1 pre-sorted by address: HAWK < WETH < tUSDC < tUSDT
  const POOLS = [
    { name: "HAWK/WETH", t0: HAWK, t1: WETH, fee: 2500, tick: 887250,
      price: sqrtPriceX96(10n ** 18n, 7600n * 10n ** 18n), // 7600 HAWK per WETH
      amt0: ethers.parseEther("228"), amt1: ethers.parseEther("0.03") },
    { name: "WETH/tUSDC", t0: WETH, t1: tUSDC, fee: 500, tick: 887270,
      price: sqrtPriceX96(3800n * 10n ** 6n, 10n ** 18n), // 3800 tUSDC per WETH
      amt0: ethers.parseEther("0.03"), amt1: 114n * 10n ** 6n },
    { name: "tUSDC/tUSDT", t0: tUSDC, t1: tUSDT, fee: 100, tick: 887272,
      price: sqrtPriceX96(1n, 1n),
      amt0: 5000n * 10n ** 6n, amt1: 5000n * 10n ** 6n },
  ];

  // WETH need: 0.06 total across pools
  const weth = t(WETH);
  const wethNeed = ethers.parseEther("0.06");
  if ((await weth.balanceOf(deployer.address)) < wethNeed) {
    console.log("== wrapping 0.06 ETH -> WETH");
    await (await weth.deposit({ value: wethNeed })).wait(2);
  }

  for (const p of POOLS) {
    const poolAddr = await factory.getPool(p.t0, p.t1, p.fee);
    if (poolAddr !== ethers.ZeroAddress) {
      const pool = new ethers.Contract(poolAddr, POOL_ABI, deployer);
      if ((await pool.liquidity()) > 0n) {
        console.log(`== ${p.name} already seeded (skip)`);
        continue;
      }
    }
    console.log(`== seeding ${p.name} (fee ${p.fee})`);
    for (const [addr, amt] of [[p.t0, p.amt0], [p.t1, p.amt1]]) {
      const tok = t(addr);
      if (addr !== WETH && (await tok.balanceOf(deployer.address)) < amt) {
        await (await tok.mint(deployer.address, amt)).wait(2);
        console.log("   minted top-up");
      }
      if ((await tok.allowance(deployer.address, reg.v3.NonfungiblePositionManager)) < amt) {
        await (await tok.approve(reg.v3.NonfungiblePositionManager, ethers.MaxUint256)).wait(2);
        console.log("   approved NPM");
      }
    }
    await (await npm.createAndInitializePoolIfNecessary(p.t0, p.t1, p.fee, p.price)).wait(2);
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    await (
      await npm.mint({
        token0: p.t0, token1: p.t1, fee: p.fee,
        tickLower: -p.tick, tickUpper: p.tick,
        amount0Desired: p.amt0, amount1Desired: p.amt1,
        amount0Min: 0, amount1Min: 0,
        recipient: deployer.address, deadline,
      })
    ).wait(2);
    console.log(`   pool ${await factory.getPool(p.t0, p.t1, p.fee)} seeded`);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
