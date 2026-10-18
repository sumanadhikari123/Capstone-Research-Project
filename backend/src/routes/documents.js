import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.js";
import { addToIpfs } from "../services/ipfs.js";
import { env } from "../config/env.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../data/uploads");

router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file is required" });
    const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
    if (env.ipfsApiUrl) {
      try {
        const result = await addToIpfs(req.file.buffer, req.file.originalname, env.ipfsApiUrl);
        return res.status(201).json({ documentId: crypto.randomUUID(), filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, cid: result.Hash, sha256, storage: "ipfs" });
      } catch {}
    }
    await fs.mkdir(dir, { recursive: true });
    const documentId = crypto.randomUUID();
    const storedName = `${documentId}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fullPath = path.join(dir, storedName);
    await fs.writeFile(fullPath, req.file.buffer);
    return res.status(201).json({ documentId, filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, cid: null, sha256, storage: "local" });
  } catch (err) { next(err); }
});

router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const { path: targetPath, expectedHash } = req.body || {};
    if (!targetPath || !expectedHash) return res.status(400).json({ error: "path and expectedHash are required" });
    if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return res.status(400).json({ error: "expectedHash must be SHA-256 hexadecimal" });
    const normalized = path.resolve(targetPath);
    const uploadRoot = path.resolve(dir);
    if (!normalized.startsWith(uploadRoot + path.sep)) return res.status(400).json({ error: "Only files inside the upload directory can be verified" });
    const data = await fs.readFile(normalized);
    const actual = crypto.createHash("sha256").update(data).digest("hex");
    res.json({ valid: actual.toLowerCase() === expectedHash.toLowerCase(), actual, expectedHash });
  } catch (err) { next(err); }
});
export default router;
