import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

const LOCAL_MNEMONIC = "test test test test test test test test test test test junk";

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
      accounts: {
        mnemonic: LOCAL_MNEMONIC,
        count: 20,
        initialBalance: "1000000000000000000000"
      }
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545"
    }
  }
});
