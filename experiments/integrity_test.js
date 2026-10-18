import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node experiments/integrity_test.js <file>');
  process.exit(1);
}
const data = await fs.readFile(file);
const hash = createHash('sha256').update(data).digest('hex');
console.log(JSON.stringify({ file, algorithm:'SHA-256', hash }, null, 2));
