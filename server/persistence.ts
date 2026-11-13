import { createHash, randomUUID } from 'node:crypto';
import { getAdminFirestore } from './middleware/auth';

export const collections = {
  payments: 'server_payments', recharges: 'server_recharges', emails: 'server_email_outbox',
  customers: 'server_customers', requests: 'server_admin_requests', runtime: 'server_runtime',
  plans: 'plan_catalog', deletedPlans: 'server_deleted_plans', operators: 'operator_settings',
} as const;

export function usesFirestore() {
  const mode = process.env.PERSISTENCE_DRIVER || (process.env.NODE_ENV === 'production' ? 'firestore' : 'file');
  if (!['file', 'firestore'].includes(mode)) throw new Error('PERSISTENCE_DRIVER must be file or firestore.');
  if (mode === 'file' && process.env.NODE_ENV === 'production') throw new Error('Production requires Firestore persistence.');
  return mode === 'firestore';
}
export const documentKey = (value: string) => createHash('sha256').update(value).digest('hex');
export const paymentKey = (id: string, testMode: boolean) => `${testMode ? 'test' : 'live'}_${id}`;
export const cleanData = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Enterprise-native pipelines for collection reads; document transactions below
// are required for atomic payment upserts, fulfillment changes and worker leases.
export async function readCollection<T>(name: string): Promise<T[]> {
  const snapshot = await getAdminFirestore().pipeline().collection(name).execute();
  return snapshot.results.map(row => ({ id: row.id, ...row.data() }) as T);
}
export async function setRecord<T>(name: string, id: string, data: T) {
  await getAdminFirestore().collection(name).doc(id).set(cleanData(data) as any);
}
export async function mutateRecord<T>(name: string, id: string, update: (previous: T | undefined) => T): Promise<T> {
  const db = getAdminFirestore(); const ref = db.collection(name).doc(id);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const value = update(snapshot.exists ? snapshot.data() as T : undefined);
    transaction.set(ref, cleanData(value) as any); return value;
  });
}

export interface StorageLease { renew(): Promise<void>; release(): Promise<void> }
export async function acquireStorageLease(name: string): Promise<StorageLease | null> {
  if (!usesFirestore()) return { renew: async () => {}, release: async () => {} };
  const db = getAdminFirestore(); const ref = db.collection(collections.runtime).doc(name); const owner = randomUUID();
  const claim = async (initial = false) => db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref); const old = snapshot.data(); const now = Date.now();
    if (initial ? old?.expiresAt > now : old?.owner !== owner || old?.expiresAt <= now) return false;
    transaction.set(ref, { owner, expiresAt: now + 120_000 }); return true;
  });
  if (!await claim(true)) return null;
  let renewAfter = Date.now() + 60_000;
  return {
    renew: async () => {
      if (Date.now() < renewAfter) return;
      if (!await claim()) throw new Error('Shared worker lease expired.');
      renewAfter = Date.now() + 60_000;
    },
    release: async () => { await db.runTransaction(async transaction => { const snapshot = await transaction.get(ref); if (snapshot.data()?.owner === owner) transaction.delete(ref); }); },
  };
}

export async function checkPersistence() {
  if (!usesFirestore()) return;
  // Read without changing business data. Startup fails if credentials/database are unavailable.
  await getAdminFirestore().collection(collections.runtime).doc('health').get();
}
