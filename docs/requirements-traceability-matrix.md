# Requirements Traceability Matrix

| Proposal requirement | Implementation artifact | Status |
|---|---|---|
| Hybrid on-chain/off-chain architecture | `blockchain/chaincode`, `database/schema.sql`, IPFS service | Implemented baseline |
| Standardized interoperability protocol | `interoperability/schema/trace-event.schema.json`, `/api/interoperability/*` | Implemented baseline |
| Role-based access | JWT middleware + role rules | Implemented baseline |
| Manufacturer workflow | React UI + product/batch API + chaincode | Implemented baseline |
| Distributor workflow | Receive/transfer/verify API + UI | Implemented baseline |
| Pharmacy workflow | Receive/verify API + UI | Implemented baseline |
| Regulator workflow | Verify/compliance API + UI | Implemented baseline |
| Traceability history | Demo ledger history + Ethereum `GetBatchHistory` | Implemented baseline |
| Smart contracts | `blockchain/chaincode/contract.js` | Implemented baseline |
| Ethereum JSON-RPC integration | `backend/src/services/ethereumService.js` | Implemented; network run pending |
| PostgreSQL | `database/schema.sql` + repository | Implemented integration point |
| IPFS | `backend/src/services/ipfs.js` | Implemented integration point |
| Performance evaluation | `experiments/api_benchmark.js` | Ready to run |
| Interoperability evaluation | `experiments/interoperability_test.js` | Ready to run |
| Integrity evaluation | SHA-256 upload/hash path | Ready for integrated test |
| Access-control evaluation | API middleware + test cases | Ready to run |
| TAM/user evaluation | Proposal methodology | Pending ethics approval and participant data collection |
| Final Ethereum benchmark | Hardhat local EVM network | Pending Docker/Ethereum environment |
| Industry-wide deployment | Proposal future direction | Out of prototype scope |

## Research-question evidence

### RQ1
Success factors and barriers are addressed through the requirements/stakeholder research stream. Technical artifacts provide implementation evidence; participant findings require approved empirical data.

### RQ2
The hybrid architecture and interoperability layer are implemented as a prototype. Performance/privacy claims must be supported by the actual experiments.

### RQ3
The benchmark scripts operationalize TPS, latency, success rate, p95 latency, and resource-usage measurements. Final framework tables should use measured results.

### RQ4
TAM remains an empirical evaluation activity requiring ethics approval and actual stakeholder/participant data. No acceptance result should be invented.

## Academic integrity rule

Do not report demo-mode measurements as Ethereum/Hardhat performance results. Clearly label results by execution environment.
