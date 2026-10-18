import fs from "node:fs/promises";
import crypto from "node:crypto";
import * as grpc from "@grpc/grpc-js";
import { env } from "../config/env.js";

const resources = new Map();

function identityConfig(mspId) {
  const configured = env.fabric.identities[mspId];
  const fallback = env.fabric;
  return {
    mspId,
    certPath: configured?.certPath || fallback.certPath,
    privateKeyPath: configured?.privateKeyPath || fallback.privateKeyPath,
    tlsCertPath: configured?.tlsCertPath || fallback.tlsCertPath,
    gatewayEndpoint: configured?.gatewayEndpoint || fallback.gatewayEndpoint
  };
}

async function getResource(mspId = env.fabric.mspId) {
  if (env.fabricMode !== "fabric") {
    throw new Error("Fabric mode is disabled. Set FABRIC_MODE=fabric to use Hyperledger Fabric.");
  }
  const cfg = identityConfig(mspId);
  if (!cfg.certPath || !cfg.privateKeyPath || !cfg.tlsCertPath || !cfg.mspId) {
    throw new Error(`Fabric credentials are not configured for ${mspId}. Set the organization certificate, private key and TLS root certificate in .env.`);
  }
  const key = `${cfg.mspId}|${cfg.gatewayEndpoint}|${cfg.certPath}|${cfg.privateKeyPath}|${cfg.tlsCertPath}`;
  if (!resources.has(key)) {
    resources.set(key, (async () => {
      const { connect, hash } = await import("@hyperledger/fabric-gateway");
      const cert = await fs.readFile(cfg.certPath);
      const keyPem = await fs.readFile(cfg.privateKeyPath);
      const privateKey = crypto.createPrivateKey(keyPem);
      const tlsRootCert = await fs.readFile(cfg.tlsCertPath);
      const client = new grpc.Client(cfg.gatewayEndpoint, grpc.credentials.createSsl(tlsRootCert));
      const gateway = connect({
        identity: { mspId: cfg.mspId, credentials: cert },
        signer: (await import("@hyperledger/fabric-gateway")).signers.newPrivateKeySigner(privateKey),
        hash: hash.sha256,
        client
      });
      const network = gateway.getNetwork(env.fabric.channel);
      const contract = network.getContract(env.fabric.chaincode);
      return { gateway, client, contract };
    })());
  }
  return resources.get(key);
}

export async function submitFabric(name, args = [], mspId = env.fabric.mspId) {
  const { contract } = await getResource(mspId);
  const result = await contract.submitTransaction(name, ...args.map(String));
  const text = Buffer.from(result).toString("utf8");
  return text ? JSON.parse(text) : { success: true };
}

export async function evaluateFabric(name, args = [], mspId = env.fabric.mspId) {
  const { contract } = await getResource(mspId);
  const result = await contract.evaluateTransaction(name, ...args.map(String));
  const text = Buffer.from(result).toString("utf8");
  return text ? JSON.parse(text) : null;
}
