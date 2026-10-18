# PharmaTrace — Standardized Blockchain Framework for Pharmaceutical Supply Chain Traceability

PharmaTrace is a Windows-native research prototype implementing pharmaceutical supply-chain traceability on a local Ethereum-compatible blockchain. It combines Ethereum/Hardhat, a Node.js/Express API, PostgreSQL metadata, IPFS document storage, role-based access control, privacy utilities, interoperability validation, and an audit-oriented web interface.

## Architecture

```text
React + Vite
     │
     ▼
Node.js / Express API
     │
     ├── Ethereum / Hardhat  ──► PharmaTraceability.sol
     │
     ├── PostgreSQL           ──► metadata / application audit
     │
     ├── IPFS                 ──► supporting documents
     │
     └── Interoperability     ──► JSON Schema trace events
```

The blockchain is the source of truth for lifecycle state and trace events. PostgreSQL stores application metadata only; sensitive documents are stored off-chain, with their SHA-256 digest recorded on-chain.

## Main lifecycle

1. Manufacturer registers a product.
2. Manufacturer creates a batch with a SHA-256 supporting-document hash.
3. Current owner creates a shipment for a registered distributor/pharmacy.
4. Current owner transfers custody to the shipment destination.
5. Recipient confirms receipt.
6. Authorised stakeholder verifies the batch.
7. Regulator can publish a compliance decision.
8. Compliance changes force re-verification.
9. Pharmacy dispenses only a received, verified, compliant batch.
10. The smart contract validates the hash-linked event history.

## Important implementation safeguards

- Solidity strings are compared through `keccak256(bytes(...))` to avoid Solidity string-comparison compile errors.
- The backend checks that the configured deployment address actually contains bytecode.
- Deployment metadata is refreshed automatically when the deployment file changes.
- Custody transfer requires a previously created shipment for the same recipient.
- Batch verification requires a valid 64-character SHA-256 digest.
- Compliance updates invalidate previous verification and require re-verification.
- Backend errors map common smart-contract reverts to useful HTTP status codes.
- The UI no longer permanently disables the batch-search button.
- History distinguishes the Ethereum transaction hash from the contract event hash.

## Run on Windows

See [`RUN_WINDOWS_ETHEREUM.md`](RUN_WINDOWS_ETHEREUM.md) for the exact PowerShell workflow.

## Key commands

From the project root:

```powershell
npm run blockchain:node
npm run blockchain:compile
npm run blockchain:deploy
npm run blockchain:check
npm run blockchain:check:runtime
npm run blockchain:smoke
npm run backend:db:init
npm run backend:dev
npm run frontend:dev
```

Run the commands in the order described in the Windows runbook.

## Research note

The local Hardhat chain and deterministic development accounts are for research/demo validation only. This project is not a production pharmaceutical blockchain network and should not be used with real private keys or real patient/pharmaceutical records.
