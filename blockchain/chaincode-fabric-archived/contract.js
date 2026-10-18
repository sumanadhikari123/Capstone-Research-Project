"use strict";

const { Contract } = require("fabric-contract-api");
const crypto = require("crypto");

function eventId() {
  return `EVT-${crypto.randomBytes(6).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function actorOrg(ctx) {
  const msp = ctx.clientIdentity.getMSPID();
  const map = {
    ManufacturerMSP: "ORG-MAN-001",
    DistributorMSP: "ORG-DIS-001",
    PharmacyMSP: "ORG-PHA-001",
    RegulatorMSP: "ORG-REG-001"
  };
  return map[msp] || null;
}

function requireRole(ctx, expectedMsps) {
  const msp = ctx.clientIdentity.getMSPID();
  if (!expectedMsps.includes(msp)) {
    throw new Error(`Operation not permitted for ${msp}`);
  }
  return msp;
}

async function readBatch(ctx, batchId) {
  const data = await ctx.stub.getState(`BATCH_${batchId}`);
  if (!data || !data.length) throw new Error("Batch not found");
  return JSON.parse(data.toString());
}

async function writeBatch(ctx, batch) {
  await ctx.stub.putState(`BATCH_${batch.batchId}`, Buffer.from(JSON.stringify(batch)));
}

class PharmaTraceabilityContract extends Contract {
  async InitLedger() {
    return { initialized: true, timestamp: now() };
  }

  async CreateProduct(ctx, productJson) {
    requireRole(ctx, ["ManufacturerMSP"]);
    const product = JSON.parse(productJson);
    if (!product.productId || !product.productName || !product.manufacturerId) {
      throw new Error("productId, productName and manufacturerId are required");
    }
    if (product.manufacturerId !== actorOrg(ctx)) throw new Error("Manufacturer identity mismatch");

    const key = `PRODUCT_${product.productId}`;
    const existing = await ctx.stub.getState(key);
    if (existing && existing.length) throw new Error("Product already exists");

    const record = {
      docType: "product",
      ...product,
      txId: ctx.stub.getTxID(),
      createdAt: product.createdAt || now()
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    ctx.stub.setEvent("PRODUCT_CREATED", Buffer.from(JSON.stringify({
      eventId: eventId(), eventType: "PRODUCT_CREATED", txId: ctx.stub.getTxID(),
      productId: product.productId, timestamp: now()
    })));
    return record;
  }

  async CreateBatch(ctx, batchJson) {
    requireRole(ctx, ["ManufacturerMSP"]);
    const batch = JSON.parse(batchJson);
    if (!batch.batchId || !batch.productId || !batch.manufacturerId) {
      throw new Error("batchId, productId and manufacturerId are required");
    }
    if (batch.manufacturerId !== actorOrg(ctx)) throw new Error("Manufacturer identity mismatch");

    const productState = await ctx.stub.getState(`PRODUCT_${batch.productId}`);
    if (!productState || !productState.length) throw new Error("Product does not exist");

    const key = `BATCH_${batch.batchId}`;
    const existing = await ctx.stub.getState(key);
    if (existing && existing.length) throw new Error("Batch already exists");

    const record = {
      docType: "batch",
      ...batch,
      status: "MANUFACTURED",
      verificationStatus: "PENDING",
      currentOwner: batch.manufacturerId,
      txId: ctx.stub.getTxID(),
      updatedAt: now(),
      createdAt: batch.createdAt || now()
    };

    await writeBatch(ctx, record);
    ctx.stub.setEvent("BATCH_CREATED", Buffer.from(JSON.stringify({
      eventId: eventId(), eventType: "BATCH_CREATED", txId: ctx.stub.getTxID(),
      batchId: batch.batchId, timestamp: now()
    })));
    return record;
  }

  async ReadProduct(ctx, productId) {
    const data = await ctx.stub.getState(`PRODUCT_${productId}`);
    if (!data || !data.length) throw new Error("Product not found");
    return JSON.parse(data.toString());
  }

  async ReadBatch(ctx, batchId) {
    return readBatch(ctx, batchId);
  }

  async CreateShipment(ctx, batchId, destinationOrganizationId, trackingNumber) {
    requireRole(ctx, ["ManufacturerMSP", "DistributorMSP"]);
    if (!destinationOrganizationId) throw new Error("destinationOrganizationId is required");
    const actor = actorOrg(ctx);
    const batch = await readBatch(ctx, batchId);
    if (batch.currentOwner !== actor) throw new Error("Only the current owner can create a shipment");
    const shipmentId = `SHIP-${ctx.stub.getTxID()}`;
    const shipment = { docType: "shipment", shipmentId, batchId, originOrganizationId: actor, destinationOrganizationId, trackingNumber: trackingNumber || "", status: "CREATED", createdAt: now(), txId: ctx.stub.getTxID() };
    await ctx.stub.putState(`SHIPMENT_${shipmentId}`, Buffer.from(JSON.stringify(shipment)));
    batch.lastShipmentId = shipmentId;
    batch.lastTxId = ctx.stub.getTxID();
    batch.updatedAt = now();
    await writeBatch(ctx, batch);
    ctx.stub.setEvent("SHIPMENT_CREATED", Buffer.from(JSON.stringify({
      eventId: eventId(), eventType: "SHIPMENT_CREATED", txId: ctx.stub.getTxID(),
      batchId, shipmentId, actor, timestamp: now()
    })));
    return shipment;
  }

  async TransferBatch(ctx, batchId, recipientOrganizationId, location) {
    requireRole(ctx, ["ManufacturerMSP", "DistributorMSP"]);
    if (!recipientOrganizationId) throw new Error("recipientOrganizationId is required");

    const actor = actorOrg(ctx);
    const batch = await readBatch(ctx, batchId);
    if (batch.currentOwner !== actor) throw new Error("Only the current owner can transfer this batch");
    if (!["MANUFACTURED", "RECEIVED"].includes(batch.status)) throw new Error("Batch can only be transferred from MANUFACTURED or RECEIVED state");

    if (!["ORG-DIS-001", "ORG-PHA-001"].includes(recipientOrganizationId)) throw new Error("Recipient organization is not authorized");
    batch.currentOwner = recipientOrganizationId;
    batch.currentLocation = location || batch.currentLocation;
    batch.status = "IN_TRANSIT";
    batch.updatedAt = now();
    batch.lastTxId = ctx.stub.getTxID();

    await writeBatch(ctx, batch);
    ctx.stub.setEvent("BATCH_TRANSFERRED", Buffer.from(JSON.stringify({
      eventId: eventId(), eventType: "BATCH_TRANSFERRED", txId: ctx.stub.getTxID(),
      actor, batchId, recipientOrganizationId, timestamp: now()
    })));
    return batch;
  }

  async ReceiveBatch(ctx, batchId, location) {
    requireRole(ctx, ["DistributorMSP", "PharmacyMSP"]);
    const actor = actorOrg(ctx);
    const batch = await readBatch(ctx, batchId);
    if (batch.currentOwner !== actor) throw new Error("Only the intended recipient can receive this batch");
    if (batch.status !== "IN_TRANSIT") throw new Error("Batch is not currently in transit");

    batch.status = "RECEIVED";
    batch.currentLocation = location || batch.currentLocation;
    batch.updatedAt = now();
    batch.lastTxId = ctx.stub.getTxID();
    await writeBatch(ctx, batch);
    return batch;
  }

  async VerifyBatch(ctx, batchId) {
    requireRole(ctx, ["DistributorMSP", "PharmacyMSP", "RegulatorMSP"]);
    const batch = await readBatch(ctx, batchId);
    if (!["RECEIVED", "IN_TRANSIT"].includes(batch.status)) throw new Error("Batch must be received or in transit before verification");
    const result = batch.documentHash ? "VERIFIED" : "VERIFIED_METADATA_ONLY";
    batch.verificationStatus = result;
    batch.updatedAt = now();
    batch.lastTxId = ctx.stub.getTxID();
    await writeBatch(ctx, batch);
    return batch;
  }

  async DispenseBatch(ctx, batchId) {
    requireRole(ctx, ["PharmacyMSP"]);
    const actor = actorOrg(ctx);
    const batch = await readBatch(ctx, batchId);
    if (batch.currentOwner !== actor) throw new Error("Only the current pharmacy can dispense this batch");
    if (batch.status !== "RECEIVED") throw new Error("Batch must be received before dispensing");
    if (!batch.verificationStatus || !batch.verificationStatus.startsWith("VERIFIED")) {
      throw new Error("Batch must be verified before dispensing");
    }
    if (batch.complianceStatus === "NON_COMPLIANT") throw new Error("Non-compliant batches cannot be dispensed");
    batch.status = "DISPENSED";
    batch.updatedAt = now();
    batch.lastTxId = ctx.stub.getTxID();
    await writeBatch(ctx, batch);
    return batch;
  }

  async UpdateComplianceStatus(ctx, batchId, complianceStatus, note) {
    requireRole(ctx, ["RegulatorMSP"]);
    const batch = await readBatch(ctx, batchId);
    batch.complianceStatus = complianceStatus;
    batch.complianceNote = note || "";
    batch.updatedAt = now();
    batch.lastTxId = ctx.stub.getTxID();
    await writeBatch(ctx, batch);
    return batch;
  }

  async GetBatchHistory(ctx, batchId) {
    const iterator = await ctx.stub.getHistoryForKey(`BATCH_${batchId}`);
    const history = [];
    for await (const item of iterator) {
      let value = null;
      if (item.value && item.value.length) value = JSON.parse(item.value.toString());
      history.push({ txId: item.txId, timestamp: item.timestamp, isDelete: item.isDelete, value });
    }
    return history;
  }
}

module.exports = { PharmaTraceabilityContract };
