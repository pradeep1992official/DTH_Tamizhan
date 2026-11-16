import 'dotenv/config';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { getAdminFirestore } from '../server/middleware/auth';
import { queryRecords } from '../server/queries';
import { withConnectionLedger } from '../src/lib/newConnectionOrders';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) { if (!['--write', '--project'].includes(args[i])) throw new Error('Unknown argument'); if (args[i] === '--project') i++; }
if (args.includes('--write') && args[args.indexOf('--project') + 1] !== config.projectId) throw new Error('Writes require --project ' + config.projectId);
if (!getApps().length) initializeApp({ projectId: config.projectId });
let cursor: { time: string; id: string } | undefined; let scanned = 0; let changed = 0;
for (let page = 0; page < 1000; page++) {
  const rows = await queryRecords<Record<string, any>>('newConnectionOrders', [], { limit: 100, cursor });
  for (const row of rows) {
    scanned++; const normalized = withConnectionLedger(row);
    if (Array.isArray(row.ledger) && row.amountPaid === normalized.amountPaid && row.balance === normalized.balance && row.amountRefunded === normalized.amountRefunded && row.paymentStatus === normalized.paymentStatus) continue;
    changed++;
    if (args.includes('--write')) {
      const db = getAdminFirestore(); const ref = db.doc(`newConnectionOrders/${row.id}`), fence = db.doc('server_runtime/newConnectionOrders');
      await db.runTransaction(async tx => {
        const [snapshot] = await Promise.all([tx.get(ref), tx.get(fence)]);
        if (snapshot.exists) { tx.set(ref, withConnectionLedger(snapshot.data())); tx.set(fence, { updatedAt: new Date().toISOString() }); }
      });
    }
  }
  if (rows.length < 100) { console.log(JSON.stringify({ dryRun: !args.includes('--write'), project: config.projectId, database: config.firestoreDatabaseId, scanned, normalized: changed })); break; }
  const last = rows.at(-1)!; cursor = { time: last.createdAt, id: last.id };
  if (page === 999) throw new Error('Migration scan limit reached; no complete result reported.');
}
