import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;
let pool;

if (env.databaseUrl) {
  pool = new Pool({ connectionString: env.databaseUrl });
}

export function getPool() {
  if (!pool) throw new Error("PostgreSQL is not configured");
  return pool;
}

export async function saveApplicationAudit(entry) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO application_audit
      (event_id, tx_id, event_type, actor_org, payload_json, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      entry.eventId,
      entry.txId,
      entry.eventType,
      entry.actorOrg,
      JSON.stringify(entry.payload || {}),
      entry.timestamp || new Date().toISOString()
    ]
  );
}
