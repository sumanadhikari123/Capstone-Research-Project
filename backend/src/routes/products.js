import express from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { ledgerService } from "../services/ledgerService.js";
import { env } from "../config/env.js";
import { MetadataRepository } from "../repositories/metadata.js";

const router = express.Router();
const metadata = new MetadataRepository();

router.post("/", requireAuth, requireRoles("MANUFACTURER"), async (req, res, next) => {
  try {
    const product = {
      productId: String(req.body?.productId || "").trim(),
      productName: String(req.body?.productName || "").trim(),
      manufacturerId: req.user.organizationId,
      description: String(req.body?.description || "").trim(),
      createdAt: new Date().toISOString()
    };

    if (!product.productId || !product.productName) {
      return res.status(400).json({ error: "productId and productName are required" });
    }

    const result = await ledgerService.createProduct(product, req.user);
    let metadataWarning = null;

    if (env.usePostgres && env.databaseUrl) {
      try {
        await metadata.saveProduct(product);
      } catch (error) {
        metadataWarning = `Blockchain transaction succeeded, but PostgreSQL metadata was not saved: ${error.message}`;
      }
    }

    res.status(201).json({ ...result, product, metadataWarning });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await ledgerService.readProduct(req.params.id, req.user);
    if (!result) return res.status(404).json({ error: "Product not found" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
