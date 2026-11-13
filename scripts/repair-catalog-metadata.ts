import 'dotenv/config';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { planModel } from '../server/models/planModel';
import { getAdminFirestore } from '../server/middleware/auth';
import { validateCatalogPack } from '../src/lib/catalog';
import type { PlanCatalogItem } from '../src/types';

function repairable(plan: PlanCatalogItem) {
  return plan.channel_count === undefined && plan.hd_channel_count === undefined && !plan.channel_counts_unavailable &&
    validateCatalogPack(plan).length > 0 && validateCatalogPack({ ...plan, channel_counts_unavailable: true }).length === 0;
}
async function main() {
  process.env.PERSISTENCE_DRIVER = 'firestore';
  if (!getApps().length) initializeApp({ projectId: config.projectId });
  const candidates = (await planModel.getAll()).filter(repairable);
  const apply = process.argv.includes('--apply'); let repaired = 0;
  if (apply) for (const plan of candidates) {
    const db = getAdminFirestore(); const reference = db.collection('plan_catalog').doc(plan.id);
    const changed = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference); const current = snapshot.data() as PlanCatalogItem | undefined;
      if (!current || !repairable(current)) return false;
      transaction.update(reference, { channel_counts_unavailable: true }); return true;
    });
    if (changed) repaired++;
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', eligiblePacks: candidates.length, repaired, pricesChanged: false, channelTotalsInvented: false }));
}
main().catch(() => { console.error('Catalog metadata repair failed. Check server Firestore access.'); process.exitCode = 1; });
