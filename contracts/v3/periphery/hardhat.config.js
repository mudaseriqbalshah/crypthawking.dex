require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "../../../.env" });

// Mirrors upstream v3-periphery settings (istanbul, metadata bytecodeHash none).
const settings = (runs) => ({
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: { enabled: true, runs },
    metadata: { bytecodeHash: "none" },
  },
});

module.exports = {
  solidity: {
    compilers: [settings(1_000_000)],
    overrides: {
      // Core sources imported into this package MUST compile with core's own
      // settings (400 runs) so HawkingV3Pool bytecode — and thus the CREATE2
      // POOL_INIT_CODE_HASH — stays identical to the core package artifact.
      "@cryptohawking/v3-core/contracts/HawkingV3Pool.sol": settings(400),
      "@cryptohawking/v3-core/contracts/HawkingV3PoolDeployer.sol": settings(400),
      "contracts/NonfungiblePositionManager.sol": settings(2_000),
      "contracts/NFTDescriptorEx.sol": settings(1_000),
      "contracts/NonfungibleTokenPositionDescriptor.sol": settings(1_000),
      "contracts/libraries/NFTDescriptor.sol": settings(1_000),
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: { baseSepolia: process.env.ETHERSCAN_API_KEY || "blockscout" },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: process.env.ETHERSCAN_API_KEY
          ? { apiURL: "https://api.etherscan.io/v2/api?chainid=84532", browserURL: "https://sepolia.basescan.org" }
          : { apiURL: "https://base-sepolia.blockscout.com/api", browserURL: "https://base-sepolia.blockscout.com" },
      },
    ],
  },
  sourcify: { enabled: false },
};
