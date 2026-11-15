import { randomUUID } from 'node:crypto';
import { assertValidCatalogPack } from '../../src/lib/catalog';
import fs from 'fs';
import {
  DATA_DIR,
  DELETED_PLANS_FILE,
  PLANS_FILE,
} from './store';
import { PlanCatalogItem, PlanAuditLog } from '../../src/types';
import { collections, readCollection, usesFirestore, cleanData } from '../persistence';
import { getAdminFirestore } from '../middleware/auth';
import { ReadCache } from '../utils/readCache';
import { queryRecords } from '../queries';
const cache = new ReadCache<PlanCatalogItem[]>(60_000);

function loadPlans(): { plans: PlanCatalogItem[]; deletedIds: string[]; auditLogs: PlanAuditLog[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    let deletedIds: string[] = [];
    let auditLogs: PlanAuditLog[] = [];
    if (fs.existsSync(DELETED_PLANS_FILE)) {
      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(DELETED_PLANS_FILE, 'utf-8'));
        if (Array.isArray(parsed)) deletedIds = parsed;
        else if (parsed && typeof parsed === 'object') {
          const ledger = parsed as { deletedIds?: string[]; auditLogs?: PlanAuditLog[] };
          deletedIds = Array.isArray(ledger.deletedIds) ? ledger.deletedIds : [];
          auditLogs = Array.isArray(ledger.auditLogs) ? ledger.auditLogs : [];
        }
      } catch {
        throw new Error('Catalog deletion ledger is unreadable. Restore it before changing plans.');
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
    return { plans: plans.filter((plan) => !deletedSet.has(plan.id)), deletedIds, auditLogs };
  } catch (error) {
    console.error('[Server Persistence] Error loading disk plans:', error);
    throw error;
  }
}

let loaded: ReturnType<typeof loadPlans> | undefined;
function local() { return loaded ||= loadPlans(); }

function persistPlans(): void {
    const { plans, deletedIds } = local();
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
    fs.writeFileSync(`${DELETED_PLANS_FILE}.tmp`, JSON.stringify({ deletedIds, auditLogs: local().auditLogs }, null, 2), 'utf-8');
    fs.renameSync(`${DELETED_PLANS_FILE}.tmp`, DELETED_PLANS_FILE);
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

  async delete(planId: string, actor = 'server'): Promise<PlanAuditLog | undefined> {
    if (['catalog_state', 'custom'].includes(planId)) throw new Error('This record is not a catalog pack.');
    const auditFor = (plan: PlanCatalogItem): PlanAuditLog => ({
      id: `delete-${randomUUID()}`, plan_id: plan.id, plan_name: plan.plan_name, operator: plan.operator,
      action: 'delete', updated_at: new Date().toISOString(), updated_by: actor,
      details: `Deleted ${plan.pack_type} pack for ${plan.duration_months}M (Rs. ${plan.amount}) from the server catalog`,
    });
    if (usesFirestore()) {
      const db = getAdminFirestore();
      const planRef = db.collection(collections.plans).doc(planId);
      const deletedRef = db.collection(collections.deletedPlans).doc(planId);
      const audit = await db.runTransaction(async tx => {
        const [snapshot, deleted] = await Promise.all([tx.get(planRef), tx.get(deletedRef)]);
        if (!snapshot.exists) {
          if (deleted.exists) return deleted.data()?.audit as PlanAuditLog | undefined;
          throw new Error('Plan not found. Refresh the catalog.');
        }
        const entry = auditFor({ ...snapshot.data(), id: planId } as PlanCatalogItem);
        tx.delete(planRef);
        tx.set(deletedRef, cleanData({ id: planId, audit: entry }));
        tx.set(db.collection('plan_audit_logs').doc(entry.id), cleanData(entry));
        tx.set(db.collection(collections.plans).doc('catalog_state'), { initialized: true, updated_at: entry.updated_at }, { merge: true });
        return entry;
      });
      cache.clear(); return audit;
    }
    const state = local();
    const plan = state.plans.find(item => item.id === planId);
    if (!plan) {
      if (state.deletedIds.includes(planId)) return state.auditLogs.find(item => item.plan_id === planId && item.action === 'delete');
      throw new Error('Plan not found. Refresh the catalog.');
    }
    const audit = auditFor(plan);
    const deletedIds = [...new Set([...state.deletedIds, planId])];
    const auditLogs = [...state.auditLogs, audit];
    // One atomic deletion ledger is authoritative for local reads and audit history.
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(`${DELETED_PLANS_FILE}.tmp`, JSON.stringify({ deletedIds, auditLogs }, null, 2));
    fs.renameSync(`${DELETED_PLANS_FILE}.tmp`, DELETED_PLANS_FILE);
    state.deletedIds = deletedIds; state.auditLogs = auditLogs;
    state.plans = state.plans.filter(item => item.id !== planId);
    return audit;
  },
  async getAuditLogs(): Promise<PlanAuditLog[]> {
    if (!usesFirestore()) return [...local().auditLogs].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 20);
    const records = await getAdminFirestore().collection('plan_audit_logs').orderBy('updated_at', 'desc').limit(20).get();
    return records.docs.map(record => ({ ...record.data(), id: record.id } as PlanAuditLog));
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
