require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config({ path: "../../../.env" });

// Mirrors upstream v3-lm-pool settings (solc 0.7.6, optimizer default-off).
module.exports = {
  solidity: { compilers: [{ version: "0.7.6" }] },
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
