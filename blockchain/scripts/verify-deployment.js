import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonRpcProvider, ethers } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const deploymentPath = path.resolve(here, "../deployments/localhost.json");
const rpcUrl = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";

if (!fs.existsSync(deploymentPath)) {
  throw new Error("Deployment file not found. Run npm run deploy first.");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
if (!ethers.isAddress(deployment.contractAddress)) {
  throw new Error("Deployment file contains an invalid contract address.");
}

const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
const code = await provider.getCode(deployment.contractAddress);

console.log(`RPC: ${rpcUrl}`);
console.log(`Chain ID: ${network.chainId.toString()}`);
console.log(`Contract: ${deployment.contractAddress}`);
console.log(`Bytecode: ${code.slice(0, 18)}... (${code.length} chars)`);

if (Number(network.chainId) !== 31337) {
  throw new Error(`Wrong chain ID ${network.chainId}. Expected 31337.`);
}

if (code === "0x") {
  throw new Error(
    `No contract bytecode found at ${deployment.contractAddress}. ` +
      "The Hardhat node was likely restarted. Start it and run npm run deploy again."
  );
}

console.log("Deployment verification: OK");
