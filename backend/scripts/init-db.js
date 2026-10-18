import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool } from "../src/repositories/postgres.js";
import { seedUsers } from "../src/repositories/users.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, "../../database/schema.sql");
const schema = await fs.readFile(schemaPath, "utf8");
const pool = getPool();
await pool.query(schema);
const result = await seedUsers();
console.log(JSON.stringify(result, null, 2));
await pool.end();
