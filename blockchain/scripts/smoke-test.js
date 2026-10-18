import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ethers } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const artifact = JSON.parse(
  fs.readFileSync(path.join(root, "artifacts/contracts/PharmaTraceability.sol/PharmaTraceability.json"), "utf8")
);
const deployment = JSON.parse(
  fs.readFileSync(path.join(root, "deployments/localhost.json"), "utf8")
);
const rpcUrl = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const mnemonic = process.env.ETHEREUM_MNEMONIC ||
  "test test test test test test test test test test test junk";

const provider = new ethers.JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
assert.equal(Number(network.chainId), 31337, "Expected Hardhat chain 31337");
const code = await provider.getCode(deployment.contractAddress);
assert.notEqual(code, "0x", "Deployment is stale or missing contract bytecode");

const wallet = (index) =>
  ethers.Wallet.fromPhrase(mnemonic, provider, `m/44'/60'/0'/0/${index}`);

const manufacturer = wallet(0);
const distributor = wallet(1);
const pharmacy = wallet(2);
const regulator = wallet(3);
const contract = new ethers.Contract(deployment.contractAddress, artifact.abi, manufacturer);
const asDistributor = contract.connect(distributor);
const asPharmacy = contract.connect(pharmacy);
const asRegulator = contract.connect(regulator);

const unique = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const productId = `MED-${unique}`;
const batchId = `BATCH-${unique}`;
const documentHash = crypto.createHash("sha256").update(`smoke-${unique}`).digest("hex");

async function tx(promise) {
  const t = await promise;
  return t.wait();
}

console.log(`Smoke test product: ${productId}`);
await tx(contract.createProduct(productId, "Smoke Test Medicine", "ORG-MAN-001", "Automated integration test"));
await tx(contract.createBatch(
  batchId,
  productId,
  "ORG-MAN-001",
  "Auckland Manufacturing Site",
  new Date().toISOString(),
  "2027-12-31",
  documentHash
));

let batch = await contract.readBatch(batchId);
assert.equal(batch.status, 1n, "New batch should be MANUFACTURED");
assert.equal(batch.currentOwner, "ORG-MAN-001");
assert.equal(batch.documentHash, documentHash);

await assert.rejects(() => contract.transferBatch(batchId, "ORG-DIS-001", "Auckland DC"));

await tx(contract.createShipment(batchId, "ORG-DIS-001", `TRACK-${unique}`));
await tx(contract.transferBatch(batchId, "ORG-DIS-001", "Auckland Distribution Centre"));

batch = await asDistributor.readBatch(batchId);
assert.equal(batch.status, 2n, "Transferred batch should be IN_TRANSIT");
assert.equal(batch.currentOwner, "ORG-DIS-001");

await assert.rejects(() => asPharmacy.receiveBatch(batchId, "Auckland Pharmacy"));

await tx(asDistributor.receiveBatch(batchId, "Auckland Distribution Centre"));
batch = await asDistributor.readBatch(batchId);
assert.equal(batch.status, 3n, "Received batch should be RECEIVED");

await tx(asDistributor.verifyBatch(batchId));
batch = await asDistributor.readBatch(batchId);
assert.equal(batch.verificationStatus, 1n, "Batch should be VERIFIED");

await tx(asDistributor.createShipment(batchId, "ORG-PHA-001", `TRACK-PHA-${unique}`));
await tx(asDistributor.transferBatch(batchId, "ORG-PHA-001", "Auckland Community Pharmacy"));
await tx(asPharmacy.receiveBatch(batchId, "Auckland Pharmacy"));
await tx(asPharmacy.verifyBatch(batchId));

await tx(asRegulator.updateComplianceStatus(batchId, "NON_COMPLIANT", "Smoke-test rejection path"));
batch = await asRegulator.readBatch(batchId);
assert.equal(batch.complianceStatus, "NON_COMPLIANT");
assert.equal(batch.verificationStatus, 0n, "Compliance change should require re-verification");
await assert.rejects(() => asPharmacy.verifyBatch(batchId));

await tx(asRegulator.updateComplianceStatus(batchId, "COMPLIANT", "Smoke-test regulatory decision"));
batch = await asRegulator.readBatch(batchId);
assert.equal(batch.complianceStatus, "COMPLIANT");
assert.equal(batch.verificationStatus, 0n, "Compliance decision should require re-verification");
await tx(asPharmacy.verifyBatch(batchId));
await tx(asPharmacy.dispenseBatch(batchId));

batch = await asPharmacy.readBatch(batchId);
assert.equal(batch.status, 4n, "Final batch should be DISPENSED");

const [valid, finalHash] = await asRegulator.verifyHistoryIntegrity(batchId);
assert.equal(valid, true, "History integrity check should pass");
assert.notEqual(finalHash, ethers.ZeroHash, "History should contain events");

const history = await asRegulator.getBatchHistory(batchId);
assert.ok(history.length >= 8, "Lifecycle should create a substantial audit trail");

console.log("SMOKE TEST: PASS");
console.log(JSON.stringify({ productId, batchId, historyEvents: history.length, finalHash }, null, 2));
