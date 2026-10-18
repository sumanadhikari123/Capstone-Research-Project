import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import Icon from "./icons";

const roleMeta = {
  MANUFACTURER: { label: "Manufacturer", tone: "violet", soft: "violet-soft", icon: "package", description: "Create products, batches and outbound shipments." },
  DISTRIBUTOR: { label: "Distributor", tone: "blue", soft: "blue-soft", icon: "truck", description: "Receive, verify and transfer pharmaceutical batches." },
  PHARMACY: { label: "Pharmacy", tone: "green", soft: "green-soft", icon: "flask", description: "Receive, verify and safely dispense verified stock." },
  REGULATOR: { label: "Regulator", tone: "amber", soft: "amber-soft", icon: "shield", description: "Review lineage and publish compliance decisions." }
};

const initialProduct = { productId: "", productName: "", description: "" };
const initialBatch = { batchId: "", productId: "", location: "", expiryDate: "", documentHash: "" };

function roleInfo(role) {
  return roleMeta[role] || { label: role || "User", tone: "blue", soft: "blue-soft", icon: "shield", description: "Authenticated network user." };
}

function statusTone(status) {
  if (!status) return "neutral";
  if (["COMPLIANT", "VERIFIED", "VERIFIED_METADATA_ONLY", "RECEIVED", "DISPENSED", "HEALTHY"].includes(status)) return "success";
  if (["IN_TRANSIT", "UNDER_REVIEW", "PENDING", "MANUFACTURED"].includes(status)) return "warning";
  if (["NON_COMPLIANT", "REJECTED", "FAILED"].includes(status)) return "danger";
  return "info";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function truncate(value, head = 10, tail = 8) {
  if (!value || value.length <= head + tail + 3) return value || "—";
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function Button({ children, variant = "primary", icon, className = "", disabled, onClick, type = "button" }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} disabled={disabled} onClick={onClick}>{icon && <Icon name={icon} size={16}/>}<span>{children}</span></button>;
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}><span className="badge-dot"/>{children}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text", textarea = false, helper, required = false }) {
  return <label className="field"><span className="field-label">{label}{required && <em>*</em>}</span>{textarea ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}/> : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}/>} {helper && <span className="field-helper">{helper}</span>}</label>;
}

