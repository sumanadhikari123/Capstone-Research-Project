export class TraceabilityStateMachine {
  static transfer(batch) {
    if (!['MANUFACTURED', 'RECEIVED'].includes(batch.status)) {
      throw new Error(`Cannot transfer batch from status ${batch.status}`);
    }
  }

  static receive(batch) {
    if (batch.status !== 'IN_TRANSIT') {
      throw new Error('Batch is not currently in transit');
    }
  }

  static dispense(batch) {
    if (batch.status !== 'RECEIVED') {
      throw new Error('Batch must be received before dispensing');
    }
    if (!String(batch.verificationStatus || '').startsWith('VERIFIED')) {
      throw new Error('Batch must be verified before dispensing');
    }
    if (batch.complianceStatus === 'NON_COMPLIANT') {
      throw new Error('Non-compliant batch cannot be dispensed');
    }
  }
}
