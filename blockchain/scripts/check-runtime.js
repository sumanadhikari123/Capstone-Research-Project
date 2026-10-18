import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const deploymentPath = path.join(root, "deployments/localhost.json");
const rpcUrl = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";

if (!fs.existsSync(deploymentPath)) {
  throw new Error("No deployment file. Run the Hardhat node, compile, then npm run deploy.");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const provider = new ethers.JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();

if (Number(network.chainId) !== 31337) {
  throw new Error(`Wrong chain ID ${network.chainId}; expected 31337.`);
}

const code = await provider.getCode(deployment.contractAddress);
if (!code || code === "0x") {
  throw new Error(
    `STALE DEPLOYMENT: ${deployment.contractAddress} has no contract bytecode. ` +
    "The Hardhat node was probably restarted. Deploy again."
  );
}

console.log("Runtime check: OK");
console.log(`RPC: ${rpcUrl}`);
console.log(`Chain ID: ${network.chainId}`);
console.log(`Contract: ${deployment.contractAddress}`);
console.log(`Bytecode length: ${code.length} hex chars`);
