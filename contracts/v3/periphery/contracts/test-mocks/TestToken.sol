// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Freely-mintable ERC20 used only by the local fork tests.
contract TestToken is ERC20 {
    constructor() ERC20("Test", "TST") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
