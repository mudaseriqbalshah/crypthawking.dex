// Live MCv3 smoke: stake v3 position NFT #1 (HAWK/WETH) by transferring it to
// MasterChefV3, let emissions accrue, then harvest and verify HAWK received.
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const REG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../../../packages/deployments/base-sepolia.json"), "utf8")
);
const TOKEN_ID = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [me] = await ethers.getSigners();
  const chef = await ethers.getContractAt("MasterChefV3", REG.farms.MasterChefV3);
  const npm = new ethers.Contract(
    REG.v3.NonfungiblePositionManager,
    [
      "function ownerOf(uint256) view returns (address)",
      "function safeTransferFrom(address,address,uint256)",
    ],
    me
  );
  const hawk = new ethers.Contract(
    REG.tokens.HAWK,
    ["function balanceOf(address) view returns (uint256)"],
    me
  );

  const owner = await npm.ownerOf(TOKEN_ID);
  if (owner === me.address) {
    console.log(`staking position NFT #${TOKEN_ID} into MCv3...`);
    await (await npm.safeTransferFrom(me.address, REG.farms.MasterChefV3, TOKEN_ID)).wait(2);
  } else if (owner === REG.farms.MasterChefV3) {
    console.log(`position #${TOKEN_ID} already staked`);
  } else {
    throw new Error(`unexpected owner ${owner}`);
  }

  await sleep(8000);
  console.log("pendingCake:", (await chef.pendingCake(TOKEN_ID)).toString());

  const before = await hawk.balanceOf(me.address);
  await (await chef.harvest(TOKEN_ID, me.address)).wait(2);
  await sleep(4000);
  const got = (await hawk.balanceOf(me.address)) - before;
  console.log("harvested HAWK raw:", got.toString());
  if (got === 0n) throw new Error("harvest yielded 0 HAWK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
