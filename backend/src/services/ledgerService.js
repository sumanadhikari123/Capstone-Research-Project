import { ethereumService } from "./ethereumService.js";

export const ledgerService = {
  createProduct: (p, actor) => ethereumService.createProduct(p, actor),
  createBatch: (b, actor) => ethereumService.createBatch(b, actor),
  readProduct: (id) => ethereumService.readProduct(id),
  readBatch: (id) => ethereumService.readBatch(id),
  transferBatch: (id, recipient, location, actor) => ethereumService.transferBatch(id, recipient, location, actor),
  receiveBatch: (id, actor, location) => ethereumService.receiveBatch(id, actor, location),
  verifyBatch: (id, actor) => ethereumService.verifyBatch(id, actor),
  dispenseBatch: (id, actor) => ethereumService.dispenseBatch(id, actor),
  createShipment: (id, destination, trackingNumber, actor) => ethereumService.createShipment(id, destination, trackingNumber, actor),
  history: (id) => ethereumService.history(id),
  updateCompliance: (id, status, note, actor) => ethereumService.updateCompliance(id, status, note, actor),
  integrity: (id) => ethereumService.integrity(id),
  networkInfo: () => ethereumService.networkInfo()
};
