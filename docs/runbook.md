# PharmaTrace operational runbook — Windows / Ethereum

1. Start Docker Desktop.
2. From the project root, run `docker compose up -d`.
3. In PowerShell 1, run `npm run blockchain:node` and leave it running.
4. In PowerShell 2, run `npm run blockchain:compile` and `npm run blockchain:check`.
5. In PowerShell 2, run `npm run blockchain:deploy`.
6. Run `npm run blockchain:check:runtime` to ensure the deployment address contains bytecode on chain 31337.
7. Run `npm run blockchain:smoke` before collecting research evidence.
8. Copy `backend/.env.example` to `backend/.env`, then run `npm run backend:db:init`.
9. Start the API with `npm run backend:dev`.
10. Start the React UI with `npm run frontend:dev`.
11. Authenticate as Manufacturer, Distributor, Pharmacy or Regulator and execute the lifecycle through the UI.
12. Record actual transaction hashes, block numbers, gas use, event hashes and integrity results from the live environment.
13. Run performance/interoperability experiments separately and save the actual CSV output; do not invent benchmark values.

The Hardhat local chain is stateful only while its node process is running. Restarting the node resets the deployed state, so deployment must be repeated before using the backend again.
