import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";
import { env } from "../config/env.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../../..");
const defaultDeployment = path.join(
  projectRoot,
  "blockchain",
  "deployments",
  "localhost.json"
);
const deploymentPath = env.ethereum.deploymentPath
  ? path.resolve(projectRoot, env.ethereum.deploymentPath)
  : defaultDeployment;

const ROLE_INDEX = {
  MANUFACTURER: 0,
  DISTRIBUTOR: 1,
  PHARMACY: 2,
  REGULATOR: 3
};
const STATUS = ["NONE", "MANUFACTURED", "IN_TRANSIT", "RECEIVED", "DISPENSED"];
const VERIFICATION = ["PENDING", "VERIFIED"];
const EXPECTED_CHAIN_ID = 31337;

let cached = null;

function loadDeployment() {
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Ethereum deployment file not found: ${deploymentPath}. Start Hardhat and run npm run deploy.`
    );
  }

  const stat = fs.statSync(deploymentPath);
  if (!cached || cached.mtimeMs !== stat.mtimeMs) {
    const data = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    if (!ethers.isAddress(data.contractAddress)) {
      throw new Error("Deployment file contains an invalid contract address.");
    }
    if (!Array.isArray(data.abi)) {
      throw new Error("Deployment file contains no ABI.");
    }
    cached = { data, mtimeMs: stat.mtimeMs };
  }
  return cached.data;
}

function provider() {
  return new ethers.JsonRpcProvider(env.ethereum.rpcUrl);
}

function walletForRole(role) {
  const index = ROLE_INDEX[role];
  if (index === undefined) {
    throw new Error(`No Ethereum identity configured for role ${role}`);
  }
  return ethers.Wallet.fromPhrase(
    env.ethereum.mnemonic,
    provider(),
    `m/44'/60'/0'/0/${index}`
  );
}

function contractFor(role, signerMode = true) {
  const deployment = loadDeployment();
  const signer = signerMode ? walletForRole(role) : provider();
  return new ethers.Contract(deployment.contractAddress, deployment.abi, signer);
}

function errorMessage(error) {
  return String(
    error?.shortMessage ||
      error?.reason ||
      error?.info?.error?.message ||
      error?.error?.message ||
      error?.message ||
      "Ethereum request failed"
  )
    .replace(/^execution reverted:?\s*/i, "")
    .trim();
}

function mapError(error) {
  const message = errorMessage(error);
  if (error?.status) return error;

  const lower = message.toLowerCase();
  const mapped = new Error(message);

  if (lower.includes("not found") || lower.includes("deployment file")) {
    mapped.status = 404;
  } else if (
    lower.includes("unauthorized") ||
    lower.includes("role not allowed") ||
    lower.includes("current owner") ||
    lower.includes("receiving organization") ||
    lower.includes("insufficient permissions")
  ) {
    mapped.status = 403;
  } else if (
    lower.includes("already exists") ||
    lower.includes("must differ") ||
    lower.includes("create a shipment") ||
    lower.includes("invalid batch status")
  ) {
    mapped.status = 409;
  } else {
    mapped.status = 400;
  }

  mapped.original = error;
  return mapped;
}

async function assertContractAvailable() {
  const deployment = loadDeployment();
  const p = provider();
  const network = await p.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== EXPECTED_CHAIN_ID) {
    const error = new Error(
      `Wrong Ethereum network. Expected Hardhat chain ${EXPECTED_CHAIN_ID}, received ${chainId}.`
    );
    error.status = 503;
    throw error;
  }

  const code = await p.getCode(deployment.contractAddress);
  if (!code || code === "0x") {
    const error = new Error(
      `Ethereum contract is not deployed at ${deployment.contractAddress}. ` +
        "The Hardhat node may have been restarted. Start it and run npm run deploy again."
    );
    error.status = 503;
    throw error;
  }

  return { deployment, provider: p, network, code };
}

function decodeBatch(batch) {
  if (!batch) return null;
  return {
    batchId: batch.batchId,
    productId: batch.productId,
    manufacturerId: batch.manufacturerId,
    currentOwner: batch.currentOwner,
    currentLocation: batch.currentLocation,
    manufactureDate: batch.manufactureDate,
    expiryDate: batch.expiryDate,
    documentHash: batch.documentHash,
    status: STATUS[Number(batch.status)] || "NONE",
    verificationStatus: VERIFICATION[Number(batch.verificationStatus)] || "PENDING",
    complianceStatus: batch.complianceStatus,
    createdAt: Number(batch.createdAt)
  };
}

function decodeProduct(product) {
  if (!product) return null;
  return {
    productId: product.productId,
    productName: product.productName,
    manufacturerId: product.manufacturerId,
    description: product.description,
    createdAt: Number(product.createdAt)
  };
}

