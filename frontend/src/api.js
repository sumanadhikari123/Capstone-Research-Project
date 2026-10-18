const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach the PharmaTrace API at ${API}. Start the backend and try again.`);
  }

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("pharmatrace:auth-expired"));
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  health: () => request("/health"),
  login: (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  createProduct: (product) =>
    request("/products", { method: "POST", body: JSON.stringify(product) }),
  createBatch: (batch) =>
    request("/batches", { method: "POST", body: JSON.stringify(batch) }),
  getProduct: (id) => request(`/products/${encodeURIComponent(id)}`),
  getBatch: (id) => request(`/batches/${encodeURIComponent(id)}`),
  history: (id) => request(`/batches/${encodeURIComponent(id)}/history`),
  shipment: (id, body) =>
    request(`/batches/${encodeURIComponent(id)}/shipment`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  transfer: (id, body) =>
    request(`/batches/${encodeURIComponent(id)}/transfer`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  receive: (id, body) =>
    request(`/batches/${encodeURIComponent(id)}/receive`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  verify: (id) =>
    request(`/batches/${encodeURIComponent(id)}/verify`, { method: "POST" }),
  dispense: (id) =>
    request(`/batches/${encodeURIComponent(id)}/dispense`, { method: "POST" }),
  compliance: (id, body) =>
    request(`/batches/${encodeURIComponent(id)}/compliance`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  privacyBatch: (id) => request(`/privacy/batches/${encodeURIComponent(id)}`),
  validateEvent: (event) =>
    request("/interoperability/validate", {
      method: "POST",
      body: JSON.stringify(event)
    }),
  publishEvent: (event) =>
    request("/interoperability/events", {
      method: "POST",
      body: JSON.stringify(event)
    }),
  anchors: () => request("/cross-ledger/anchors"),
  anchor: (body) =>
    request("/cross-ledger/anchor", { method: "POST", body: JSON.stringify(body) }),
  uploadDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/documents/upload", { method: "POST", body: form });
  }
};
