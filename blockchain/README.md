# PharmaTrace Ethereum / Hardhat Blockchain Layer

This version replaces the Hyperledger Fabric integration with an Ethereum/EVM implementation based on a local Hardhat network.

## What is real here?

- Hardhat runs a real local EVM JSON-RPC node on `http://127.0.0.1:8545`.
- `PharmaTraceability.sol` is compiled and deployed to that node.
- Product, batch, shipment, transfer, receive, verification, dispense and compliance actions are signed Ethereum transactions.
- OpenZeppelin `AccessControl` enforces Manufacturer, Distributor, Pharmacy and Regulator permissions on-chain.
- Batch history includes a hash chain for independent integrity verification.
- PostgreSQL and IPFS remain off-chain services.
- The REST interoperability layer and privacy services remain application-level services.

## Research boundary

This is a local Ethereum/Hardhat research environment, not a public Ethereum mainnet deployment. Gas, throughput, privacy and latency results must be reported as measurements of this local network and not generalized to Ethereum mainnet.
