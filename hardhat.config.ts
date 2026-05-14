import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

const chainId = parseInt(process.env.CHAIN_ID ?? "31337", 10);
const autoMine = process.env.AUTO_MINE !== "false";
const mineInterval = parseInt(process.env.MINE_INTERVAL ?? "0", 10);
const loggingEnabled = process.env.HARDHAT_NODE_LOGGING !== "false";

const gas = process.env.GAS ? parseInt(process.env.GAS, 10) : ("auto" as const);
const gasPrice = parseInt(process.env.GAS_PRICE ?? "0", 10);
const httpGasPrice = process.env.GAS_PRICE ? parseInt(process.env.GAS_PRICE, 10) : ("auto" as const);
const initialBaseFeePerGas = parseInt(process.env.INITIAL_BASE_FEE_PER_GAS ?? "0", 10);

const mining = {
  auto: autoMine,
  ...(mineInterval > 0 && { interval: mineInterval }),
} as const;

const accounts = {
  mnemonic: "test test test test test test test test test test test junk",
  count: 20,
  accountsBalance: "1000000000000000000000000",
} as const;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    default: {
      type: "edr-simulated",
      chainType: "l1",
      accounts,
      chainId,
      loggingEnabled,
      mining,
    },
    node: {
      type: "edr-simulated",
      chainType: "l1",
      accounts,
      chainId,
      loggingEnabled,
      gas,
      gasPrice,
      initialBaseFeePerGas,
      mining,
    },
    localnode: {
      type: "http",
      chainType: "l1",
      url: "http://localhost:8545",
      chainId,
      gas,
      gasPrice: httpGasPrice,
    },
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      accounts,
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      accounts,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
