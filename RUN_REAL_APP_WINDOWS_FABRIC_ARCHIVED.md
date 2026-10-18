# Run PharmaTrace on Windows – real application mode

## 1. Install prerequisites
- Node.js 24 LTS
- Docker Desktop with WSL2 integration
- A Hyperledger Fabric 2.x local or remote network with Gateway access

## 2. Start infrastructure
Open PowerShell:
```powershell
cd "C:\Users\N I T R O 5\Downloads\pharma-blockchain-traceability-capstone-complete\pharma-blockchain-traceability-capstone-complete"
docker compose up -d
```

Verify:
```powershell
docker compose ps
```

## 3. Backend configuration
```powershell
cd ".\backend"
Copy-Item ".env.example" ".env"
notepad .env
```

Set a strong `JWT_SECRET` and the real Fabric certificate/key/TLS paths for each organization. Keep:
```env
FABRIC_MODE=fabric
USE_POSTGRES=true
```

## 4. Initialize database
```powershell
npm install
npm run db:init
```

## 5. Verify authentication
The local seed creates four organization accounts. Credentials are only intended for local development and must be replaced for a shared deployment.

## 6. Start API
```powershell
npm test
npm run dev
```

Check:
```text
http://localhost:4000/api/health
```

The response should identify `ledger: hyperledger-fabric`.

## 7. Start React UI
Open a second PowerShell:
```powershell
cd "C:\Users\N I T R O 5\Downloads\pharma-blockchain-traceability-capstone-complete\pharma-blockchain-traceability-capstone-complete\frontend"
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## 8. Authentication flow
The UI now requires username + password. There are no role-bypass buttons and no client-supplied role selector. The API checks the JWT role and the organization identity associated with the authenticated account.

## 9. Organization-to-Fabric identity mapping
The Fabric Gateway selects a certificate set from the authenticated account's `mspId`:
- ManufacturerMSP
- DistributorMSP
- PharmacyMSP
- RegulatorMSP

This allows the same application to submit transactions using the correct organization identity when the four identity configurations are populated.

## 10. End-to-end acceptance test
1. Manufacturer signs in and creates a product.
2. Manufacturer creates a batch.
3. Manufacturer records shipment and transfers custody to Distributor.
4. Distributor signs in, receives and verifies the batch.
5. Distributor transfers to Pharmacy.
6. Pharmacy receives, verifies and dispenses.
7. Regulator signs in and publishes a compliance decision.
8. Every step is checked against the Fabric ledger and transaction history.

Do not report transaction latency, TPS, integrity, or interoperability figures until the corresponding real experiments have been executed against the configured Fabric network.
