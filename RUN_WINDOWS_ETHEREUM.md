# PharmaTrace — Windows-only Ethereum runbook

This project is the Ethereum/Hardhat implementation. The old Fabric files are archived and are not required to run the application.

## Requirements

- Windows 10/11
- Node.js 22.10+ or Node.js 24 LTS
- Docker Desktop
- PowerShell

No Ubuntu or WSL is required.

## 1. Extract the project

Use a fresh directory such as:

```text
C:\Users\<your-user>\Downloads\pharma-traceability-blockchain-ethereum
```

Do not continue using an older copy after changing the contract. A fresh folder prevents stale artifacts and stale deployment files from being mixed together.

## 2. Start PostgreSQL and IPFS

From the project root:

```powershell
docker compose up -d
```

Check that Docker reports `postgres` and `ipfs` as running.

## 3. Install and compile the contract

```powershell
cd blockchain
npm install
npm run compile
npm run check
cd ..
```

The Solidity contract requires a 64-character SHA-256 document hash when a batch is created.

## 4. Start Hardhat

Open PowerShell 1 and keep it open:

```powershell
cd "C:\Users\<your-user>\Downloads\pharma-traceability-blockchain-ethereum"
npm run blockchain:node
```

The local RPC is:

```text
http://127.0.0.1:8545
```

Do not close or restart this process after deployment unless you are intentionally starting a fresh blockchain. Hardhat local state is reset when the node is restarted.

## 5. Deploy the contract

Open PowerShell 2:

```powershell
cd "C:\Users\<your-user>\Downloads\pharma-traceability-blockchain-ethereum"
npm run blockchain:deploy
npm run blockchain:check:runtime
npm run blockchain:smoke
```

`npm run blockchain:smoke` creates a unique test product/batch and exercises the complete lifecycle: manufacture → shipment → transfer → receive → verify → compliance rejection/approval → re-verification → dispense → history-integrity check.

## 6. Configure the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run db:init
npm run dev
```

Leave PowerShell 2 running.

## 7. Start the frontend

Open PowerShell 3:

```powershell
cd "C:\Users\<your-user>\Downloads\pharma-traceability-blockchain-ethereum\frontend"
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Local accounts

For local research/demo only:

| Username | Password | Role |
|---|---|---|
| manufacturer | Manufacturer123! | MANUFACTURER |
| distributor | Distributor123! | DISTRIBUTOR |
| pharmacy | Pharmacy123! | PHARMACY |
| regulator | Regulator123! | REGULATOR |

The Ethereum identities are derived from the local Hardhat development mnemonic and must never be reused as production keys.

## Common failure: `could not decode result data (value="0x")`

This means the backend has a contract address, but there is no contract bytecode at that address on the currently running Hardhat node. The usual cause is that the Hardhat node was restarted after deployment.

Fix it with PowerShell 2:

```powershell
npm run blockchain:deploy
npm run blockchain:check:runtime
```

Then restart the backend so it picks up the current deployment file.

## Common failure: contract compilation type errors

Make sure you extracted the corrected project into a new folder and compile the contract from that copy:

```powershell
cd blockchain
npm install
npm run compile
```

The corrected contract compares Solidity strings by hashing their byte representation, e.g. `keccak256(bytes(a)) != keccak256(bytes(b))`.
