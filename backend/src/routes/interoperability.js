import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { processTraceEvent, validateTraceEvent } from "../services/interoperability.js";

const router = express.Router();

router.post("/validate", requireAuth, (req, res) => {
  res.json(validateTraceEvent(req.body));
});

router.post("/events", requireAuth, async (req, res, next) => {
  try {
    const result = await processTraceEvent(req.body, req.user.organizationId);
    res.status(201).json({
      success: true,
      standard: "pharma-trace-event",
      version: req.body.eventVersion,
      result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
