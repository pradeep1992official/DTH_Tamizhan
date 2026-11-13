import { assertValidCatalogPack } from '../../src/lib/catalog';
import fs from 'fs';
import {
  DATA_DIR,
  DELETED_PLANS_FILE,
  PLANS_FILE,
} from './store';
import { PlanCatalogItem } from '../../src/types';
import { collections, readCollection, usesFirestore, cleanData } from '../persistence';
import { getAdminFirestore } from '../middleware/auth';
import { ReadCache } from '../utils/readCache';
import { queryRecords } from '../queries';
const cache = new ReadCache<PlanCatalogItem[]>(60_000);

function loadPlans(): { plans: PlanCatalogItem[]; deletedIds: string[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    let deletedIds: string[] = [];
    if (fs.existsSync(DELETED_PLANS_FILE)) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(DELETED_PLANS_FILE, 'utf-8'));
        if (Array.isArray(parsed)) deletedIds = parsed;
      } catch {
        // Keep the existing empty-deleted-list fallback for malformed local data.
      }
    }

    let plans: PlanCatalogItem[];
    if (fs.existsSync(PLANS_FILE)) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
        plans = Array.isArray(parsed) ? parsed : [];
      } catch {
        plans = [];
      }
    } else {
      plans = [];
    }

    const deletedSet = new Set(deletedIds);
    return { plans: plans.filter((plan) => !deletedSet.has(plan.id)), deletedIds };
  } catch (error) {
    console.error('[Server Persistence] Error loading disk plans:', error);
    return { plans: [], deletedIds: [] };
  }
}

let loaded: ReturnType<typeof loadPlans> | undefined;
function local() { return loaded ||= loadPlans(); }

function persistPlans(): void {
    const { plans, deletedIds } = local();
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
    fs.writeFileSync(DELETED_PLANS_FILE, JSON.stringify(deletedIds, null, 2), 'utf-8');
}

export const planModel = {
  async getAll(fresh = false): Promise<PlanCatalogItem[]> {
    // This document stores catalog bookkeeping, not a purchasable pack.
    if (!usesFirestore()) return local().plans.filter(plan => plan.id !== 'catalog_state');
    return cache.get('all', async () => {
      const [plans, deleted] = await Promise.all([readCollection<PlanCatalogItem>(collections.plans), this.getDeletedIds()]);
      return plans.filter(plan => plan.id !== 'catalog_state' && !deleted.includes(plan.id));
    }, fresh);
  },
  async getForOperator(operator: string): Promise<PlanCatalogItem[]> {
    if (!usesFirestore()) return (await this.getAll()).filter(plan => plan.operator === operator);
    return cache.get(operator, () => queryRecords<PlanCatalogItem>(collections.plans, [{ field: 'operator', op: 'eq', value: operator }]));
  },
  clearCache() { cache.clear(); },
  async getById(id: string): Promise<PlanCatalogItem | undefined> {
    if (id === 'custom' || id === 'catalog_state') return undefined;
    if (!usesFirestore()) return local().plans.find(plan => plan.id === id && !local().deletedIds.includes(id));
    const snapshot = await getAdminFirestore().collection(collections.plans).doc(id).get();
    return snapshot.exists ? snapshot.data() as PlanCatalogItem : undefined;
  },

  async getDeletedIds(): Promise<string[]> {
    if (!usesFirestore()) return local().deletedIds;
    return (await readCollection<{ id: string }>(collections.deletedPlans)).map(item => item.id);
  },

  async save(plan: PlanCatalogItem): Promise<void> {
    assertValidCatalogPack(plan);
    if (usesFirestore()) {
      const db = getAdminFirestore(); const batch = db.batch();
      batch.set(db.collection(collections.plans).doc(plan.id), cleanData(plan));
      batch.delete(db.collection(collections.deletedPlans).doc(plan.id)); await batch.commit(); cache.clear(); return;
    }
    const { plans } = local();
    const index = plans.findIndex((item) => item.id === plan.id);
    if (index >= 0) plans[index] = plan;
    else plans.unshift(plan);
    local().deletedIds = local().deletedIds.filter(id => id !== plan.id);
    persistPlans();
  },

  async delete(planId: string): Promise<void> {
    if (usesFirestore()) {
      const db = getAdminFirestore(); const batch = db.batch();
      batch.delete(db.collection(collections.plans).doc(planId));
      batch.set(db.collection(collections.deletedPlans).doc(planId), { id: planId }); await batch.commit(); cache.clear(); return;
    }
    local().plans = local().plans.filter((plan) => plan.id !== planId);
    if (!local().deletedIds.includes(planId)) local().deletedIds.push(planId);
    persistPlans();
  },

  async sync(seedPlans: PlanCatalogItem[]): Promise<void> {
    seedPlans.forEach(assertValidCatalogPack);
    if (usesFirestore()) { for (const plan of seedPlans) await this.save(plan); return; }
    const { plans } = local();
    const merged = new Map(plans.map(plan => [plan.id, plan]));
    seedPlans.forEach(plan => merged.set(plan.id, plan));
    local().plans = [...merged.values()];
    persistPlans();
  },
};
