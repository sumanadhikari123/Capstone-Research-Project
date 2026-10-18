import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import batchRoutes from "./routes/batches.js";
import interoperabilityRoutes from "./routes/interoperability.js";
import documentRoutes from "./routes/documents.js";
import privacyRoutes from "./routes/privacy.js";
import crossLedgerRoutes from "./routes/crossLedger.js";
import { getPool } from "./repositories/postgres.js";
import { ledgerService } from "./services/ledgerService.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.get("/api/health", async (req, res) => {
  let database = "disabled";
  if (env.usePostgres && env.databaseUrl) {
    try { await getPool().query("SELECT 1"); database = "connected"; } catch { database = "unavailable"; }
  }
  let ethereum = { status: "unavailable" };
  try { ethereum = { status: "connected", ...(await ledgerService.networkInfo()) }; } catch (e) { ethereum = { status: "unavailable", error: e.message }; }
  res.json({
    status: database === "unavailable" || ethereum.status === "unavailable" ? "degraded" : "ok",
    service: "pharma-traceability-api",
    ledger: "ethereum-local",
    database,
    ethereum,
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/interoperability", interoperabilityRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/cross-ledger", crossLedgerRoutes);
app.use((err, req, res, next) => {
  const status = Number(err.status) || 500;
  const payload = {
    error: err.message || "Internal server error"
  };
  if (err.details) payload.details = err.details;
  res.status(status).json(payload);
});

app.listen(env.port, () => {
  console.log(`PharmaTrace Ethereum API running on http://localhost:${env.port}`);
  console.log(`Ledger mode: ${env.ledgerMode}`);
});
