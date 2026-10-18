import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { ledgerService } from "../services/ledgerService.js";
import { PrivacyService } from "../services/privacy.js";
import { ZeroKnowledgeProofService } from "../services/zkp.js";
const router=express.Router();
const privacy=new PrivacyService();
const zkp=new ZeroKnowledgeProofService();

router.get("/batches/:id", requireAuth, async (req,res,next)=>{
  try{
    const batch=await ledgerService.readBatch(req.params.id, req.user);
    if(!batch) return res.status(404).json({error:"Batch not found"});
    const audienceRole = req.user.role || "PUBLIC";
    res.json({audienceRole, data:privacy.disclose(batch, String(audienceRole).toUpperCase())});
  }catch(e){next(e)}
});
router.post("/commitment", requireAuth, (req,res)=>{
  const { value, salt }=req.body||{};
  if(value===undefined) return res.status(400).json({error:"value is required"});
  res.json(privacy.commitment(value,salt));
});
router.post("/commitment/verify", requireAuth, (req,res)=>{
  const {value,commitment,salt}=req.body||{};
  if(value===undefined||!commitment||!salt) return res.status(400).json({error:"value, commitment and salt are required"});
  res.json({valid:privacy.verifyCommitment(value,commitment,salt)});
});
router.post("/zkp/prove", requireAuth, (req,res)=>{
  const {message}=req.body||{};
  if(!message) return res.status(400).json({error:"message is required"});
  res.json(zkp.generate(String(message)));
});
router.post("/zkp/verify", requireAuth, (req,res)=>{
  const {publicKey,proof,message}=req.body||{};
  if(!publicKey||!proof||!message) return res.status(400).json({error:"publicKey, proof and message are required"});
  res.json({valid:zkp.verify({publicKey,proof,message})});
});
export default router;
