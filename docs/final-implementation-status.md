# Implementation Status — Ethereum/Hardhat version

## Implemented in source code

- Node.js/Express backend with layered service/repository architecture
- JWT authentication and role-based authorization
- Manufacturer, Distributor, Pharmacy and Regulator roles
- Ethereum/EVM ledger integration through JSON-RPC and ethers.js
- Solidity smart contract for products, batches, shipments, custody transfer, receipt, verification, compliance and dispensing
- On-chain hash-linked trace-event history and integrity verification
- Shipment-before-transfer enforcement
- SHA-256 document digest validation
- Compliance decisions that force re-verification
- PostgreSQL metadata persistence path
- IPFS document upload with fallback handling
- Standard JSON Schema interoperability validation
- Cross-ledger hash-anchor simulator
- Role-based selective disclosure
- SHA-256 commitment utility
- Educational Schnorr proof-of-knowledge demonstration
- React/Vite operational dashboard
- Runtime checks for stale or missing Ethereum deployments
- Automated Ethereum lifecycle smoke-test script

## Validation status

The source code has been statically checked for JavaScript syntax and the React JSX file can be transpiled by the TypeScript parser without diagnostics in this build workspace.

The local npm registry/network available to this build workspace did not complete dependency installation, so the final Hardhat compile and live Ethereum smoke test could not be executed here. Those commands are included in the project and must be run on the Windows development machine.

## Evidence rule

Do not report Ethereum performance numbers, transaction counts, TPS, latency, or end-to-end results as research findings until the supplied compile, deployment, smoke-test and benchmark commands have actually been executed and their outputs recorded.
