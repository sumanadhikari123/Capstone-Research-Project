import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { TraceabilityStateMachine } from "../services/traceabilityStateMachine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.resolve(__dirname, "../../data/demo-ledger.json");
const initialState = { products: {}, batches: {}, history: {}, shipments: {} };

function hashEvent(event, previousHash = "GENESIS") {
  return createHash("sha256").update(`${previousHash}:${JSON.stringify(event)}`).digest("hex");
}
function tx(eventType, actor, payload, previousHash = "GENESIS") {
  const base = {
    txId: `TX-${randomUUID().slice(0,12)}`,
    eventId: `EVT-${randomUUID().slice(0,12)}`,
    eventType, actor, timestamp: new Date().toISOString(), payload
  };
  return { ...base, eventHash: hashEvent(base, previousHash), previousHash };
}

export class DemoLedger {
  constructor(storageFile = defaultFile) {
    this.file = storageFile;
  }

  async readState() {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(initialState, null, 2));
      return structuredClone(initialState);
    }
  }

  async writeState(state) {
    await fs.writeFile(this.file, JSON.stringify(state, null, 2));
  }

  async createProduct(product, actor) {
    const state = await this.readState();
    if (state.products[product.productId]) throw new Error("Product already exists");
    state.products[product.productId] = product;
    const event = tx("PRODUCT_CREATED", actor, product);
    await this.writeState(state);
    return event;
  }

  async createBatch(batch, actor) {
    const state = await this.readState();
    if (!state.products[batch.productId]) throw new Error("Product does not exist");
    if (state.batches[batch.batchId]) throw new Error("Batch already exists");
    const record = {
      ...batch, status:"MANUFACTURED", verificationStatus:"PENDING",
      currentOwner:batch.manufacturerId,
      createdAt:batch.createdAt||new Date().toISOString(), updatedAt:new Date().toISOString()
    };
    state.batches[batch.batchId]=record;
    const event=tx("BATCH_CREATED",actor,record);
    state.history[batch.batchId]=[event];
    await this.writeState(state);
    return {...record,txId:event.txId};
  }

  async createShipment(batchId,destinationOrganizationId,trackingNumber,actor) {
    const state=await this.readState();
    const batch=state.batches[batchId];
    if(!batch) throw new Error("Batch not found");
    if(batch.currentOwner!==actor) throw new Error("Only the current owner can create a shipment");
    if(!destinationOrganizationId) throw new Error("destinationOrganizationId is required");
    const shipment={
      shipmentId:`SHIP-${randomUUID().slice(0,12)}`, batchId,
      originOrganizationId:actor, destinationOrganizationId,
      trackingNumber:trackingNumber||"", status:"CREATED", createdAt:new Date().toISOString()
    };
    state.shipments[shipment.shipmentId]=shipment;
    const hist=state.history[batchId]||[];
    hist.push(tx("SHIPMENT_CREATED",actor,shipment,hist.at(-1)?.eventHash||"GENESIS"));
    state.history[batchId]=hist;
    await this.writeState(state);
    return {...shipment,txId:hist.at(-1).txId};
  }

  async readProduct(productId){ return (await this.readState()).products[productId]||null; }
  async readBatch(batchId){ return (await this.readState()).batches[batchId]||null; }
  async listBatches(){ return Object.values((await this.readState()).batches); }

  async transferBatch(batchId,recipientId,location,actor){
    const state=await this.readState(); const batch=state.batches[batchId];
    if(!batch) throw new Error("Batch not found");
    if(batch.currentOwner!==actor) throw new Error("Only the current owner can transfer this batch");
    TraceabilityStateMachine.transfer(batch);
    batch.currentOwner=recipientId; batch.currentLocation=location||batch.currentLocation;
    batch.status="IN_TRANSIT"; batch.updatedAt=new Date().toISOString();
    const event=tx("BATCH_TRANSFERRED",actor,{batchId,recipientId,location:batch.currentLocation},state.history[batchId]?.at(-1)?.eventHash||"GENESIS");
    state.history[batchId].push(event); await this.writeState(state); return {...batch,txId:event.txId};
  }

  async receiveBatch(batchId,actor,location){
    const state=await this.readState(); const batch=state.batches[batchId];
    if(!batch) throw new Error("Batch not found");
    if(batch.currentOwner!==actor) throw new Error("Only the intended recipient can receive this batch");
    TraceabilityStateMachine.receive(batch);
    if(location) batch.currentLocation=location; batch.status="RECEIVED"; batch.updatedAt=new Date().toISOString();
    const event=tx("BATCH_RECEIVED",actor,{batchId,location:batch.currentLocation},state.history[batchId]?.at(-1)?.eventHash||"GENESIS");
    state.history[batchId].push(event); await this.writeState(state); return {...batch,txId:event.txId};
  }

  async verifyBatch(batchId,actor){
    const state=await this.readState(); const batch=state.batches[batchId];
    if(!batch) throw new Error("Batch not found");
    batch.verificationStatus=batch.documentHash?"VERIFIED":"VERIFIED_METADATA_ONLY";
    batch.updatedAt=new Date().toISOString();
    const event=tx("BATCH_VERIFIED",actor,{batchId,verificationStatus:batch.verificationStatus},state.history[batchId]?.at(-1)?.eventHash||"GENESIS");
    state.history[batchId].push(event); await this.writeState(state); return {...batch,txId:event.txId};
  }

  async dispenseBatch(batchId,actor){
    const state=await this.readState(); const batch=state.batches[batchId];
    if(!batch) throw new Error("Batch not found");
    if(actor!=="ORG-PHA-001" || batch.currentOwner!==actor) throw new Error("Only the current pharmacy can dispense this batch");
    TraceabilityStateMachine.dispense(batch);
    batch.status="DISPENSED"; batch.updatedAt=new Date().toISOString();
    const event=tx("BATCH_DISPENSED",actor,{batchId},state.history[batchId]?.at(-1)?.eventHash||"GENESIS");
    state.history[batchId].push(event); await this.writeState(state); return {...batch,txId:event.txId};
  }

  async updateCompliance(batchId,status,actor,note=""){
    if(actor!=="ORG-REG-001") throw new Error("Only the regulator can update compliance in this prototype");
    const state=await this.readState(); const batch=state.batches[batchId]; if(!batch) throw new Error("Batch not found");
    batch.complianceStatus=status; batch.complianceNote=note; batch.updatedAt=new Date().toISOString();
    const event=tx("COMPLIANCE_UPDATED",actor,{batchId,complianceStatus:status,note},state.history[batchId]?.at(-1)?.eventHash||"GENESIS");
    state.history[batchId].push(event); await this.writeState(state); return {...batch,txId:event.txId};
  }

  async verifyHistoryIntegrity(batchId){
    const hist=await this.history(batchId); let previous="GENESIS";
    for(const item of hist){
      const recalculated=hashEvent({txId:item.txId,eventId:item.eventId,eventType:item.eventType,actor:item.actor,timestamp:item.timestamp,payload:item.payload},previous);
      if(recalculated!==item.eventHash||item.previousHash!==previous) return {valid:false,badTxId:item.txId};
      previous=item.eventHash;
    }
    return {valid:true,count:hist.length};
  }
  async history(batchId){ return (await this.readState()).history[batchId]||[]; }
  async reset(){ await this.writeState(structuredClone(initialState)); }
}
