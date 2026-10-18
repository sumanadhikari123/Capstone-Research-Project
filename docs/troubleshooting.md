# PharmaTrace Windows troubleshooting

## Docker connection error

Make sure Docker Desktop is running:

```powershell
docker version
docker compose ps
```

Then start the services:

```powershell
docker compose up -d
```

## Contract compilation fails

Use the Ethereum project copy and reinstall the blockchain dependencies:

```powershell
cd blockchain
npm install
npm run compile
npm run check
```

The current Solidity contract compares dynamic strings through `keccak256(bytes(...))` and validates supporting-document SHA-256 hashes.

## `could not decode result data (value="0x")` or `calling an account which is not a contract`

This means the backend is pointing at an address where the currently running Hardhat node has no contract bytecode. The most common cause is restarting Hardhat after deployment.

Run:

```powershell
npm run blockchain:deploy
npm run blockchain:check:runtime
```

Then restart the backend.

Do not restart the Hardhat node during a demo session unless you plan to deploy again.

## Backend says Ethereum deployment is missing

Confirm the deployment file exists:

```powershell
Test-Path .\blockchain\deployments\localhost.json
```

Then verify the live node and contract:

```powershell
npm run blockchain:check:runtime
```

The expected local chain ID is `31337` and the RPC is `http://127.0.0.1:8545`.

## Backend cannot connect to PostgreSQL

Check:

```powershell
docker compose ps
```

Then initialise the database:

```powershell
cd backend
npm run db:init
```

The application uses Ethereum as the ledger source of truth. PostgreSQL is supporting metadata/audit storage, so a temporary metadata error should not invalidate an already mined blockchain transaction.

## Frontend search button is disabled

Use the current project package. The latest UI ties the Search button to the actual request-loading state instead of keeping it permanently disabled.

## Login fails without PostgreSQL

The current fallback user file uses Node.js scrypt hashes and does not require a live database. With PostgreSQL enabled, `npm run db:init` seeds bcrypt hashes into the database.

## Hardhat dependency installation does not complete

Use a current supported Node.js installation. The supplied Windows setup supports Node.js 22.10+ and Node.js 24 LTS. Retry:

```powershell
cd blockchain
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm run compile
```