async function transactionResult(contract, transactionPromise) {
  try {
    const tx = await transactionPromise;
    const receipt = await tx.wait();
    let eventHash = null;

    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.args?.eventHash) {
          eventHash = parsed.args.eventHash;
          break;
        }
      } catch {
        // Ignore logs that are not emitted by this contract interface.
      }
    }

    return {
      ledger: "ethereum",
      transactionHash: receipt.hash || tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString?.() ?? null,
      eventHash
    };
  } catch (error) {
    throw mapError(error);
  }
}

async function eventTransactionIndex(deployment) {
  const p = provider();
  const logs = await p.getLogs({
    address: deployment.contractAddress,
    fromBlock: deployment.deployedAtBlock ?? 0,
    toBlock: "latest"
  });
  const map = new Map();

  for (const log of logs) {
    try {
      const parsed = new ethers.Interface(deployment.abi).parseLog(log);
      const eventHash = parsed?.args?.eventHash;
      if (eventHash) {
        map.set(String(eventHash).toLowerCase(), {
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.index ?? log.logIndex ?? null
        });
      }
    } catch {
      // Unknown log or non-event entry.
    }
  }
  return map;
}

async function decodeHistory(entries, deployment) {
  const txIndex = await eventTransactionIndex(deployment);
  return entries.map((entry) => {
    const eventInfo = txIndex.get(String(entry.eventHash).toLowerCase());
    return {
      eventType: entry.eventType,
      actor: entry.actor,
      organizationId: entry.organizationId,
      details: entry.details,
      timestamp: new Date(Number(entry.timestamp) * 1000).toISOString(),
      previousHash: entry.previousHash,
      eventHash: entry.eventHash,
      transactionHash: eventInfo?.transactionHash || null,
      blockNumber: eventInfo?.blockNumber ?? null
    };
  });
}

export const ethereumService = {
  async networkInfo() {
    const { deployment, network, code } = await assertContractAvailable();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      rpcUrl: env.ethereum.rpcUrl,
      contractAddress: deployment.contractAddress,
      bytecodeLength: code.length
    };
  },

  roleAddress(role) {
    return walletForRole(role).address;
  },

  async createProduct(product, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.createProduct(
        String(product.productId).trim(),
        String(product.productName).trim(),
        String(product.manufacturerId).trim(),
        String(product.description || "")
      )
    );
  },

  async createBatch(batch, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.createBatch(
        String(batch.batchId).trim(),
        String(batch.productId).trim(),
        String(batch.manufacturerId).trim(),
        String(batch.currentLocation || ""),
        String(batch.manufactureDate || ""),
        String(batch.expiryDate || ""),
        String(batch.documentHash || "").trim()
      )
    );
  },

  async readProduct(id) {
    await assertContractAvailable();
    try {
      return decodeProduct(await contractFor("REGULATOR", false).readProduct(String(id).trim()));
    } catch (error) {
      throw mapError(error);
    }
  },

  async readBatch(id) {
    await assertContractAvailable();
    try {
      return decodeBatch(await contractFor("REGULATOR", false).readBatch(String(id).trim()));
    } catch (error) {
      throw mapError(error);
    }
  },

  async createShipment(id, destination, tracking, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.createShipment(String(id).trim(), String(destination).trim(), String(tracking || "").trim())
    );
  },

  async transferBatch(id, recipient, location, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.transferBatch(String(id).trim(), String(recipient).trim(), String(location || "").trim())
    );
  },

  async receiveBatch(id, actor, location) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.receiveBatch(String(id).trim(), String(location || "").trim())
    );
  },

  async verifyBatch(id, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(contract, contract.verifyBatch(String(id).trim()));
  },

  async dispenseBatch(id, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(contract, contract.dispenseBatch(String(id).trim()));
  },

  async updateCompliance(id, status, note, actor) {
    await assertContractAvailable();
    const contract = contractFor(actor.role);
    return transactionResult(
      contract,
      contract.updateComplianceStatus(
        String(id).trim(),
        String(status).trim(),
        String(note || "").trim()
      )
    );
  },

  async history(id) {
    const { deployment } = await assertContractAvailable();
    try {
      const entries = await contractFor("REGULATOR", false).getBatchHistory(String(id).trim());
      return decodeHistory(entries, deployment);
    } catch (error) {
      throw mapError(error);
    }
  },

  async integrity(id) {
    await assertContractAvailable();
    try {
      const result = await contractFor("REGULATOR", false).verifyHistoryIntegrity(String(id).trim());
      return { valid: result[0], finalHash: result[1] };
    } catch (error) {
      throw mapError(error);
    }
  }
};
