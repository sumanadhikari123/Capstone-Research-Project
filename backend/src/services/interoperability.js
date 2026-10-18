import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ledgerService } from "./ledgerService.js";

const schemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../interoperability/schema/trace-event.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors:true }); addFormats(ajv); const validate=ajv.compile(schema);
export function validateTraceEvent(event){ const valid=validate(event); return {valid,errors:validate.errors||[]}; }

export async function processTraceEvent(event,actor){
  const actorOrg = typeof actor === "string" ? actor : actor.organizationId;
  const actorUser = typeof actor === "object" ? actor : { organizationId: actor, role: "REGULATOR" };
  const result=validateTraceEvent(event); if(!result.valid){const e=new Error("Invalid traceability event");e.status=400;e.details=result.errors;throw e;}
  switch(event.eventType){
    case "PRODUCT_CREATED": return ledgerService.createProduct({productId:event.productId,productName:event.note||event.productId,manufacturerId:event.organizationId,createdAt:event.timestamp},actorUser);
    case "BATCH_CREATED": return ledgerService.createBatch({batchId:event.batchId,productId:event.productId,manufacturerId:event.organizationId,currentLocation:event.location,status:event.status,documentHash:event.documentHash||"",createdAt:event.timestamp},actorUser);
    case "SHIPMENT_CREATED": return ledgerService.createShipment(event.batchId,event.destinationSystemId,event.trackingNumber||"",actorUser);
    case "BATCH_TRANSFERRED": return ledgerService.transferBatch(event.batchId,event.recipientOrganizationId,event.location,actorUser);
    case "BATCH_RECEIVED": return ledgerService.receiveBatch(event.batchId,actorUser,event.location);
    case "BATCH_VERIFIED": return ledgerService.verifyBatch(event.batchId,actorUser);
    case "BATCH_DISPENSED": return ledgerService.dispenseBatch(event.batchId,actorUser);
    case "COMPLIANCE_UPDATED": return ledgerService.updateCompliance(event.batchId,event.complianceStatus||event.status,event.note||"",actorUser);
    default:{const e=new Error(`Unsupported event type: ${event.eventType}`);e.status=400;throw e;}
  }
}
