import test from "node:test";
import assert from "node:assert/strict";
import { PrivacyService } from "../src/services/privacy.js";
import { ZeroKnowledgeProofService } from "../src/services/zkp.js";

test("selective disclosure hides restricted fields for public viewers", () => {
  const p=new PrivacyService();
  const record={batchId:"B1",productId:"P1",status:"RECEIVED",currentOwner:"SECRET-ORG",complianceStatus:"COMPLIANT"};
  const publicView=p.disclose(record,"PUBLIC");
  assert.equal(publicView.batchId,"B1");
  assert.equal(publicView.currentOwner,undefined);
});

test("cryptographic commitment verifies without exposing the original value", () => {
  const p=new PrivacyService();
  const value={compliance:"COMPLIANT",batchId:"B1"};
  const c=p.commitment(value,"a".repeat(32));
  assert.equal(p.verifyCommitment(value,c.commitment,c.salt),true);
  assert.equal(p.verifyCommitment({...value,compliance:"NON_COMPLIANT"},c.commitment,c.salt),false);
});

test("educational Schnorr proof verifies and rejects altered message", () => {
  const z=new ZeroKnowledgeProofService();
  const message="B1|documentHash|authorized-verifier";
  const proof=z.generate(message);
  assert.equal(z.verify(proof),true);
  assert.equal(z.verify({...proof,message:"B1|tampered"}),false);
});
