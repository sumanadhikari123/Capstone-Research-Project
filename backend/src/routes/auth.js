import express from "express";
import { authenticate } from "../services/auth.js";

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const result = await authenticate(username, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
