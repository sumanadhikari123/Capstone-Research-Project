import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, '../../data/external-ledger.json');

async function readState() {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch {
    const s = { anchors: [] };
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(s, null, 2));
    return s;
  }
}

async function writeState(s) { await fs.writeFile(file, JSON.stringify(s, null, 2)); }
function digest(event) { return crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex'); }

export class CrossLedgerService {
  async anchor(event, sourceTxId, destinationSystemId = 'EXTERNAL_LEDGER_SIM') {
    const state = await readState();
    const eventHash = digest(event);
    const destinationTxId = `EXT-${crypto.randomUUID().slice(0, 12)}`;
    const anchor = {
      anchorId: `ANCHOR-${crypto.randomUUID().slice(0, 12)}`,
      sourceTxId,
      destinationTxId,
      destinationSystemId,
      eventHash,
      event,
      timestamp: new Date().toISOString()
    };
    state.anchors.push(anchor);
    await writeState(state);
    return anchor;
  }

  async verify(eventHash, sourceTxId) {
    const state = await readState();
    const anchor = state.anchors.find(a => a.sourceTxId === sourceTxId && a.eventHash === eventHash);
    return { verified: Boolean(anchor), anchor: anchor || null };
  }

  async list() { return (await readState()).anchors; }
}
