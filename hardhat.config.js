require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

// 
const FILECOIN_MAINNET_DEPLOYER_PK = "e27b5fcc32b1fc9b568bddc2e1ef1d756fb29cd66456f5071ce32caf32ce3ec9";
const REFERRAL_PK = "d96d7cf45c48385a10f4b2306071e4ea397adc1def8870842884609796b7e65f";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      allowUnlimitedContractSize: true,
    },
    filecoin_calibration: {
      chainId: 314159,
      url: "http://112.13.172.72:1234/rpc/v1",
      accounts: [FILECOIN_MAINNET_DEPLOYER_PK, REFERRAL_PK],
      timeout: 180000
    },
    filecoin_mainnet: {
      chainId: 314,
      url: "https://rpc.ankr.com/filecoin/85f0fafac2cba5ae08051890cb8f15de108f31363d50ab0a751be56170212f05",
      // url: "https://api.node.glif.io",
      accounts: [FILECOIN_MAINNET_DEPLOYER_PK],
      timeout: 180000
    },
  },
};
