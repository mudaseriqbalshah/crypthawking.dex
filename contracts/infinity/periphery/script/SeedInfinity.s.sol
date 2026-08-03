// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import {IVault} from "infinity-core/src/interfaces/IVault.sol";
import {ICLPoolManager} from "infinity-core/src/pool-cl/interfaces/ICLPoolManager.sol";
import {IHooks} from "infinity-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "infinity-core/src/interfaces/IPoolManager.sol";
import {Currency} from "infinity-core/src/types/Currency.sol";
import {PoolKey} from "infinity-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "infinity-core/src/types/PoolId.sol";
import {CLPoolParametersHelper} from "infinity-core/src/pool-cl/libraries/CLPoolParametersHelper.sol";
import {CLPositionManager} from "../src/pool-cl/CLPositionManager.sol";
import {CLQuoter} from "../src/pool-cl/lens/CLQuoter.sol";
import {IQuoter} from "../src/interfaces/IQuoter.sol";
import {Planner, Plan} from "../src/libraries/Planner.sol";
import {Actions} from "../src/libraries/Actions.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

interface IERC20Like {
    function approve(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
    function mint(address, uint256) external;
}

/// @notice Initializes the first Infinity CL pool (tUSDC/tUSDT, 0.01%, tickSpacing 1),
/// mints full-range liquidity through CLPositionManager (Permit2 flow), then
/// static-quotes a swap through CLQuoter to prove pool math end-to-end.
/// Idempotent: skips init if the pool already has a price, skips mint if it has liquidity.
contract SeedInfinity is Script {
    using PoolIdLibrary for PoolKey;
    using CLPoolParametersHelper for bytes32;
    using Planner for Plan;

    // registry addresses (packages/deployments/base-sepolia.json)
    address constant TUSDC = 0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2;
    address constant TUSDT = 0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988;
    address constant VAULT = 0xe0785d1F460C89e6665645f7188E5E3C9E42c6b8;
    address constant CL_PM = 0xA50a8A0867d7ACc239D71e6CBb0072F9c49aC87B;
    address constant POSM = 0x4Ac28f614D735FD5c664DDbB51C9FDEc47992828;
    address constant QUOTER = 0x8346DCbAa103Ea12c413469A7bb88d6571F7e7E9;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    uint160 constant SQRT_PRICE_1 = 79228162514264337593543950336; // 2^96
    int24 constant TICK_LOWER = -887272;
    int24 constant TICK_UPPER = 887272;
    uint128 constant LIQUIDITY = 2000e6;

    function run() external {
        // key comes from --private-key on the CLI (tolerates missing 0x prefix)

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(TUSDC),
            currency1: Currency.wrap(TUSDT),
            hooks: IHooks(address(0)),
            poolManager: IPoolManager(CL_PM),
            fee: 100, // 0.01%
            parameters: bytes32(0).setTickSpacing(1)
        });

        vm.startBroadcast();
        address me = msg.sender;

        (uint160 sqrtPriceX96,,,) = ICLPoolManager(CL_PM).getSlot0(key.toId());
        if (sqrtPriceX96 == 0) {
            ICLPoolManager(CL_PM).initialize(key, SQRT_PRICE_1);
            console.log("pool initialized at price 1");
        } else {
            console.log("pool already initialized (skip)");
        }

        uint128 poolLiq = ICLPoolManager(CL_PM).getLiquidity(key.toId());
        if (poolLiq == 0) {
            // Permit2 two-step approvals for both tokens
            for (uint256 i; i < 2; i++) {
                address token = i == 0 ? TUSDC : TUSDT;
                if (IERC20Like(token).balanceOf(me) < 3000e6) {
                    IERC20Like(token).mint(me, 3000e6); // deployer owns the test tokens
                }
                IERC20Like(token).approve(PERMIT2, type(uint256).max);
                IAllowanceTransfer(PERMIT2).approve(token, POSM, type(uint160).max, type(uint48).max);
            }
            Plan memory plan = Planner.init();
            plan.add(
                Actions.CL_MINT_POSITION,
                abi.encode(key, TICK_LOWER, TICK_UPPER, LIQUIDITY, 3000e6, 3000e6, me, bytes(""))
            );
            bytes memory payload = plan.finalizeModifyLiquidityWithClose(key);
            CLPositionManager(payable(POSM)).modifyLiquidities(payload, block.timestamp + 1200);
            console.log("minted full-range liquidity", LIQUIDITY);
        } else {
            console.log("pool already has liquidity (skip)");
        }

        vm.stopBroadcast();

        // static quote (off-chain call, not broadcast) proves swap math
        (uint256 amountOut, uint256 gasEstimate) = CLQuoter(QUOTER).quoteExactInputSingle(
            IQuoter.QuoteExactSingleParams({
                poolKey: key,
                zeroForOne: true,
                exactAmount: 10e6,
                hookData: bytes("")
            })
        );
        console.log("quote: 10 tUSDC ->", amountOut, "raw tUSDT (gas est", gasEstimate);
        require(amountOut > 9_900_000 && amountOut < 10_000_000, "quote out of expected band");
    }
}
