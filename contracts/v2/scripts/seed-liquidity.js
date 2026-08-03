// Seeds initial v2 liquidity on Base Sepolia. Idempotent: a pair that already
// has reserves is skipped; test-token balances are minted only when short.
// ETH spend is intentionally small (2 x 0.05 ETH pairs).
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = path.join(__dirname, "../../../packages/deployments/base-sepolia.json");
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function mint(address,uint256)",
  "function owner() view returns (address)",
];
const PAIR_ABI = ["function getReserves() view returns (uint112,uint112,uint32)"];

// Rough price anchors (test values only): ETH $3800, HAWK $0.50, BTC $115k.
const PAIRS = [
  { a: "HAWK", eth: "0.05", amtA: "380", mintable: false },
  { a: "tUSDC", eth: "0.05", amtA: "190", mintable: true },
  { a: "tUSDC", b: "tUSDT", amtA: "10000", amtB: "10000", mintable: true },
  { a: "tDAI", b: "tUSDC", amtA: "10000", amtB: "10000", mintable: true },
  { a: "tWBTC", b: "tUSDC", amtA: "1", amtB: "115000", mintable: true },
];

async function main() {
  const reg = JSON.parse(fs.readFileSync(REG, "utf8"));
  const [deployer] = await ethers.getSigners();
  const router = await ethers.getContractAt("HawkingRouter", reg.v2.HawkingRouter);
  const factory = await ethers.getContractAt("HawkingFactory", reg.v2.HawkingFactory);
  const routerAddr = reg.v2.HawkingRouter;
  const deadline = () => Math.floor(Date.now() / 1000) + 1200;

  const token = (key) => new ethers.Contract(reg.tokens[key], ERC20_ABI, deployer);

  async function hasReserves(addrA, addrB) {
    const pairAddr = await factory.getPair(addrA, addrB);
    if (pairAddr === ethers.ZeroAddress) return false;
    const [r0, r1] = await new ethers.Contract(pairAddr, PAIR_ABI, deployer).getReserves();
    return r0 > 0n && r1 > 0n;
  }

  async function ensureBalanceAndApproval(t, amount, mintable) {
    const bal = await t.balanceOf(deployer.address);
    if (bal < amount) {
      if (!mintable) throw new Error(`insufficient non-mintable balance for ${t.target}`);
      await (await t.mint(deployer.address, amount)).wait(2);
      console.log(`   minted top-up on ${t.target}`);
    }
    if ((await t.allowance(deployer.address, routerAddr)) < amount) {
      await (await t.approve(routerAddr, ethers.MaxUint256)).wait(2);
      console.log(`   approved router on ${t.target}`);
    }
  }

  for (const p of PAIRS) {
    const tA = token(p.a);
    const decA = await tA.decimals();
    const amtA = ethers.parseUnits(p.amtA, decA);
    if (p.eth) {
      if (await hasReserves(reg.tokens[p.a], reg.infra.WETH9)) {
        console.log(`== ${p.a}/ETH already seeded (skip)`);
        continue;
      }
      console.log(`== seeding ${p.a}/ETH`);
      await ensureBalanceAndApproval(tA, amtA, p.mintable);
      await (
        await router.addLiquidityETH(tA.target, amtA, 0, 0, deployer.address, deadline(), {
          value: ethers.parseEther(p.eth),
        })
      ).wait(2);
    } else {
      if (await hasReserves(reg.tokens[p.a], reg.tokens[p.b])) {
        console.log(`== ${p.a}/${p.b} already seeded (skip)`);
        continue;
      }
      console.log(`== seeding ${p.a}/${p.b}`);
      const tB = token(p.b);
      const amtB = ethers.parseUnits(p.amtB, await tB.decimals());
      await ensureBalanceAndApproval(tA, amtA, p.mintable);
      await ensureBalanceAndApproval(tB, amtB, p.mintable);
      await (
        await router.addLiquidity(tA.target, tB.target, amtA, amtB, 0, 0, deployer.address, deadline())
      ).wait(2);
    }
  }

  console.log("done. pairs:", (await factory.allPairsLength()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
