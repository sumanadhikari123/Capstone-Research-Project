# Windows setup — PharmaTrace Ethereum version

## Requirements
- Windows 10/11
- Node.js 24.x
- PowerShell
- Docker Desktop (for PostgreSQL and IPFS)
- No Ubuntu installation is required for this project variant.

## Start infrastructure
From the project root:

```powershell
docker compose up -d
```

## Start Ethereum / Hardhat
PowerShell 1:

```powershell
cd "C:\path\to\pharma-blockchain-traceability-capstone-complete"
npm --prefix blockchain install
npm run blockchain:compile
npm run blockchain:node
```

PowerShell 2:

```powershell
cd "C:\path\to\pharma-blockchain-traceability-capstone-complete"
npm run blockchain:deploy
npm run backend:install
npm run backend:db:init
npm run backend:dev
```

PowerShell 3:

```powershell
cd "C:\path\to\pharma-blockchain-traceability-capstone-complete"
npm run frontend:install
npm run frontend:dev
```

Open `http://localhost:5173`.

The local blockchain endpoint is `http://127.0.0.1:8545` and the contract address is written to `blockchain/deployments/localhost.json` by the deployment script.
