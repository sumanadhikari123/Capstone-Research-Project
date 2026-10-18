import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { addToIpfs } from "../services/ipfs.js";
import { env } from "../config/env.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const hash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    if (!env.ipfsApiUrl) {
      return res.json({ cid: null, documentHash: hash, storage: "demo" });
    }
    try {
      const result = await addToIpfs(req.file.buffer, req.file.originalname, env.ipfsApiUrl);
      return res.json({
        cid: result.Hash,
        documentHash: hash,
        storage: "ipfs"
      });
    } catch {
      return res.json({
        cid: null,
        documentHash: hash,
        storage: "hash-only-fallback"
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
