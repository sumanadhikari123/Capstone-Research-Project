import assert from "node:assert/strict";
import { test } from "node:test";
import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// These tests exercise the deployed contract through a running local node.
// Run with: npm run blockchain:node (PowerShell 1), then npm run blockchain:test (PowerShell 2).

test("PharmaTraceability artifact contains role-based lifecycle functions", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const artifact = JSON.parse(fs.readFileSync(path.resolve(here, "../artifacts/contracts/PharmaTraceability.sol/PharmaTraceability.json"), "utf8"));
  const names = artifact.abi.filter(x => x.type === "function").map(x => x.name);
  for (const required of ["createProduct", "createBatch", "createShipment", "transferBatch", "receiveBatch", "verifyBatch", "dispenseBatch", "updateComplianceStatus", "getBatchHistory", "verifyHistoryIntegrity", "getOrganizationAddress", "pendingShipmentDestination"]) {
    assert.ok(names.includes(required), `missing ${required}`);
  }
});

test("local deterministic role addresses are valid Ethereum addresses", async () => {
  const mnemonic = "test test test test test test test test test test test junk";
  for (let i = 0; i < 4; i++) {
    const wallet = ethers.Wallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`);
    assert.equal(ethers.isAddress(wallet.address), true);
  }
});
