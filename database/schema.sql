CREATE TABLE IF NOT EXISTS organizations (
  organization_id VARCHAR(80) PRIMARY KEY,
  organization_name VARCHAR(200) NOT NULL,
  organization_type VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(80) PRIMARY KEY,
  organization_id VARCHAR(80) NOT NULL REFERENCES organizations(organization_id),
  username VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL CHECK(role IN ('MANUFACTURER','DISTRIBUTOR','PHARMACY','REGULATOR')),
  msp_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS msp_id VARCHAR(120);

CREATE TABLE IF NOT EXISTS product_metadata (
  product_id VARCHAR(120) PRIMARY KEY,
  manufacturer_id VARCHAR(80) NOT NULL,
  product_name VARCHAR(250) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_metadata (
  document_id UUID PRIMARY KEY,
  batch_id VARCHAR(120),
  filename VARCHAR(250) NOT NULL,
  cid TEXT,
  sha256_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_audit (
  event_id VARCHAR(120) PRIMARY KEY,
  tx_id VARCHAR(120),
  event_type VARCHAR(80) NOT NULL,
  actor_org VARCHAR(80) NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_tx ON application_audit(tx_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON application_audit(actor_org);

CREATE TABLE IF NOT EXISTS batch_metadata (
  batch_id VARCHAR(120) PRIMARY KEY,
  product_id VARCHAR(120) NOT NULL,
  manufacturer_id VARCHAR(80) NOT NULL,
  current_location VARCHAR(250),
  expiry_date DATE,
  document_hash CHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
