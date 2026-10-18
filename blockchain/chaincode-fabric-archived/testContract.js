const test = require('node:test');
const assert = require('node:assert/strict');

// Structural tests only; Fabric runtime tests should be executed after deployment.
test('chaincode export exposes the pharmaceutical contract', () => {
  const { PharmaTraceabilityContract } = require('./contract');
  assert.equal(typeof PharmaTraceabilityContract, 'function');
});

test('required transactions are defined', () => {
  const { PharmaTraceabilityContract } = require('./contract');
  const required = [
    'CreateProduct', 'CreateBatch', 'ReadProduct', 'ReadBatch',
    'TransferBatch', 'ReceiveBatch', 'VerifyBatch', 'DispenseBatch',
    'GetBatchHistory', 'UpdateComplianceStatus'
  ];
  for (const name of required) {
    assert.equal(typeof PharmaTraceabilityContract.prototype[name], 'function', name);
  }
});
