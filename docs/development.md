# Week Development Documentation

## 1. Proposed solution

The prototype implements a permissioned pharmaceutical traceability architecture with five functional areas:

1. Presentation – role-based React dashboard.
2. Application – Node.js/Express API.
3. Interoperability – standardized JSON event schema, validation and REST exchange.
4. Blockchain – Ethereum/Hardhat chaincode and Ethereum JSON-RPC integration.
5. Data/off-chain storage – PostgreSQL schema and IPFS document integration.

## 2. User roles

### Manufacturer
- Register product
- Create batch
- Attach document hash
- Initiate transfer

### Distributor
- Receive batch
- Verify batch
- Transfer batch

### Pharmacy
- Receive batch
- Verify batch
- Support dispensing workflow

### Regulator
- Query traceability history
- Verify batch
- Update compliance status
- Review alerts

## 3. Core traceability state progression

```text
MANUFACTURED
      ↓
IN_TRANSIT
      ↓
RECEIVED
      ↓
VERIFIED
      ↓
DISPENSED / CLOSED (future implementation event)
```

## 4. Standard interoperability message

The schema is in `interoperability/schema/trace-event.schema.json`.

The same structure is intended for cross-system requests and responses. The endpoint:

```text
POST /api/interoperability/validate
POST /api/interoperability/events
```

provides the first practical demonstration of the proposed standardized interoperability mechanism.

## 5. Development milestones

### Milestone 1 – Core MVP
- Authentication
- Product registration
- Batch creation
- Batch query
- History

### Milestone 2 – Supply-chain movement
- Transfer
- Receive
- Verification

### Milestone 3 – Interoperability
- Standard JSON schema
- Validation
- Cross-system publish endpoint

### Milestone 4 – Data integrity
- SHA-256 document hash
- IPFS/CID integration

### Milestone 5 – Research evaluation
- API benchmark
- Blockchain benchmark in Ethereum mode
- Interoperability test
- Integrity test
- Role-based access-control tests
- User evaluation, only after required ethics approval

## 6. Experimental analysis

### Technical performance
Measure:
- TPS
- average latency
- p95 latency
- success/failure rate
- CPU
- memory

### Interoperability
Measure:
- valid message acceptance
- invalid message rejection
- exchange success rate
- response time

### Data integrity
Measure:
- hash match
- tamper/mismatch detection

### Access control
Measure:
- permitted operations accepted
- prohibited operations rejected

## 7. Research-question alignment

| Research question | Technical evidence |
|---|---|
| RQ1 | Requirements and stakeholder findings |
| RQ2 | Hybrid architecture, interoperability tests, performance results |
| RQ3 | Benchmark protocol and measured metrics |
| RQ4 | TAM-based survey and interviews, subject to ethics approval |

## 8. Honest-results policy

The project must not insert hypothetical performance results as if they were measured results. Proposal thresholds such as 500 TPS or 2-second latency should remain targets until the actual experiment is completed.

## 9. Current limitation

The local demo mode is designed to enable application development before the Hardhat local EVM network is available. Final blockchain performance and distributed-consensus claims must be measured in actual Ethereum mode using a documented test environment.
