import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const chainId = parseInt(process.env.CHAIN_ID ?? "31337", 10);
const autoMine = process.env.AUTO_MINE !== "false";
const mineInterval = parseInt(process.env.MINE_INTERVAL ?? "0", 10);
const loggingEnabled = process.env.HARDHAT_NODE_LOGGING !== "false";

// Default zero fees; override with GAS, GAS_PRICE, INITIAL_BASE_FEE_PER_GAS
const gas = process.env.GAS ? parseInt(process.env.GAS, 10) : ("auto" as const);
const gasPrice = parseInt(process.env.GAS_PRICE ?? "0", 10);
const initialBaseFeePerGas = parseInt(process.env.INITIAL_BASE_FEE_PER_GAS ?? "0", 10);

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.34",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
      chainId,
      loggingEnabled,
      mining: {
        auto: autoMine,
        ...(mineInterval > 0 && { interval: mineInterval }),
      },
    },
    node: {
      type: "edr-simulated",
      chainType: "l1",
      chainId,
      loggingEnabled,
      gas,
      gasPrice,
      initialBaseFeePerGas,
      mining: {
        auto: autoMine,
        ...(mineInterval > 0 && { interval: mineInterval }),
      },
    },
    localnode: {
      type: "http",
      url: "http://localhost:8545",
      chainId,
      gas,
      gasPrice,
    },
  },
});
