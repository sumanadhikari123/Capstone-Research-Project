import express from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { ledgerService } from "../services/ledgerService.js";
import { env } from "../config/env.js";
import { MetadataRepository } from "../repositories/metadata.js";

const router = express.Router();
const metadata = new MetadataRepository();
const SHA256 = /^[a-f0-9]{64}$/i;

router.post("/", requireAuth, requireRoles("MANUFACTURER"), async (req, res, next) => {
  try {
    const batch = {
      batchId: String(req.body?.batchId || "").trim(),
      productId: String(req.body?.productId || "").trim(),
      manufacturerId: req.user.organizationId,
      currentOwner: req.user.organizationId,
      currentLocation: String(req.body?.location || "").trim(),
      manufactureDate: String(req.body?.manufactureDate || new Date().toISOString()),
      expiryDate: String(req.body?.expiryDate || "").trim(),
      documentHash: String(req.body?.documentHash || "").trim(),
      status: "MANUFACTURED",
      createdAt: new Date().toISOString()
    };

    if (!batch.batchId || !batch.productId) {
      return res.status(400).json({ error: "batchId and productId are required" });
    }
    if (!SHA256.test(batch.documentHash)) {
      return res.status(400).json({
        error: "documentHash must be a 64-character SHA-256 hexadecimal hash. Upload a supporting document first."
      });
    }

    const result = await ledgerService.createBatch(batch, req.user);
    let metadataWarning = null;

    if (env.usePostgres && env.databaseUrl) {
      try {
        await metadata.saveBatch(batch);
      } catch (error) {
        metadataWarning = `Blockchain transaction succeeded, but PostgreSQL metadata was not saved: ${error.message}`;
      }
    }

    res.status(201).json({ ...result, batch, metadataWarning });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await ledgerService.readBatch(req.params.id, req.user);
    if (!result) return res.status(404).json({ error: "Batch not found" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/shipment", requireAuth, requireRoles("MANUFACTURER", "DISTRIBUTOR"), async (req, res, next) => {
  try {
    const destinationOrganizationId = String(req.body?.destinationOrganizationId || "").trim();
    const trackingNumber = String(req.body?.trackingNumber || "").trim();
    if (!destinationOrganizationId) {
      return res.status(400).json({ error: "destinationOrganizationId is required" });
    }
    res.status(201).json(
      await ledgerService.createShipment(req.params.id, destinationOrganizationId, trackingNumber, req.user)
    );
  } catch (err) {
    next(err);
  }
});

router.get("/:id/history", requireAuth, async (req, res, next) => {
  try {
    res.json(await ledgerService.history(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/integrity", requireAuth, async (req, res, next) => {
  try {
    res.json(await ledgerService.integrity(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/transfer", requireAuth, requireRoles("MANUFACTURER", "DISTRIBUTOR"), async (req, res, next) => {
  try {
    const recipientOrganizationId = String(req.body?.recipientOrganizationId || "").trim();
    const location = String(req.body?.location || "").trim();
    if (!recipientOrganizationId) {
      return res.status(400).json({ error: "recipientOrganizationId is required" });
    }
    res.json(
      await ledgerService.transferBatch(req.params.id, recipientOrganizationId, location, req.user)
    );
  } catch (err) {
    next(err);
  }
});

router.post("/:id/receive", requireAuth, requireRoles("DISTRIBUTOR", "PHARMACY"), async (req, res, next) => {
  try {
    res.json(
      await ledgerService.receiveBatch(req.params.id, req.user, String(req.body?.location || "").trim())
    );
  } catch (err) {
    next(err);
  }
});

router.post("/:id/verify", requireAuth, requireRoles("DISTRIBUTOR", "PHARMACY", "REGULATOR"), async (req, res, next) => {
  try {
    res.json(await ledgerService.verifyBatch(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/dispense", requireAuth, requireRoles("PHARMACY"), async (req, res, next) => {
  try {
    res.json(await ledgerService.dispenseBatch(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/compliance", requireAuth, requireRoles("REGULATOR"), async (req, res, next) => {
  try {
    const complianceStatus = String(req.body?.complianceStatus || "").trim();
    const note = String(req.body?.note || "").trim();
    const allowed = ["PENDING", "UNDER_REVIEW", "COMPLIANT", "NON_COMPLIANT", "REJECTED"];
    if (!allowed.includes(complianceStatus)) {
      return res.status(400).json({
        error: `complianceStatus must be one of: ${allowed.join(", ")}`
      });
    }
    res.json(await ledgerService.updateCompliance(req.params.id, complianceStatus, note, req.user));
  } catch (err) {
    next(err);
  }
});

export default router;
