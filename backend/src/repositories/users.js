import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { getPool } from "./postgres.js";

export async function findUserByUsername(username) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT user_id, username, password_hash, role, organization_id, msp_id
     FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

export async function seedUsers() {
  const pool = getPool();
  const orgs = [
    ["ORG-MAN-001", "Global Pharma Manufacturing", "MANUFACTURER"],
    ["ORG-DIS-001", "Auckland Pharmaceutical Distribution", "DISTRIBUTOR"],
    ["ORG-PHA-001", "Auckland Community Pharmacy", "PHARMACY"],
    ["ORG-REG-001", "Pharmaceutical Compliance Authority", "REGULATOR"]
  ];
  for (const [id, name, type] of orgs) {
    await pool.query(
      `INSERT INTO organizations(organization_id, organization_name, organization_type)
       VALUES($1,$2,$3)
       ON CONFLICT(organization_id) DO UPDATE SET organization_name=EXCLUDED.organization_name, organization_type=EXCLUDED.organization_type`,
      [id, name, type]
    );
  }

  const users = [
    ["USR-MAN-001", "manufacturer", "Manufacturer123!", "MANUFACTURER", "ORG-MAN-001", "ManufacturerMSP"],
    ["USR-DIS-001", "distributor", "Distributor123!", "DISTRIBUTOR", "ORG-DIS-001", "DistributorMSP"],
    ["USR-PHA-001", "pharmacy", "Pharmacy123!", "PHARMACY", "ORG-PHA-001", "PharmacyMSP"],
    ["USR-REG-001", "regulator", "Regulator123!", "REGULATOR", "ORG-REG-001", "RegulatorMSP"]
  ];
  for (const [id, username, password, role, organizationId, mspId] of users) {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users(user_id, organization_id, username, password_hash, role, msp_id)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role, organization_id=EXCLUDED.organization_id, msp_id=EXCLUDED.msp_id`,
      [id, organizationId, username, passwordHash, role, mspId]
    );
  }
  return { seeded: users.map((u) => ({ username: u[1], role: u[3], organizationId: u[4], mspId: u[5] })) };
}

export function userId() {
  return `USR-${crypto.randomBytes(6).toString("hex")}`;
}