function Card({ eyebrow, title, subtitle, children, action, className = "" }) {
  return <section className={`card ${className}`}><div className="card-head"><div>{eyebrow && <span className="card-eyebrow">{eyebrow}</span>}<h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

function Stat({ icon, label, value, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon} size={18}/></div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function EmptyState({ icon = "search", title, text, compact = false }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}><div className="empty-icon"><Icon name={icon} size={22}/></div><strong>{title}</strong><span>{text}</span></div>;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return token && user ? { token, user } : null;
    } catch { return null; }
  });
  const [network, setNetwork] = useState({ status: "checking", ethereumStatus: "checking", chainId: null, contractAddress: "", error: "" });
  const [active, setActive] = useState("overview");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [productForm, setProductForm] = useState(initialProduct);
  const [batchForm, setBatchForm] = useState(initialBatch);
  const [transferForm, setTransferForm] = useState({ recipientOrganizationId: "", location: "" });
  const [shipmentForm, setShipmentForm] = useState({ destinationOrganizationId: "", trackingNumber: "" });
  const [receiveLocation, setReceiveLocation] = useState("Auckland");
  const [compliance, setCompliance] = useState({ complianceStatus: "COMPLIANT", note: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const role = session?.user?.role;
  const meta = roleInfo(role);

  const nav = useMemo(() => [
    ["overview", "grid", "Overview"],
    ["traceability", "activity", "Traceability"],
    ...(role === "MANUFACTURER" ? [["manufacture", "package", "Manufacturing"]] : []),
    ...(["MANUFACTURER", "DISTRIBUTOR"].includes(role) ? [["logistics", "send", "Logistics"]] : []),
    ...(["DISTRIBUTOR", "PHARMACY"].includes(role) ? [["receiving", "truck", "Receiving"]] : []),
    ...(["DISTRIBUTOR", "PHARMACY", "REGULATOR"].includes(role) ? [["verification", "shieldCheck", "Verification"]] : []),
    ...(role === "PHARMACY" ? [["dispense", "flask", "Dispensing"]] : []),
    ...(role === "REGULATOR" ? [["compliance", "shield", "Compliance"]] : []),
  ], [role]);

  useEffect(() => {
    const refreshHealth = () => {
      api.health()
        .then(h => setNetwork({
          status: h.status,
          ethereumStatus: h.ethereum?.status || "unavailable",
          chainId: h.ethereum?.chainId ?? null,
          contractAddress: h.ethereum?.contractAddress ?? "",
          error: h.ethereum?.error || ""
        }))
        .catch(e => setNetwork({
          status: "offline",
          ethereumStatus: "unavailable",
          chainId: null,
          contractAddress: "",
          error: e.message || "API unavailable"
        }));
    };
    const onAuthExpired = () => {
      setSession(null);
      setBatch(null);
      setHistory([]);
      setError("Your session has expired. Please sign in again.");
    };
    refreshHealth();
    const timer = window.setInterval(refreshHealth, 10000);
    window.addEventListener("pharmatrace:auth-expired", onAuthExpired);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pharmatrace:auth-expired", onAuthExpired);
    };
  }, []);

  const stats = useMemo(() => ({
    events: history.length,
    status: batch?.status || "—",
    verification: batch?.verificationStatus || "PENDING",
    compliance: batch?.complianceStatus || "PENDING"
  }), [batch, history]);

  const progress = useMemo(() => {
    const sequence = ["MANUFACTURED", "IN_TRANSIT", "RECEIVED", "DISPENSED"];
    const i = sequence.indexOf(batch?.status);
    return i < 0 ? 0 : Math.round(((i + 1) / sequence.length) * 100);
  }, [batch]);

  function feedbackClear() { setMessage(""); setError(""); }

  async function run(action, successText = "Transaction completed") {
    feedbackClear();
    setLoading(true);
    try {
      const result = await action();
      setMessage(successText);
      return result;
    } catch (e) {
      setError(e.message || "Request failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function login(e) {
    e.preventDefault();
    try {
      const result = await run(() => api.login(loginForm.username.trim(), loginForm.password), "Secure session established");
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setSession(result);
      setActive("overview");
      setLoginForm({ username: "", password: "" });
    } catch {}
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
    setBatch(null);
    setHistory([]);
    setMessage("");
    setError("");
  }

  async function loadBatch(id = batchId, switchView = true) {
    if (!id.trim()) { setError("Enter a batch ID first."); return; }
    try {
      const result = await run(() => api.getBatch(id), "Batch record loaded");
      setBatch(result);
      setBatchId(id);
      const h = await api.history(id);
      setHistory(Array.isArray(h) ? h : []);
      if (switchView) setActive("traceability");
    } catch {}
  }

  async function execute(action, successText) {
    try {
      const result = await run(action, successText);
      if (batchId) await loadBatch(batchId, false);
      return result;
    } catch {}
  }

  if (!session) {
    return <main className="login-page">
      <div className="login-art">
        <div className="art-orb orb-one"/><div className="art-orb orb-two"/>
        <div className="brand-lockup"><div className="logo-mark"><Icon name="link" size={21}/></div><div><strong>PHARMA<span>TRACE</span></strong><small>Interoperable Supply Chain</small></div></div>
        <div className="login-hero-copy">
          <span className="kicker">BLOCKCHAIN-POWERED PHARMACEUTICAL OPERATIONS</span>
          <h1>Trace every batch.<br/><span>Verify every handoff.</span></h1>
          <p>A secure operational workspace for pharmaceutical manufacturers, distributors, pharmacies and regulators.</p>
          <div className="proof-grid"><div><div className="proof-icon"><Icon name="shieldCheck" size={17}/></div><strong>Tamper-evident</strong><span>Ledger-backed lineage</span></div><div><div className="proof-icon"><Icon name="link" size={17}/></div><strong>Interoperable</strong><span>Standardized trace events</span></div><div><div className="proof-icon"><Icon name="lock" size={17}/></div><strong>Role controlled</strong><span>Authenticated access</span></div></div>
        </div>
        <div className="art-footer"><span>PharmaTrace Framework</span><span>Ethereum • Secure Access</span></div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <div className="mobile-brand"><div className="logo-mark"><Icon name="link" size={19}/></div><strong>PHARMA<span>TRACE</span></strong></div>
          <div className="login-title"><span className="kicker purple">SECURE WORKSPACE</span><h2>Welcome back</h2><p>Sign in with your organization account to continue.</p></div>
          {error && <div className="alert alert-danger"><Icon name="warning" size={17}/><span>{error}</span></div>}
          <form className="login-form" onSubmit={login}>
            <Field label="Username" value={loginForm.username} onChange={v => setLoginForm({ ...loginForm, username: v })} placeholder="Enter your username" required/>
            <Field label="Password" type="password" value={loginForm.password} onChange={v => setLoginForm({ ...loginForm, password: v })} placeholder="Enter your password" required/>
            <Button type="submit" disabled={loading} className="login-submit" icon="arrow">{loading ? "Authenticating…" : "Sign in securely"}</Button>
          </form>
          <div className="login-security"><div className="security-icon"><Icon name="lock" size={16}/></div><div><strong>Protected authentication</strong><p>Credentials are verified server-side and sessions are issued with signed JWT tokens.</p></div></div>
          <div className="dev-hint">Local development accounts are provisioned in the backend database initializer.</div>
        </div>
      </div>
    </main>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="logo-mark"><Icon name="link" size={20}/></div><div><strong>PHARMA<span>TRACE</span></strong><small>Supply Chain Network</small></div></div>
      <div className={`org-panel ${meta.soft}`}><div className={`role-icon ${meta.tone}`}><Icon name={meta.icon} size={19}/></div><div><strong>{meta.label}</strong><span>{session.user.organizationId}</span></div><div className="online-dot" title="Authenticated"/></div>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav">{nav.map(([id, icon, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><span className="nav-symbol"><Icon name={icon} size={17}/></span><span>{label}</span>{active === id && <Icon name="chevron" size={15} className="nav-chevron"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className={`network-card ${network.ethereumStatus === "connected" ? "online" : ""}`}><div className="network-icon"><Icon name="pulse" size={16}/></div><div><strong>Ethereum local</strong><span>{network.ethereumStatus === "connected" ? `Chain ${network.chainId ?? "local"} • Connected` : "Connection unavailable"}</span></div><span className="network-light"/></div>
        <div className="sidebar-meta"><span>PharmaTrace</span><span>v2.0</span></div>
        <button className="signout" onClick={logout}><Icon name="logout" size={16}/><span>Sign out</span></button>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div><span className="top-kicker"><span className={`role-dot ${meta.tone}`}/>{meta.label.toUpperCase()} WORKSPACE</span><h1>{nav.find(item => item[0] === active)?.[2] || "Overview"}</h1></div>
        <div className="topbar-right"><button className="round-btn" onClick={() => batchId ? loadBatch(batchId, false) : setMessage("Dashboard refreshed")} aria-label="Refresh"><Icon name="refresh" size={17}/></button><div className="user-chip"><div className={`user-avatar ${meta.soft}`}>{session.user.username.charAt(0).toUpperCase()}</div><div><strong>{session.user.username}</strong><span>{meta.label}</span></div></div></div>
      </header>

      <div className="content-wrap">
        {message && <div className="alert alert-success"><Icon name="check" size={16}/><span>{message}</span><button onClick={() => setMessage("")}>×</button></div>}
        {error && <div className="alert alert-danger"><Icon name="warning" size={16}/><span>{error}</span><button onClick={() => setError("")}>×</button></div>}

        <section className="hero-banner">
          <div className="hero-copy"><span className="hero-pill"><span className="live-dot"/>LIVE TRACEABILITY</span><h2>Hello, {session.user.username}.</h2><p>{meta.description}</p><div className="hero-actions"><Button icon="search" onClick={() => setActive("traceability")}>Open batch explorer</Button><button className="hero-link" onClick={() => setActive(role === "MANUFACTURER" ? "manufacture" : role === "REGULATOR" ? "compliance" : "verification")}>Go to primary action <Icon name="arrow" size={14}/></button></div></div>
          <div className="hero-network"><div className="hero-network-top"><span><span className="network-light"/> Network status</span><Badge tone={network.ethereumStatus === "connected" ? "success" : "danger"}>{network.ethereumStatus === "connected" ? "Connected" : "Offline"}</Badge></div><div className="hero-network-value">{network.chainId ? `Chain ${network.chainId}` : "Local EVM"}</div>{network.error && <span className="hero-contract error-text">{network.error}</span>}<span className="hero-contract">Contract {truncate(network.contractAddress, 12, 7)}</span></div>
        </section>

        <div className="stats-grid"><Stat icon="activity" label="Ledger events" value={stats.events} tone="violet"/><Stat icon="package" label="Batch status" value={stats.status} tone="blue"/><Stat icon="shieldCheck" label="Verification" value={stats.verification} tone="green"/><Stat icon="shield" label="Compliance" value={stats.compliance} tone="amber"/></div>

        {active === "overview" && <Overview role={role} batchId={batchId} setBatchId={setBatchId} loadBatch={loadBatch} batch={batch} history={history} progress={progress} setActive={setActive} loading={loading} />}
        {active === "traceability" && <Card eyebrow="LEDGER EXPLORER" title="Traceability record" subtitle="Inspect the current state and immutable event lineage for a pharmaceutical batch."><BatchSearch batchId={batchId} setBatchId={setBatchId} onSearch={() => loadBatch()} loading={loading}/>{batch ? <BatchView batch={batch} history={history}/> : <EmptyState icon="search" title="No batch selected" text="Enter a batch identifier above to inspect its current state and transaction lineage."/>}</Card>}

        {active === "manufacture" && role === "MANUFACTURER" && <div className="split-grid"><Card eyebrow="PRODUCT MASTER" title="Register pharmaceutical product" subtitle="Create the authoritative product record used by downstream batches."><Field label="Product ID" value={productForm.productId} onChange={v => setProductForm({ ...productForm, productId: v })} placeholder="MED-2026-001" required/><Field label="Product name" value={productForm.productName} onChange={v => setProductForm({ ...productForm, productName: v })} placeholder="Amoxicillin 500mg" required/><Field label="Description" textarea value={productForm.description} onChange={v => setProductForm({ ...productForm, description: v })} placeholder="Product description and handling information"/><Button icon="plus" disabled={loading} onClick={async () => { try { await run(() => api.createProduct(productForm), "Product registered on Ethereum"); setProductForm(initialProduct); } catch {} }}>Register product</Button></Card><Card eyebrow="PRODUCTION" title="Create production batch" subtitle="Create a traceable lot with a SHA-256 supporting document hash for later verification."><Field label="Batch ID" value={batchForm.batchId} onChange={v => setBatchForm({ ...batchForm, batchId: v })} placeholder="BATCH-2026-001" required/><Field label="Product ID" value={batchForm.productId} onChange={v => setBatchForm({ ...batchForm, productId: v })} placeholder="MED-2026-001" required/><Field label="Manufacturing location" value={batchForm.location} onChange={v => setBatchForm({ ...batchForm, location: v })} placeholder="Auckland manufacturing site"/><Field label="Expiry date" type="date" value={batchForm.expiryDate} onChange={v => setBatchForm({ ...batchForm, expiryDate: v })}/><label className="file-field"><span className="field-label">Supporting document<em>*</em></span><input type="file" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { const d = await run(() => api.uploadDocument(f), "Document hashed and stored"); setBatchForm({ ...batchForm, documentHash: d.sha256 || d.documentHash || "" }); } catch {} }}/><span className="field-helper">SHA-256: {batchForm.documentHash ? truncate(batchForm.documentHash, 14, 10) : "Upload a document before creating the batch"}</span></label><Button icon="package" disabled={loading || !batchForm.documentHash} onClick={async () => { try { const result = await run(() => api.createBatch({ ...batchForm, manufactureDate: new Date().toISOString() }), "Batch created on Ethereum"); const createdId = result?.batch?.batchId || batchForm.batchId; setBatchId(createdId); setBatchForm(initialBatch); await loadBatch(createdId, true); } catch {} }}>Create batch</Button></Card></div>}

        {active === "logistics" && <div className="split-grid"><Card eyebrow="SHIPMENT" title="Create shipment" subtitle="Record outbound logistics before transferring custody."><BatchSearch batchId={batchId} setBatchId={setBatchId} compact/><Field label="Destination organization" value={shipmentForm.destinationOrganizationId} onChange={v => setShipmentForm({ ...shipmentForm, destinationOrganizationId: v })} placeholder="ORG-DIS-001" required/><Field label="Tracking number" value={shipmentForm.trackingNumber} onChange={v => setShipmentForm({ ...shipmentForm, trackingNumber: v })} placeholder="TRACK-2026-001"/><Button icon="send" disabled={loading} onClick={() => execute(() => api.shipment(batchId, shipmentForm), "Shipment recorded on the ledger")}>Create shipment</Button></Card><Card eyebrow="CUSTODY" title="Transfer batch" subtitle="Move the batch to the next authorised organisation and location."><BatchSearch batchId={batchId} setBatchId={setBatchId} compact/><Field label="Recipient organization" value={transferForm.recipientOrganizationId} onChange={v => setTransferForm({ ...transferForm, recipientOrganizationId: v })} placeholder="ORG-DIS-001 or ORG-PHA-001" required/><Field label="New location" value={transferForm.location} onChange={v => setTransferForm({ ...transferForm, location: v })} placeholder="Auckland distribution centre"/><Button icon="arrow" disabled={loading} onClick={() => execute(() => api.transfer(batchId, transferForm), "Custody transfer recorded")}>Transfer custody</Button></Card></div>}

        {active === "receiving" && <Card eyebrow="RECEIVING" title="Confirm incoming batch" subtitle="Confirm physical receipt and synchronize custody state on the ledger." className="single-card"><BatchSearch batchId={batchId} setBatchId={setBatchId}/><Field label="Receiving location" value={receiveLocation} onChange={setReceiveLocation} placeholder="Auckland facility"/><ActionNotice tone="blue" icon="truck" title="Receipt checkpoint" text="Confirm receipt only when the shipment has physically arrived at the intended organisation."/><Button icon="check" disabled={loading} onClick={() => execute(() => api.receive(batchId, { location: receiveLocation }), "Batch receipt recorded")}>Confirm receipt</Button></Card>}

        {active === "verification" && <Card eyebrow="VERIFICATION" title="Verify pharmaceutical batch" subtitle="Record an authorised verification after reviewing the batch lineage and documentation." className="single-card"><BatchSearch batchId={batchId} setBatchId={setBatchId}/><ActionNotice tone="green" icon="shieldCheck" title="Verification checkpoint" text="Verification is permanently recorded as a ledger transaction and can be inspected in the batch history."/><Button icon="shieldCheck" disabled={loading} onClick={() => execute(() => api.verify(batchId), "Verification recorded on Ethereum")}>Verify batch</Button></Card>}

        {active === "dispense" && role === "PHARMACY" && <Card eyebrow="FINAL RELEASE" title="Dispense pharmaceutical batch" subtitle="Release verified stock only after receipt, verification and compliance checks." className="single-card"><BatchSearch batchId={batchId} setBatchId={setBatchId}/><ActionNotice tone="green" icon="flask" title="Controlled dispensing" text="Only an authorised pharmacy account can perform this final lifecycle action."/><Button variant="success" icon="flask" disabled={loading} onClick={() => execute(() => api.dispense(batchId), "Dispensing recorded on Ethereum")}>Dispense batch</Button></Card>}

        {active === "compliance" && role === "REGULATOR" && <Card eyebrow="REGULATORY CONTROL" title="Compliance decision" subtitle="Publish the regulator's latest compliance state against the selected batch." className="single-card"><BatchSearch batchId={batchId} setBatchId={setBatchId}/><label className="field"><span className="field-label">Compliance status</span><select value={compliance.complianceStatus} onChange={e => setCompliance({ ...compliance, complianceStatus: e.target.value })}><option>COMPLIANT</option><option>UNDER_REVIEW</option><option>NON_COMPLIANT</option></select></label><Field label="Decision note" textarea value={compliance.note} onChange={v => setCompliance({ ...compliance, note: v })} placeholder="Reason for the regulatory decision"/><ActionNotice tone={compliance.complianceStatus === "NON_COMPLIANT" ? "red" : "amber"} icon="shield" title="Regulatory action" text="Compliance changes become part of the traceability record and should include a concise justification."/><Button variant="warning" icon="shield" disabled={loading} onClick={() => execute(() => api.compliance(batchId, compliance), "Compliance decision recorded")}>Publish compliance decision</Button></Card>}
      </div>
    </main>
  </div>;
}

function Overview({ role, batchId, setBatchId, loadBatch, batch, history, progress, setActive, loading }) {
  return <>
    <div className="overview-grid">
      <Card eyebrow="QUICK SEARCH" title="Find a pharmaceutical batch" subtitle="Search the blockchain-backed record using the batch identifier."><BatchSearch batchId={batchId} setBatchId={setBatchId} onSearch={() => loadBatch()} loading={loading}/><div className="quick-links"><button onClick={() => setActive("traceability")}><Icon name="activity" size={14}/>View traceability</button>{role === "MANUFACTURER" && <button onClick={() => setActive("manufacture")}><Icon name="package" size={14}/>Create batch</button>}{["MANUFACTURER","DISTRIBUTOR"].includes(role) && <button onClick={() => setActive("logistics")}><Icon name="send" size={14}/>Manage logistics</button>}{["DISTRIBUTOR","PHARMACY"].includes(role) && <button onClick={() => setActive("receiving")}><Icon name="truck" size={14}/>Receive stock</button>}</div></Card>
      <Card eyebrow="CURRENT RECORD" title="Batch snapshot" subtitle="The latest state loaded from the ledger.">{batch ? <BatchSummary batch={batch} progress={progress}/> : <EmptyState icon="box" title="No batch loaded" text="Your dashboard is ready. Search for a batch to view its latest status." compact/>}</Card>
    </div>
    <Card eyebrow="RECENT ACTIVITY" title="Ledger activity" subtitle="The latest events for the selected batch." className="activity-card">{history.length ? <Timeline history={history.slice(-6).reverse()}/> : <EmptyState icon="clock" title="No recent events" text="Batch events will appear here after you load a record." compact/>}</Card>
  </>;
}

function BatchSearch({ batchId, setBatchId, onSearch, compact = false, loading = false }) {
  return <div className={`batch-search ${compact ? "compact" : ""}`}><div className="search-input"><Icon name="search" size={17}/><input value={batchId} onChange={e => setBatchId(e.target.value)} onKeyDown={e => e.key === "Enter" && onSearch?.()} placeholder="BATCH-2026-001"/><button type="button" aria-label="Clear" onClick={() => setBatchId("")}>×</button></div>{onSearch && <Button icon="search" disabled={loading} onClick={onSearch}>Search</Button>}</div>;
}

function BatchSummary({ batch, progress }) {
  return <div className="batch-summary"><div className="batch-summary-top"><div><span className="mini-label">BATCH ID</span><h3>{batch.batchId}</h3></div><Badge tone={statusTone(batch.status)}>{batch.status || "UNKNOWN"}</Badge></div><div className="summary-progress"><div className="progress-head"><span>Lifecycle progress</span><strong>{progress}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div></div><div className="summary-grid"><div><span>Current owner</span><strong>{batch.currentOwner || "—"}</strong></div><div><span>Location</span><strong>{batch.currentLocation || "—"}</strong></div><div><span>Verification</span><Badge tone={statusTone(batch.verificationStatus)}>{batch.verificationStatus || "PENDING"}</Badge></div><div><span>Compliance</span><Badge tone={statusTone(batch.complianceStatus)}>{batch.complianceStatus || "PENDING"}</Badge></div></div></div>;
}

function BatchView({ batch, history }) {
  const progress = ["MANUFACTURED", "IN_TRANSIT", "RECEIVED", "DISPENSED"].indexOf(batch?.status) + 1;
  const pct = progress > 0 ? Math.round((progress / 4) * 100) : 0;
  return <div className="batch-detail"><BatchSummary batch={batch} progress={pct}/><div className="detail-grid"><div><h3 className="subhead">Batch details</h3><div className="detail-list"><div><span>Product ID</span><strong>{batch.productId || "—"}</strong></div><div><span>Manufacture date</span><strong>{formatDate(batch.manufactureDate)}</strong></div><div><span>Expiry date</span><strong>{batch.expiryDate || "—"}</strong></div><div><span>Document hash</span><code>{truncate(batch.documentHash, 18, 14)}</code></div></div></div><div><h3 className="subhead">Integrity</h3><div className="integrity-panel"><div className="integrity-icon"><Icon name="shieldCheck" size={18}/></div><div><strong>Tamper-evident history</strong><span>{history.length} recorded event{history.length === 1 ? "" : "s"} available for audit.</span></div></div></div></div><div className="divider"/><h3 className="subhead">Immutable event lineage</h3><Timeline history={history}/></div>;
}

function Timeline({ history }) {
  return <div className="timeline">{history.map((item, index) => <div className="timeline-item" key={item.transactionHash || item.eventHash || `${item.eventType || "event"}-${index}`}><div className="timeline-marker"><span><Icon name="check" size={12}/></span></div><div className="timeline-content"><div className="timeline-row"><div><strong>{item.eventType || item.value?.eventType || "LEDGER EVENT"}</strong>{item.actor && <span>{item.actor}</span>}</div><time>{formatDate(item.timestamp)}</time></div>{(item.transactionHash || item.eventHash) && <><div className="tx-line"><Icon name="link" size={12}/><span>Transaction</span><code>{item.transactionHash || "Not indexed"}</code></div><div className="tx-line"><Icon name="shieldCheck" size={12}/><span>Event hash</span><code>{item.eventHash || "—"}</code></div></>}</div></div>)}</div>;
}

function ActionNotice({ tone, icon, title, text }) {
  return <div className={`action-notice ${tone}`}><div className="notice-icon"><Icon name={icon} size={18}/></div><div><strong>{title}</strong><p>{text}</p></div></div>;
}
