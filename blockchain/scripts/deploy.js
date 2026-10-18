import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const here = path.dirname(fileURLToPath(import.meta.url));
const blockchainRoot = path.resolve(here, "..");
const artifactPath = path.join(
  blockchainRoot,
  "artifacts/contracts/PharmaTraceability.sol/PharmaTraceability.json"
);
const deploymentPath = path.join(blockchainRoot, "deployments/localhost.json");

const RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const MNEMONIC = process.env.ETHEREUM_MNEMONIC ||
  "test test test test test test test test test test test junk";

const indexes = {
  MANUFACTURER: 0,
  DISTRIBUTOR: 1,
  PHARMACY: 2,
  REGULATOR: 3
};

const orgs = {
  MANUFACTURER: "ORG-MAN-001",
  DISTRIBUTOR: "ORG-DIS-001",
  PHARMACY: "ORG-PHA-001",
  REGULATOR: "ORG-REG-001"
};

if (!fs.existsSync(artifactPath)) {
  throw new Error("Contract artifact not found. Run npm run compile first.");
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
if (!artifact.bytecode || artifact.bytecode === "0x") {
  throw new Error("Compiled contract bytecode is empty. Re-run npm run compile.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const network = await provider.getNetwork();
const chainId = Number(network.chainId);

if (chainId !== 31337) {
  throw new Error(
    `Unexpected chain ID ${chainId}. Expected Hardhat local chain 31337 at ${RPC_URL}.`
  );
}

const walletFor = (index) =>
  ethers.Wallet.fromPhrase(
    MNEMONIC,
    provider,
    `m/44'/60'/0'/0/${index}`
  );

const manufacturer = walletFor(indexes.MANUFACTURER);
const distributor = walletFor(indexes.DISTRIBUTOR);
const pharmacy = walletFor(indexes.PHARMACY);
const regulator = walletFor(indexes.REGULATOR);
const deployer = manufacturer;

console.log(`RPC: ${RPC_URL}`);
console.log(`Chain ID: ${chainId}`);
console.log(`Deployer/manufacturer: ${deployer.address}`);

const balance = await provider.getBalance(deployer.address);
if (balance === 0n) {
  throw new Error("Manufacturer/deployer account has zero balance on the local node.");
}

const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(
  manufacturer.address,
  distributor.address,
  pharmacy.address,
  regulator.address,
  orgs.MANUFACTURER,
  orgs.DISTRIBUTOR,
  orgs.PHARMACY,
  orgs.REGULATOR
);

const deploymentTx = contract.deploymentTransaction();
console.log(`Deployment transaction: ${deploymentTx?.hash ?? "unknown"}`);
await contract.waitForDeployment();

const address = await contract.getAddress();
const code = await provider.getCode(address);
if (!code || code === "0x") {
  throw new Error(`Deployment verification failed: ${address} has no bytecode.`);
}

const versionBlock = await provider.getBlockNumber();
const deployment = {
  network: "hardhat-localhost",
  rpcUrl: RPC_URL,
  chainId,
  contractAddress: address,
  deployedAt: new Date().toISOString(),
  deployedAtBlock: versionBlock,
  abi: artifact.abi,
  organizations: Object.fromEntries(
    Object.entries(indexes).map(([role, index]) => [
      role,
      { organizationId: orgs[role], address: walletFor(index).address }
    ])
  )
};

fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

console.log(`Contract bytecode verified: ${code.slice(0, 18)}...`);
console.log(`Contract address: ${address}`);
console.log(`Deployment file: ${deploymentPath}`);
console.log("Deployment completed successfully.");
