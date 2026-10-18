import crypto from 'node:crypto';

const fieldsByRole = {
  PUBLIC: ['productId', 'batchId', 'status', 'verificationStatus', 'currentLocation'],
  DISTRIBUTOR: ['productId', 'batchId', 'status', 'verificationStatus', 'currentLocation', 'currentOwner', 'expiryDate'],
  PHARMACY: ['productId', 'batchId', 'status', 'verificationStatus', 'currentLocation', 'expiryDate', 'complianceStatus'],
  REGULATOR: null
};

export class PrivacyService {
  disclose(record, audienceRole = 'PUBLIC') {
    const allowed = fieldsByRole[audienceRole] ?? fieldsByRole.PUBLIC;
    if (allowed === null) return structuredClone(record);
    return Object.fromEntries(allowed.filter(k => k in record).map(k => [k, record[k]]));
  }

  commitment(value, salt = crypto.randomBytes(16).toString('hex')) {
    const commitment = crypto.createHash('sha256').update(`${salt}:${JSON.stringify(value)}`).digest('hex');
    return { algorithm: 'SHA-256', commitment, salt };
  }

  verifyCommitment(value, commitment, salt) {
    const calculated = crypto.createHash('sha256').update(`${salt}:${JSON.stringify(value)}`).digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(commitment)) return false;
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(commitment));
  }
}
