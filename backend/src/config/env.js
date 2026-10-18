import dotenv from "dotenv";
dotenv.config();
const bool = (v) => String(v ?? "false").toLowerCase() === "true";
export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "replace-this-with-a-long-random-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  ledgerMode: process.env.LEDGER_MODE || "ethereum",
  usePostgres: bool(process.env.USE_POSTGRES ?? "true"),
  databaseUrl: process.env.DATABASE_URL || "",
  ipfsApiUrl: process.env.IPFS_API_URL || "http://localhost:5001/api/v0",
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545",
    mnemonic: process.env.ETHEREUM_MNEMONIC || "test test test test test test test test test test test junk",
    deploymentPath: process.env.ETHEREUM_DEPLOYMENT_PATH || "blockchain/deployments/localhost.json"
  }
};
