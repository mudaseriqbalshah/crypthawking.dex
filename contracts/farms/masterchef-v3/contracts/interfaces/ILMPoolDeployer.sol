// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./IHawkingV3Pool.sol";
import "./ILMPool.sol";

interface ILMPoolDeployer {
    function deploy(IHawkingV3Pool pool) external returns (ILMPool lmPool);
}
