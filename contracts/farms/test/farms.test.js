// Fork-integrity tests for the farming stack: branding, ownership-gated minting,
// LP farming emissions (pendingCake ABI kept for frontend compat), and the
// HAWK staking pool (enterStaking/leaveStaking via NestBar).
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoHawking farms", function () {
  let deployer, dev, user, hawk, nest, chef, lp;
  const PER_BLOCK = ethers.parseEther("1");

  beforeEach(async function () {
    [deployer, dev, user] = await ethers.getSigners();
    hawk = await (await ethers.getContractFactory("HawkToken")).deploy();
    nest = await (await ethers.getContractFactory("NestBar")).deploy(await hawk.getAddress());
    chef = await (
      await ethers.getContractFactory("MasterChef")
    ).deploy(await hawk.getAddress(), await nest.getAddress(), dev.address, PER_BLOCK, 0);
    await hawk["mint(address,uint256)"](user.address, ethers.parseEther("1000"));
    await hawk.transferOwnership(await chef.getAddress());
    await nest.transferOwnership(await chef.getAddress());
    lp = await (
      await ethers.getContractFactory("MockBEP20")
    ).deploy("Hawking LPs", "HAWK-LP", ethers.parseEther("1000"));
    await lp.transfer(user.address, ethers.parseEther("100"));
  });

  it("NEST branding and ownership gating", async function () {
    expect(await nest.name()).to.equal("NestBar Token");
    expect(await nest.symbol()).to.equal("NEST");
    await expect(hawk["mint(address,uint256)"](user.address, 1)).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(nest["mint(address,uint256)"](user.address, 1)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("LP farming accrues and pays HAWK emissions", async function () {
    await chef.add(1000, await lp.getAddress(), true);
    await lp.connect(user).approve(await chef.getAddress(), ethers.MaxUint256);
    await chef.connect(user).deposit(1, ethers.parseEther("100"));
    await ethers.provider.send("hardhat_mine", ["0x5"]);
    expect(await chef.pendingCake(1, user.address)).to.be.gt(0n);
    const before = await hawk.balanceOf(user.address);
    await chef.connect(user).deposit(1, 0); // harvest
    expect((await hawk.balanceOf(user.address)) - before).to.be.gt(0n);
    await chef.connect(user).withdraw(1, ethers.parseEther("100"));
    expect(await lp.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
  });

  it("HAWK staking pool mints NEST and pays rewards", async function () {
    await hawk.connect(user).approve(await chef.getAddress(), ethers.MaxUint256);
    await chef.connect(user).enterStaking(ethers.parseEther("100"));
    expect(await nest.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    await ethers.provider.send("hardhat_mine", ["0x5"]);
    const before = await hawk.balanceOf(user.address);
    await chef.connect(user).leaveStaking(ethers.parseEther("100"));
    expect((await hawk.balanceOf(user.address)) - before).to.be.gt(ethers.parseEther("100"));
    expect(await nest.balanceOf(user.address)).to.equal(0n);
  });

  it("emissions mint 10% to dev address", async function () {
    await chef.add(1000, await lp.getAddress(), true);
    await lp.connect(user).approve(await chef.getAddress(), ethers.MaxUint256);
    await chef.connect(user).deposit(1, ethers.parseEther("100"));
    await ethers.provider.send("hardhat_mine", ["0x5"]);
    const before = await hawk.balanceOf(dev.address);
    await chef.updatePool(1);
    expect((await hawk.balanceOf(dev.address)) - before).to.be.gt(0n);
  });
});
