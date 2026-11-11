import { doc, runTransaction } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createDemoAdminData } from './demoAdminData';

let seedPromise: Promise<void> | undefined;
export function seedDemoAdminData(): Promise<void> {
  if (!isFirebaseConfigured || !db) return Promise.resolve();
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const marker = 'dth_admin_demo_seed_v1';
    if (localStorage.getItem(marker) === 'complete') return;
    const { customers, orders } = createDemoAdminData();
    for (const [collectionName, records] of [['customers', customers], ['recharge_orders', orders]] as const) {
      for (const record of records) {
        const id = 'orderId' in record ? record.orderId : record.id;
        const ref = doc(db!, collectionName, id);
        await runTransaction(db!, async (transaction) => {
          const existing = await transaction.get(ref);
          if (!existing.exists()) transaction.set(ref, record);
        });
      }
    }
    localStorage.setItem(marker, 'complete');
  })().catch((error) => { seedPromise = undefined; throw error; });
  return seedPromise;
}
