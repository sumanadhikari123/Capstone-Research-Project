import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(fs.readFileSync(path.resolve(here, "../blockchain/deployments/localhost.json"), "utf8"));
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545");
const contract = new ethers.Contract(deployment.contractAddress, deployment.abi, provider);
const batchId = process.argv[2];
if (!batchId) throw new Error("Usage: node experiments/ethereum_integrity_test.js BATCH-001");
const result = await contract.verifyHistoryIntegrity(batchId);
console.log(JSON.stringify({ batchId, valid: result[0], finalHash: result[1], contractAddress: deployment.contractAddress }, null, 2));
