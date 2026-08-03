// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import './pool/IHawkingV3PoolImmutables.sol';
import './pool/IHawkingV3PoolState.sol';
import './pool/IHawkingV3PoolDerivedState.sol';
import './pool/IHawkingV3PoolActions.sol';
import './pool/IHawkingV3PoolOwnerActions.sol';
import './pool/IHawkingV3PoolEvents.sol';

/// @title The interface for a HawkingSwap V3 Pool
/// @notice A HawkingSwap pool facilitates swapping and automated market making between any two assets that strictly conform
/// to the ERC20 specification
/// @dev The pool interface is broken up into many smaller pieces
interface IHawkingV3Pool is
    IHawkingV3PoolImmutables,
    IHawkingV3PoolState,
    IHawkingV3PoolDerivedState,
    IHawkingV3PoolActions,
    IHawkingV3PoolOwnerActions,
    IHawkingV3PoolEvents
{

}
