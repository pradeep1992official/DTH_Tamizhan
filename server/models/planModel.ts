import fs from 'fs';
import {
  DATA_DIR,
  DELETED_PLANS_FILE,
  PLANS_FILE,
} from './store';
import { INITIAL_PLAN_CATALOG } from '../../src/lib/planCatalogService';
import { PlanCatalogItem } from '../../src/types';

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
      plans = [...INITIAL_PLAN_CATALOG];
      try {
        fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
      } catch {
        // The in-memory seed remains usable when local persistence is unavailable.
      }
    }

    const deletedSet = new Set(deletedIds);
    return { plans: plans.filter((plan) => !deletedSet.has(plan.id)), deletedIds };
  } catch (error) {
    console.error('[Server Persistence] Error loading disk plans:', error);
    return { plans: [...INITIAL_PLAN_CATALOG], deletedIds: [] };
  }
}

let { plans, deletedIds } = loadPlans();

function persistPlans(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
    fs.writeFileSync(DELETED_PLANS_FILE, JSON.stringify(deletedIds, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Server Persistence] Error saving disk plans:', error);
  }
}

export const planModel = {
  getAll(): PlanCatalogItem[] {
    return plans;
  },

  getDeletedIds(): string[] {
    return deletedIds;
  },

  save(plan: PlanCatalogItem): void {
    const index = plans.findIndex((item) => item.id === plan.id);
    if (index >= 0) plans[index] = plan;
    else plans.unshift(plan);
    persistPlans();
  },

  delete(planId: string): void {
    plans = plans.filter((plan) => plan.id !== planId);
    if (!deletedIds.includes(planId)) deletedIds.push(planId);
    persistPlans();
  },

  sync(seedPlans: PlanCatalogItem[]): void {
    plans = seedPlans;
    persistPlans();
  },
};
