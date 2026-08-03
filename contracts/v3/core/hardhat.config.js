require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "../../../.env" });

// Mirrors upstream v3-core settings exactly (istanbul, metadata bytecodeHash none).
// HawkingV3Pool/PoolDeployer at 400 runs, everything else 1,000,000.
// ANY change affecting HawkingV3Pool bytecode requires re-running
// scripts/print-init-hash.js and patching periphery PoolAddress.sol.
const DEFAULT = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: { enabled: true, runs: 1_000_000 },
    metadata: { bytecodeHash: "none" },
  },
};
const LOWEST = {
  version: "0.7.6",
  settings: {
    evmVersion: "istanbul",
    optimizer: { enabled: true, runs: 400 },
    metadata: { bytecodeHash: "none" },
  },
};

module.exports = {
  solidity: {
    compilers: [DEFAULT],
    overrides: {
      "contracts/HawkingV3Pool.sol": LOWEST,
      "contracts/HawkingV3PoolDeployer.sol": LOWEST,
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
