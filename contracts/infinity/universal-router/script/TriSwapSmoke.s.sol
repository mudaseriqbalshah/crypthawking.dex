// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import {UniversalRouter} from "../src/UniversalRouter.sol";
import {Commands} from "../src/libraries/Commands.sol";
import {IHooks} from "infinity-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "infinity-core/src/interfaces/IPoolManager.sol";
import {Currency} from "infinity-core/src/types/Currency.sol";
import {PoolKey} from "infinity-core/src/types/PoolKey.sol";
import {CLPoolParametersHelper} from "infinity-core/src/pool-cl/libraries/CLPoolParametersHelper.sol";
import {ActionConstants} from "infinity-periphery/src/libraries/ActionConstants.sol";
import {Planner, Plan} from "infinity-periphery/src/libraries/Planner.sol";
import {Actions} from "infinity-periphery/src/libraries/Actions.sol";
import {ICLRouterBase} from "infinity-periphery/src/pool-cl/interfaces/ICLRouterBase.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

interface IERC20View {
    function balanceOf(address) external view returns (uint256);
}

/// @notice Live smoke test: swaps tUSDC -> tUSDT through v2, v3, and Infinity CL —
/// all through the single UniversalRouter. A success also end-to-end-validates the
/// v2/v3 init code hashes baked into the router's immutables (wrong hash = wrong
/// computed pair/pool address = revert).
contract TriSwapSmoke is Script {
    using CLPoolParametersHelper for bytes32;
    using Planner for Plan;

    address constant TUSDC = 0x582800AFC82bA6c8c8b9ce3Be0416E913f7E59c2;
    address constant TUSDT = 0x85323e2368865E6dcfFC8dEf64016A5Eafe8D988;
    address constant UR = 0x0180e61b23201479111D7595c7084Ce1D50f88d4;
    address constant CL_PM = 0xA50a8A0867d7ACc239D71e6CBb0072F9c49aC87B;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    uint128 constant AMT = 5e6; // 5 tUSDC per protocol

    function run() external {
        vm.startBroadcast();
        address me = msg.sender;
        UniversalRouter router = UniversalRouter(payable(UR));

        IAllowanceTransfer(PERMIT2).approve(TUSDC, UR, type(uint160).max, type(uint48).max);
        uint256 start = IERC20View(TUSDT).balanceOf(me);

        // 1) v2
        {
            address[] memory path = new address[](2);
            path[0] = TUSDC;
            path[1] = TUSDT;
            bytes[] memory inputs = new bytes[](1);
            inputs[0] = abi.encode(ActionConstants.MSG_SENDER, AMT, 0, path, true);
            router.execute(abi.encodePacked(bytes1(uint8(Commands.V2_SWAP_EXACT_IN))), inputs);
            console.log("v2 swap ok");
        }
        // 2) v3 (fee tier 100)
        {
            bytes[] memory inputs = new bytes[](1);
            inputs[0] = abi.encode(
                ActionConstants.MSG_SENDER, AMT, 0, abi.encodePacked(TUSDC, uint24(100), TUSDT), true
            );
            router.execute(abi.encodePacked(bytes1(uint8(Commands.V3_SWAP_EXACT_IN))), inputs);
            console.log("v3 swap ok");
        }
        // 3) infinity CL (fee 100, tickSpacing 1)
        {
            PoolKey memory key = PoolKey({
                currency0: Currency.wrap(TUSDC),
                currency1: Currency.wrap(TUSDT),
                hooks: IHooks(address(0)),
                poolManager: IPoolManager(CL_PM),
                fee: 100,
                parameters: bytes32(0).setTickSpacing(1)
            });
            Plan memory plan = Planner.init().add(
                Actions.CL_SWAP_EXACT_IN_SINGLE,
                abi.encode(ICLRouterBase.CLSwapExactInputSingleParams(key, true, AMT, 0, bytes("")))
            );
            bytes memory data = plan.finalizeSwap(key.currency0, key.currency1, ActionConstants.MSG_SENDER);
            bytes[] memory inputs = new bytes[](1);
            inputs[0] = data;
            router.execute(abi.encodePacked(bytes1(uint8(Commands.INFI_SWAP))), inputs);
            console.log("infinity swap ok");
        }

        vm.stopBroadcast();
        console.log("total tUSDT received (sim):", IERC20View(TUSDT).balanceOf(me) - start);
    }
}
