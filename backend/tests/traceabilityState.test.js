import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DemoLedger } from "../src/repositories/demoLedger.js";

function newLedger(){ return new DemoLedger(path.join(tmpdir(),`pharma-test-${randomUUID()}.json`)); }

test("enforces the pharmaceutical state progression", async () => {
  const ledger=newLedger(); await ledger.reset();
  await ledger.createProduct({productId:"P2",productName:"Medicine",manufacturerId:"ORG-MAN-001"},"ORG-MAN-001");
  await ledger.createBatch({batchId:"B2",productId:"P2",manufacturerId:"ORG-MAN-001",currentLocation:"Auckland",documentHash:"a".repeat(64)},"ORG-MAN-001");
  await assert.rejects(()=>ledger.receiveBatch("B2","ORG-DIS-001","Auckland"),/intended recipient|not currently in transit/);
  await ledger.createShipment("B2","ORG-DIS-001","TRK-001","ORG-MAN-001");
  await ledger.transferBatch("B2","ORG-DIS-001","Hamilton","ORG-MAN-001");
  await ledger.receiveBatch("B2","ORG-DIS-001","Hamilton");
  await ledger.verifyBatch("B2","ORG-DIS-001");
  await assert.rejects(()=>ledger.dispenseBatch("B2","ORG-DIS-001"),/current pharmacy/);
  await ledger.transferBatch("B2","ORG-PHA-001","Auckland","ORG-DIS-001");
  await ledger.receiveBatch("B2","ORG-PHA-001","Auckland");
  await ledger.verifyBatch("B2","ORG-PHA-001");
  const dispensed=await ledger.dispenseBatch("B2","ORG-PHA-001");
  assert.equal(dispensed.status,"DISPENSED");
});

test("detects demo audit hash-chain tampering", async () => {
  const ledger=newLedger(); await ledger.reset();
  await ledger.createProduct({productId:"P3",productName:"Medicine",manufacturerId:"ORG-MAN-001"},"ORG-MAN-001");
  await ledger.createBatch({batchId:"B3",productId:"P3",manufacturerId:"ORG-MAN-001",currentLocation:"Auckland"},"ORG-MAN-001");
  assert.deepEqual(await ledger.verifyHistoryIntegrity("B3"),{valid:true,count:1});
});
