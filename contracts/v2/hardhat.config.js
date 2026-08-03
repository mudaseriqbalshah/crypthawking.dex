require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "../../.env" });

// Compiler settings mirror upstream exchange-protocol (optimizer 99999 runs).
// Changing ANY setting that touches HawkingPair bytecode requires re-running
// scripts/print-init-hash.js and patching libraries/HawkingLibrary.sol.
module.exports = {
  solidity: {
    compilers: [
      { version: "0.5.16", settings: { optimizer: { enabled: true, runs: 99999 } } },
      { version: "0.6.6", settings: { optimizer: { enabled: true, runs: 99999 } } },
      { version: "0.8.4", settings: { optimizer: { enabled: true, runs: 99999 } } },
      { version: "0.4.18", settings: { optimizer: { enabled: true, runs: 99999 } } },
    ],
  },
  networks: {
    baseSepolia: {
      url: process.env.RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  // With ETHERSCAN_API_KEY set, verification goes to Basescan (Etherscan v2 API);
  // without it, falls back to keyless Blockscout.
  etherscan: {
    apiKey: { baseSepolia: process.env.ETHERSCAN_API_KEY || "blockscout" },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: process.env.ETHERSCAN_API_KEY
          ? {
              apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
              browserURL: "https://sepolia.basescan.org",
            }
          : {
              apiURL: "https://base-sepolia.blockscout.com/api",
              browserURL: "https://base-sepolia.blockscout.com",
            },
      },
    ],
  },
  sourcify: { enabled: false },
};
