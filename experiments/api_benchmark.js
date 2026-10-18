import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const BASE = process.env.API_BASE || "http://localhost:4000/api";
const N = Number(process.env.N || 50);
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "manufacturer", password: "Manufacturer123!" })
  });
  return (await r.json()).token;
}

async function createBatch(token, i) {
  const batchId = `BENCH-${Date.now()}-${i}-${randomUUID().slice(0,6)}`;
  const payload = {
    batchId,
    productId: "BENCH-PRODUCT",
    location: "Auckland",
    manufactureDate: new Date().toISOString(),
    expiryDate: "2028-12-31"
  };
  const start = performance.now();
  const r = await fetch(`${BASE}/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const end = performance.now();
  return {
    status: r.status,
    success: r.ok,
    latencyMs: Number((end-start).toFixed(2))
  };
}

async function main() {
  const token = await login();

  // Prepare product once.
  await fetch(`${BASE}/products`, {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body: JSON.stringify({
      productId: "BENCH-PRODUCT",
      productName: "Benchmark Medicine",
      description: "Experimental-only synthetic record"
    })
  });

  const start = performance.now();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= N) return;
      results.push(await createBatch(token, i));
    }
  }

  await Promise.all(Array.from({length: Math.min(CONCURRENCY,N)}, worker));
  const totalMs = performance.now() - start;

  const successful = results.filter(r => r.success).length;
  const latencies = results.map(r => r.latencyMs).sort((a,b) => a-b);
  const avg = latencies.reduce((a,b)=>a+b,0)/latencies.length;
  const p95 = latencies[Math.max(0, Math.ceil(latencies.length*0.95)-1)];
  const tps = successful / (totalMs/1000);

  const output = {
    timestamp: new Date().toISOString(),
    endpoint: "/api/batches",
    requests: N,
    concurrency: CONCURRENCY,
    successful,
    failed: N - successful,
    wallClockMs: Number(totalMs.toFixed(2)),
    throughputTps: Number(tps.toFixed(2)),
    averageLatencyMs: Number(avg.toFixed(2)),
    p95LatencyMs: Number(p95.toFixed(2))
  };

  await mkdir("experiments/results", { recursive: true });
  await writeFile(
    `experiments/results/api-benchmark-${Date.now()}.json`,
    JSON.stringify(output, null, 2)
  );
  console.log(output);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
