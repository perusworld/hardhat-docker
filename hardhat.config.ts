import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: parseInt(process.env.CHAIN_ID || '31337'),
      mining: {
        auto: "true" === (process.env.AUTO_MINE || 'true'),
        interval: parseInt(process.env.MINE_INTERVAL || '0'),
      }
    }
  }
};

export default config;
