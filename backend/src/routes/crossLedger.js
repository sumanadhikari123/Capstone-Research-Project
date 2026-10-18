import express from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { ledgerService } from "../services/ledgerService.js";
import { CrossLedgerService } from "../services/crossLedger.js";
import crypto from "node:crypto";
const router=express.Router(); const service=new CrossLedgerService();
const hashEvent=e=>crypto.createHash("sha256").update(JSON.stringify(e)).digest("hex");
router.post("/anchor", requireAuth, requireRoles("MANUFACTURER","DISTRIBUTOR","PHARMACY","REGULATOR"), async(req,res,next)=>{
  try{
    const {event,sourceTxId,destinationSystemId}=req.body||{};
    if(!event||!sourceTxId) return res.status(400).json({error:"event and sourceTxId are required"});
    res.status(201).json(await service.anchor(event,sourceTxId,destinationSystemId));
  }catch(e){next(e)}
});
router.post("/verify", requireAuth, async(req,res,next)=>{
  try{ const {event,sourceTxId}=req.body||{}; if(!event||!sourceTxId) return res.status(400).json({error:"event and sourceTxId are required"});
    res.json(await service.verify(hashEvent(event),sourceTxId)); }catch(e){next(e)}
});
router.get("/anchors",requireAuth,async(req,res,next)=>{try{res.json(await service.list())}catch(e){next(e)}});
export default router;
