# Cross-Ledger Interoperability Prototype

This component simulates a second ledger maintained by an external stakeholder system. It is intentionally labelled as a simulator: it does not claim to be a production cross-chain bridge.

Workflow:

```text
Source Traceability Event
      ↓
Standard JSON Schema
      ↓
Ledger Adapter
      ↓
External Ledger Simulator
      ↓
Destination Transaction ID
      ↓
Anchor Verification
```

API:

- `POST /api/cross-ledger/anchor`
- `POST /api/cross-ledger/verify`
- `GET /api/cross-ledger/anchors`

The anchor stores the source transaction ID, destination transaction ID and SHA-256 event digest so that the two logical systems can verify that the same standardized event was exchanged.
