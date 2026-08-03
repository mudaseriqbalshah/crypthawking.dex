// Fork-integrity tests: init code hash consistency, LP branding, and a full
// add/swap/remove cycle through the router (which computes pair addresses via
// the hardcoded hash in HawkingLibrary — a stale hash fails here immediately).
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoHawking v2 fork", function () {
  let deployer, user, factory, router, weth, tokenA, tokenB;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    factory = await (await ethers.getContractFactory("HawkingFactory")).deploy(deployer.address);
    weth = await (await ethers.getContractFactory("WBNB")).deploy();
    router = await (
      await ethers.getContractFactory("HawkingRouter")
    ).deploy(await factory.getAddress(), await weth.getAddress());
    const Mock = await ethers.getContractFactory("MockERC20");
    tokenA = await Mock.deploy("TokenA", "TKA", ethers.parseEther("1000000"));
    tokenB = await Mock.deploy("TokenB", "TKB", ethers.parseEther("1000000"));
  });

  it("factory INIT_CODE_PAIR_HASH matches artifact and library patch", async function () {
    const artifact = await hre.artifacts.readArtifact("HawkingPair");
    const computed = ethers.keccak256(artifact.bytecode);
    expect(await factory.INIT_CODE_PAIR_HASH()).to.equal(computed);
    expect(computed).to.equal("0xdd198c2e09078ada1f08cf8af11ae51f6440888c218c1a1062b3ef1048c30b7e");
  });

  it("LP token is branded Hawking LPs / HAWK-LP", async function () {
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pairAddr = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt("HawkingPair", pairAddr);
    expect(await pair.name()).to.equal("Hawking LPs");
    expect(await pair.symbol()).to.equal("HAWK-LP");
  });

  it("addLiquidity via router creates the pair at the pairFor address", async function () {
    const a = await tokenA.getAddress();
    const b = await tokenB.getAddress();
    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 600;
    // Reverts with TRANSFER_FAILED if the library hash mispredicts the address.
    await router.addLiquidity(
      a, b, ethers.parseEther("1000"), ethers.parseEther("1000"), 0, 0, deployer.address, deadline
    );
    const pair = await ethers.getContractAt("HawkingPair", await factory.getPair(a, b));
    expect(await pair.balanceOf(deployer.address)).to.be.gt(0);
  });

  it("swap and removeLiquidity work end-to-end", async function () {
    const a = await tokenA.getAddress();
    const b = await tokenB.getAddress();
    const routerAddr = await router.getAddress();
    await tokenA.approve(routerAddr, ethers.MaxUint256);
    await tokenB.approve(routerAddr, ethers.MaxUint256);
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 600;
    await router.addLiquidity(
      a, b, ethers.parseEther("1000"), ethers.parseEther("1000"), 0, 0, deployer.address, deadline
    );

    await tokenA.transfer(user.address, ethers.parseEther("10"));
    await tokenA.connect(user).approve(routerAddr, ethers.MaxUint256);
    await router.connect(user).swapExactTokensForTokens(
      ethers.parseEther("10"), 0, [a, b], user.address, deadline
    );
    const out = await tokenB.balanceOf(user.address);
    expect(out).to.be.gt(ethers.parseEther("9.8"));
    expect(out).to.be.lt(ethers.parseEther("10")); // 0.25% fee + slippage applied

    const pair = await ethers.getContractAt("HawkingPair", await factory.getPair(a, b));
    const lp = await pair.balanceOf(deployer.address);
    await pair.approve(routerAddr, ethers.MaxUint256);
    await router.removeLiquidity(a, b, lp, 0, 0, deployer.address, deadline);
    expect(await pair.balanceOf(deployer.address)).to.equal(0);
  });

  it("swapExactETHForTokens works through WETH", async function () {
    const a = await tokenA.getAddress();
    const routerAddr = await router.getAddress();
    await tokenA.approve(routerAddr, ethers.MaxUint256);
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 600;
    await router.addLiquidityETH(
      a, ethers.parseEther("1000"), 0, 0, deployer.address, deadline,
      { value: ethers.parseEther("10") }
    );
    await router.connect(user).swapExactETHForTokens(
      0, [await weth.getAddress(), a], user.address, deadline,
      { value: ethers.parseEther("0.1") }
    );
    expect(await tokenA.balanceOf(user.address)).to.be.gt(0);
  });
});
