// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {TestERC20} from "../src/TestERC20.sol";
import {Faucet} from "../src/Faucet.sol";

// HawkToken is solc 0.6.12, so tests interact through an interface + deployCode.
interface IHawk {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function owner() external view returns (address);
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function delegate(address delegatee) external;
    function getCurrentVotes(address account) external view returns (uint256);
}

contract TokensTest is Test {
    TestERC20 usdc;
    Faucet faucet;
    IHawk hawk;
    address alice = makeAddr("alice");

    function setUp() public {
        usdc = new TestERC20("Test USD Coin", "tUSDC", 6);
        faucet = new Faucet(1 days);
        hawk = IHawk(deployCode("HawkToken.sol:HawkToken"));
    }

    function test_hawkMetadata() public view {
        assertEq(hawk.name(), "Crypto Hawking Token");
        assertEq(hawk.symbol(), "HAWK");
        assertEq(hawk.decimals(), 18);
        assertEq(hawk.owner(), address(this));
    }

    function test_hawkMintOnlyOwner() public {
        hawk.mint(alice, 100e18);
        assertEq(hawk.balanceOf(alice), 100e18);
        vm.prank(alice);
        vm.expectRevert("Ownable: caller is not the owner");
        hawk.mint(alice, 1);
    }

    function test_hawkGovernanceDelegation() public {
        hawk.mint(alice, 100e18);
        vm.prank(alice);
        hawk.delegate(alice);
        assertEq(hawk.getCurrentVotes(alice), 100e18);
    }

    function test_testTokenMetadataAndMinterGating() public {
        assertEq(usdc.decimals(), 6);
        vm.prank(alice);
        vm.expectRevert("TestERC20: not minter");
        usdc.mint(alice, 1);
        usdc.setMinter(alice, true);
        vm.prank(alice);
        usdc.mint(alice, 5e6);
        assertEq(usdc.balanceOf(alice), 5e6);
    }

    function test_faucetClaimMintAndTransferModes() public {
        usdc.setMinter(address(faucet), true);
        faucet.setDrip(address(usdc), 1000e6, Faucet.Mode.Mint);
        // HAWK drips from faucet balance (transfer mode), mint stays owner-only.
        hawk.mint(address(faucet), 500e18);
        faucet.setDrip(address(hawk), 100e18, Faucet.Mode.Transfer);

        vm.prank(alice);
        faucet.claim();
        assertEq(usdc.balanceOf(alice), 1000e6);
        assertEq(hawk.balanceOf(alice), 100e18);
    }

    function test_faucetCooldown() public {
        usdc.setMinter(address(faucet), true);
        faucet.setDrip(address(usdc), 1000e6, Faucet.Mode.Mint);
        vm.startPrank(alice);
        faucet.claim();
        vm.expectRevert("Faucet: cooldown");
        faucet.claim();
        vm.stopPrank();
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        faucet.claim();
        assertEq(usdc.balanceOf(alice), 2000e6);
    }

    function test_faucetTransferModeSkipsWhenDry() public {
        faucet.setDrip(address(hawk), 100e18, Faucet.Mode.Transfer);
        vm.prank(alice);
        faucet.claim(); // must not revert with zero faucet balance
        assertEq(hawk.balanceOf(alice), 0);
    }

    function test_faucetSetDripIdempotent() public {
        faucet.setDrip(address(usdc), 1000e6, Faucet.Mode.Mint);
        faucet.setDrip(address(usdc), 2000e6, Faucet.Mode.Mint);
        assertEq(faucet.dripCount(), 1);
        (, uint256 amount,) = faucet.drips(0);
        assertEq(amount, 2000e6);
    }
}
