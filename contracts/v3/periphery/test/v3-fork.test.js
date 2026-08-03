// v3 fork-integrity tests. The critical property: pools deployed by
// HawkingV3PoolDeployer land at the CREATE2 address that PoolAddress.sol
// predicts with the patched POOL_INIT_CODE_HASH. NPM mint and SwapRouter swaps
// go through CallbackValidation (which uses PoolAddress), so a stale hash makes
// them revert.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const path = require("path");

const POOL_INIT_CODE_HASH = "0x2c9f5653989ede03d6a329c69ee5e31f7587fdbf4cb8a0209028a9f095033da5";
const coreArtifact = (name) =>
  require(path.join(__dirname, `../../core/artifacts/contracts/${name}.sol/${name}.json`));

describe("CryptoHawking v3 fork", function () {
  let deployer, poolDeployer, factory, npm, router, t0, t1, weth;
  const FEE = 2500; // 0.25%, tickSpacing 50

  before(async function () {
    [deployer] = await ethers.getSigners();

    const PoolDeployer = await ethers.getContractFactoryFromArtifact(coreArtifact("HawkingV3PoolDeployer"));
    poolDeployer = await PoolDeployer.deploy();
    const Factory = await ethers.getContractFactoryFromArtifact(coreArtifact("HawkingV3Factory"));
    factory = await Factory.deploy(await poolDeployer.getAddress());
    await poolDeployer.setFactoryAddress(await factory.getAddress());

    const Token = await ethers.getContractFactory("TestToken");
    const a = await Token.deploy();
    const b = await Token.deploy();
    weth = await Token.deploy(); // placeholder; no ETH paths in these tests
    [t0, t1] = (await a.getAddress()).toLowerCase() < (await b.getAddress()).toLowerCase() ? [a, b] : [b, a];

    router = await (
      await ethers.getContractFactory("SwapRouter")
    ).deploy(await poolDeployer.getAddress(), await factory.getAddress(), await weth.getAddress());
    npm = await (
      await ethers.getContractFactory("NonfungiblePositionManager")
    ).deploy(await poolDeployer.getAddress(), await factory.getAddress(), await weth.getAddress(), ethers.ZeroAddress);

    for (const t of [t0, t1]) {
      await t.mint(deployer.address, ethers.parseEther("1000000"));
      await t.approve(await npm.getAddress(), ethers.MaxUint256);
      await t.approve(await router.getAddress(), ethers.MaxUint256);
    }
  });

  it("core artifact hash matches the PoolAddress patch", async function () {
    expect(ethers.keccak256(coreArtifact("HawkingV3Pool").bytecode)).to.equal(POOL_INIT_CODE_HASH);
  });

  it("pool is created at the CREATE2 address PoolAddress predicts", async function () {
    const sqrtPrice1 = 2n ** 96n; // price = 1
    await npm.createAndInitializePoolIfNecessary(
      await t0.getAddress(), await t1.getAddress(), FEE, sqrtPrice1
    );
    const actual = await factory.getPool(await t0.getAddress(), await t1.getAddress(), FEE);
    const salt = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "address", "uint24"],
        [await t0.getAddress(), await t1.getAddress(), FEE]
      )
    );
    const predicted = ethers.getCreate2Address(await poolDeployer.getAddress(), salt, POOL_INIT_CODE_HASH);
    expect(actual).to.equal(predicted);
  });

  it("NPM mints a position (callback validation exercises the hash)", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 600;
    await npm.mint({
      token0: await t0.getAddress(),
      token1: await t1.getAddress(),
      fee: FEE,
      tickLower: -50000,
      tickUpper: 50000,
      amount0Desired: ethers.parseEther("10000"),
      amount1Desired: ethers.parseEther("10000"),
      amount0Min: 0,
      amount1Min: 0,
      recipient: deployer.address,
      deadline,
    });
    expect(await npm.balanceOf(deployer.address)).to.equal(1n);
    const pos = await npm.positions(1);
    expect(pos.liquidity).to.be.gt(0n);
  });

  it("SwapRouter exactInputSingle swaps through the pool", async function () {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 600;
    const before = await t1.balanceOf(deployer.address);
    await router.exactInputSingle({
      tokenIn: await t0.getAddress(),
      tokenOut: await t1.getAddress(),
      fee: FEE,
      recipient: deployer.address,
      deadline,
      amountIn: ethers.parseEther("100"),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const got = (await t1.balanceOf(deployer.address)) - before;
    expect(got).to.be.gt(ethers.parseEther("98")); // 0.25% fee + ~1% impact at this depth
    expect(got).to.be.lt(ethers.parseEther("100"));
  });
});
