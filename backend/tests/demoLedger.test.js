import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DemoLedger } from "../src/repositories/demoLedger.js";

function newLedger(){ return new DemoLedger(path.join(tmpdir(),`pharma-test-${randomUUID()}.json`)); }

test("creates product, shipment, batch and records traceability history", async () => {
  const ledger = newLedger(); await ledger.reset();
  await ledger.createProduct({productId:"P-TEST",productName:"Test Product",manufacturerId:"ORG-MAN-001"},"ORG-MAN-001");
  const batch=await ledger.createBatch({batchId:"B-TEST",productId:"P-TEST",manufacturerId:"ORG-MAN-001",currentLocation:"Auckland",documentHash:"a".repeat(64)},"ORG-MAN-001");
  assert.equal(batch.status,"MANUFACTURED");
  await ledger.createShipment("B-TEST","ORG-DIS-001","TRK-TEST","ORG-MAN-001");
  await ledger.transferBatch("B-TEST","ORG-DIS-001","Hamilton","ORG-MAN-001");
  const received=await ledger.receiveBatch("B-TEST","ORG-DIS-001","Hamilton");
  assert.equal(received.status,"RECEIVED");
  const verified=await ledger.verifyBatch("B-TEST","ORG-DIS-001");
  assert.equal(verified.verificationStatus,"VERIFIED");
  assert.equal((await ledger.history("B-TEST")).length,5);
});
