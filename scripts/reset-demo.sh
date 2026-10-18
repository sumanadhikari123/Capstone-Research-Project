#!/usr/bin/env bash
set -e
cat > backend/data/demo-ledger.json <<'JSON'
{
  "products": {},
  "batches": {},
  "history": {}
}
JSON
echo "Demo ledger reset."
