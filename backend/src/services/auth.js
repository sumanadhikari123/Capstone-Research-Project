import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { findUserByUsername } from "../repositories/users.js";
import { ethereumService } from "./ethereumService.js";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/users.json");

async function fileUsers() {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function verifyScrypt(password, encoded) {
  try {
    const [, , params, saltEncoded, expectedEncoded] = encoded.split("$");
    const paramsMap = Object.fromEntries(params.split(",").map((part) => part.split("=")));
    const N = Number(paramsMap.N);
    const r = Number(paramsMap.r);
    const p = Number(paramsMap.p);
    if (!N || !r || !p || N < 1024 || r < 1 || p < 1) return false;

    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(expectedEncoded, "base64url");
    const derived = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, expected.length, { N, r, p }, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  if (stored.startsWith("$scrypt$")) return verifyScrypt(password, stored);
  // Legacy local-only fallback for older development files.
  return password === stored;
}

export async function authenticate(username, password) {
  let user;
  let passwordHash;

  if (env.usePostgres && env.databaseUrl) {
    user = await findUserByUsername(username);
    passwordHash = user?.password_hash;
  } else {
    const list = await fileUsers();
    user = list.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
    passwordHash = user?.passwordHash || user?.password;
  }

  const ok = user && (await verifyPassword(password, passwordHash));
  if (!ok) return null;

  const safe = {
    id: user.id || user.user_id,
    username: user.username,
    role: user.role,
    organizationId: user.organizationId || user.organization_id,
    mspId: user.mspId || null,
    blockchainAddress: ethereumService.roleAddress(user.role)
  };

  const token = jwt.sign(safe, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  return { user: safe, token };
}
