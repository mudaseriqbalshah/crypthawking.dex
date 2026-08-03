// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.26;

interface IMintable {
    function mint(address to, uint256 amount) external;
}

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @notice Testnet faucet dispensing valueless CryptoHawking test tokens with a
/// per-address cooldown. Mint-mode drips mint directly (faucet must be a minter
/// on the token); Transfer-mode drips send from the faucet's own balance and are
/// skipped silently when the balance runs dry (HAWK uses this — its mint stays
/// owner-only for MasterChef).
contract Faucet {
    enum Mode {
        Mint,
        Transfer
    }

    struct Drip {
        address token;
        uint256 amount;
        Mode mode;
    }

    address public owner;
    uint256 public cooldown;
    Drip[] public drips;
    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed account);
    event DripSet(address indexed token, uint256 amount, Mode mode);
    event CooldownSet(uint256 cooldown);

    modifier onlyOwner() {
        require(msg.sender == owner, "Faucet: not owner");
        _;
    }

    constructor(uint256 _cooldown) {
        owner = msg.sender;
        cooldown = _cooldown;
    }

    function dripCount() external view returns (uint256) {
        return drips.length;
    }

    function setCooldown(uint256 _cooldown) external onlyOwner {
        cooldown = _cooldown;
        emit CooldownSet(_cooldown);
    }

    /// @dev Adds or updates the drip entry for `token`. Idempotent.
    function setDrip(address token, uint256 amount, Mode mode) external onlyOwner {
        for (uint256 i; i < drips.length; i++) {
            if (drips[i].token == token) {
                drips[i] = Drip(token, amount, mode);
                emit DripSet(token, amount, mode);
                return;
            }
        }
        drips.push(Drip(token, amount, mode));
        emit DripSet(token, amount, mode);
    }

    function claim() external {
        uint256 last = lastClaim[msg.sender];
        require(last == 0 || block.timestamp >= last + cooldown, "Faucet: cooldown");
        lastClaim[msg.sender] = block.timestamp;
        for (uint256 i; i < drips.length; i++) {
            Drip memory d = drips[i];
            if (d.mode == Mode.Mint) {
                IMintable(d.token).mint(msg.sender, d.amount);
            } else if (IERC20Minimal(d.token).balanceOf(address(this)) >= d.amount) {
                IERC20Minimal(d.token).transfer(msg.sender, d.amount);
            }
        }
        emit Claimed(msg.sender);
    }
}
