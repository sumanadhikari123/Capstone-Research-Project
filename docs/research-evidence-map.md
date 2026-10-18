# Research Evidence Map

| Research question | Evidence planned / implemented |
|---|---|
| RQ1 | Literature synthesis + stakeholder interview/focus-group protocol. Participant results require ethics approval and real data. |
| RQ2 | Hybrid ledger/off-chain design, standardized JSON protocol, interoperability tests, privacy controls and performance experiments. |
| RQ3 | Evaluation-metric specification plus API/Ethereum/Hardhat benchmark scripts and raw-result templates. |
| RQ4 | TAM questionnaire and interview materials; no synthetic participant results. |

## Technical research artifacts
- Architecture: `docs/figures/system_architecture.png`
- User workflow: `docs/figures/user_workflow.png`
- Sequence: `docs/figures/sequence_diagram.png`
- Verification flowchart: `docs/figures/verification_flowchart.png`
- Interoperability flowchart: `docs/figures/interoperability_flowchart.png`
- Standard JSON: `interoperability/schema/trace-event.schema.json`
- Chaincode: `blockchain/chaincode/contract.js`
- Cross-ledger adapter: `backend/src/services/crossLedger.js`
- Privacy/commitment: `backend/src/services/privacy.js`
- ZK proof demo: `backend/src/services/zkp.js`
