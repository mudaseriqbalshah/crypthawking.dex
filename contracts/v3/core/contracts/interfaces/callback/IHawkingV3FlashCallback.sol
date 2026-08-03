// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title Callback for IHawkingV3PoolActions#flash
/// @notice Any contract that calls IHawkingV3PoolActions#flash must implement this interface
interface IHawkingV3FlashCallback {
    /// @notice Called to `msg.sender` after transferring to the recipient from IHawkingV3Pool#flash.
    /// @dev In the implementation you must repay the pool the tokens sent by flash plus the computed fee amounts.
    /// The caller of this method must be checked to be a HawkingV3Pool deployed by the canonical HawkingV3Factory.
    /// @param fee0 The fee amount in token0 due to the pool by the end of the flash
    /// @param fee1 The fee amount in token1 due to the pool by the end of the flash
    /// @param data Any data passed through by the caller via the IHawkingV3PoolActions#flash call
    function hawkingV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external;
}
