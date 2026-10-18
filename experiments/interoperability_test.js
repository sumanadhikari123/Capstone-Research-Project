const BASE = process.env.API_BASE || "http://localhost:4000/api";

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ username:"manufacturer", password:"Manufacturer123!" })
  });
  if (!r.ok) throw new Error(`Login failed: ${r.status}`);
  return (await r.json()).token;
}

async function call(token, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify(body)
  });
  return { status:r.status, ok:r.ok, data:await r.json() };
}

async function main() {
  const token = await login();
  const suffix = `${Date.now()}`;
  const productId = `INTEROP-PRODUCT-${suffix}`;
  const batchId = `INTEROP-${suffix}`;

  const product = await call(token, "/products", {
    productId,
    productName: "Interoperability Test Medicine",
    description: "Synthetic experimental record"
  });
  if (!product.ok && !String(product.data?.error || "").includes("already exists")) {
    throw new Error(`Product setup failed: ${JSON.stringify(product)}`);
  }

  const validEvent = {
    eventVersion: "1.0",
    eventId: `EVT-${suffix}`,
    eventType: "BATCH_CREATED",
    timestamp: new Date().toISOString(),
    organizationId: "ORG-MAN-001",
    productId,
    batchId,
    location: "Auckland",
    status: "MANUFACTURED"
  };

  const invalidEvent = {
    ...validEvent,
    eventVersion: "2.0",
    eventId: `BAD-${suffix}`
  };

  const valid = await call(token, "/interoperability/validate", validEvent);
  const invalid = await call(token, "/interoperability/validate", invalidEvent);
  const published = await call(token, "/interoperability/events", validEvent);

  const output = {
    timestamp: new Date().toISOString(),
    validValidationAccepted: valid.data.valid === true,
    invalidValidationRejected: invalid.data.valid === false,
    validPublishAccepted: published.ok,
    validStatusCode: valid.status,
    invalidStatusCode: invalid.status,
    publishStatusCode: published.status,
    productId,
    batchId
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
