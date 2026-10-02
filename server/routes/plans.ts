import { Router, Request, Response } from 'express';
import fs from 'fs';
import { 
  PLANS_FILE, 
  DELETED_PLANS_FILE, 
  SAMPLE_PLANS, 
  APPROVED_ADMIN_EMAILS, 
  DATA_DIR 
} from '../store';
import { isCallerAdminAuthorized } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import { validateBody, SavePlanSchema, DeletePlanSchema } from '../middleware/validation';
import { INITIAL_BROWSE_PLANS, filterAndSortPlans, catalogItemToBrowsePlan } from '../../src/lib/browsePlansData';
import { INITIAL_PLAN_CATALOG } from '../../src/lib/planCatalogService';
import { PlanCatalogItem } from '../../src/types';

export const plansRouter = Router();

function loadDiskPlans(): { plans: PlanCatalogItem[]; deletedIds: string[] } {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let deletedIds: string[] = [];
    if (fs.existsSync(DELETED_PLANS_FILE)) {
      try {
        const rawDel = fs.readFileSync(DELETED_PLANS_FILE, 'utf-8');
        deletedIds = JSON.parse(rawDel);
        if (!Array.isArray(deletedIds)) deletedIds = [];
      } catch {}
    }

    let plans: PlanCatalogItem[] = [];
    if (fs.existsSync(PLANS_FILE)) {
      try {
        const rawPlans = fs.readFileSync(PLANS_FILE, 'utf-8');
        plans = JSON.parse(rawPlans);
        if (!Array.isArray(plans)) plans = [];
      } catch {}
    } else {
      plans = [...INITIAL_PLAN_CATALOG];
      try {
        fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
      } catch {}
    }

    const deletedSet = new Set(deletedIds);
    plans = plans.filter((p) => !deletedSet.has(p.id));

    return { plans, deletedIds };
  } catch (err) {
    console.error('[Server Persistence] Error loading disk plans:', err);
    return { plans: [...INITIAL_PLAN_CATALOG], deletedIds: [] };
  }
}

function saveDiskPlans(plans: PlanCatalogItem[], deletedIds?: string[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
    if (deletedIds) {
      fs.writeFileSync(DELETED_PLANS_FILE, JSON.stringify(deletedIds, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[Server Persistence] Error saving disk plans:', err);
  }
}

let { plans: MEMORY_ADMIN_PLANS, deletedIds: DELETED_PLAN_IDS } = loadDiskPlans();

// 1. Public Browse Plans & Recharge Query Filter Endpoint
plansRouter.get('/api/plans', (req: Request, res: Response) => {
  try {
    const {
      operatorId,
      operators,
      category,
      type,
      durations,
      minPrice,
      maxPrice,
      minChannels,
      maxChannels,
      genres,
      sort,
      q
    } = req.query;

    // Backward compatibility for simple RechargeFlow query
    const isLegacyQuery = (operatorId && !operators && !type && !durations && !genres && !minPrice && !maxPrice);

    if (isLegacyQuery) {
      let legacyPlans = [...SAMPLE_PLANS];
      if (operatorId) {
        legacyPlans = legacyPlans.filter((p) => p.operatorId === operatorId);
      }
      if (category && category !== 'all') {
        legacyPlans = legacyPlans.filter((p) => p.category === category);
      }
      res.json({
        success: true,
        count: legacyPlans.length,
        plans: legacyPlans,
      });
      return;
    }

    // Parse operators
    let parsedOperators: string[] = [];
    if (typeof operators === 'string' && operators.trim()) {
      parsedOperators = operators.split(',').map((s) => s.trim().toLowerCase());
    } else if (typeof operatorId === 'string' && operatorId.trim()) {
      parsedOperators = [operatorId.trim().toLowerCase()];
    }

    // Parse durations
    let parsedDurations: (1 | 3 | 6 | 12)[] = [];
    if (typeof durations === 'string' && durations.trim()) {
      parsedDurations = durations
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d): d is 1 | 3 | 6 | 12 => [1, 3, 6, 12].includes(d as any));
    }

    // Parse genres
    let parsedGenres: string[] = [];
    if (typeof genres === 'string' && genres.trim()) {
      parsedGenres = genres.split(',').map((g) => g.trim().toLowerCase());
    }

    const parsedMinPrice = typeof minPrice === 'string' ? Math.max(0, parseFloat(minPrice) || 0) : 0;
    const parsedMaxPrice = typeof maxPrice === 'string' ? Math.max(parsedMinPrice, parseFloat(maxPrice) || 10000) : 10000;
    const parsedMinChannels = typeof minChannels === 'string' ? Math.max(0, parseInt(minChannels, 10) || 0) : 0;
    const parsedMaxChannels = typeof maxChannels === 'string' ? Math.max(parsedMinChannels, parseInt(maxChannels, 10) || 500) : 500;

    const parsedType = (type === 'HD' || type === 'SD') ? type : 'all';
    const parsedSort = (
      sort === 'price_asc' || 
      sort === 'price_desc' || 
      sort === 'price_per_channel_asc' || 
      sort === 'savings_pct_desc' || 
      sort === 'channels_desc'
    ) ? sort : 'recommended';

    const sourcePlans = MEMORY_ADMIN_PLANS.length > 0 
      ? MEMORY_ADMIN_PLANS.map(catalogItemToBrowsePlan) 
      : INITIAL_BROWSE_PLANS;

    const results = filterAndSortPlans(sourcePlans, {
      operators: parsedOperators as any,
      type: parsedType,
      durations: parsedDurations,
      priceRange: [parsedMinPrice, parsedMaxPrice],
      channelRange: [parsedMinChannels, parsedMaxChannels],
      genreTags: parsedGenres,
      sortBy: parsedSort as any,
      searchQuery: typeof q === 'string' ? q.slice(0, 100) : '',
    });

    res.json({
      success: true,
      count: results.length,
      plans: results,
    });
  } catch (err: any) {
    console.error('[API Error] /api/plans failed:', err);
    res.status(500).json({ success: false, error: 'Internal error processing plan query' });
  }
});

// 2. Admin Get All Plans
plansRouter.get('/api/admin/plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: MEMORY_ADMIN_PLANS.length,
    plans: MEMORY_ADMIN_PLANS,
  });
});

// 3. Admin Get Deleted Plan IDs
plansRouter.get('/api/admin/plans/deleted', (req: Request, res: Response) => {
  res.json({
    success: true,
    deletedIds: DELETED_PLAN_IDS,
  });
});

// 4. Save Plan Endpoint (Admin only with Zod validation)
plansRouter.post(
  '/api/admin/plans/save',
  adminLimiter,
  validateBody(SavePlanSchema),
  async (req: Request, res: Response) => {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }

    const { plan } = req.body;
    const finalItem: PlanCatalogItem = {
      ...plan,
      amount: Number(plan.amount),
      price: Number(plan.amount),
      duration_months: Number(plan.duration_months) as 1 | 3 | 6 | 12,
      is_recommended: Boolean(plan.is_recommended),
      channel_list: Array.isArray(plan.channel_list) ? plan.channel_list : [],
      updated_at: new Date().toISOString(),
      updated_by: adminCheck.email || 'admin_user',
    };

    const existingIdx = MEMORY_ADMIN_PLANS.findIndex((p) => p.id === finalItem.id);
    if (existingIdx >= 0) {
      MEMORY_ADMIN_PLANS[existingIdx] = finalItem;
    } else {
      MEMORY_ADMIN_PLANS.unshift(finalItem);
    }

    saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
    res.json({ success: true, plan: finalItem });
  }
);

// 5. Delete Plan Endpoint (Admin only with Zod validation)
plansRouter.post(
  '/api/admin/plans/delete',
  adminLimiter,
  validateBody(DeletePlanSchema),
  async (req: Request, res: Response) => {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }

    const { planId } = req.body;
    MEMORY_ADMIN_PLANS = MEMORY_ADMIN_PLANS.filter((p) => p.id !== planId);
    if (!DELETED_PLAN_IDS.includes(planId)) {
      DELETED_PLAN_IDS.push(planId);
    }

    saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
    res.json({ success: true, deletedPlanId: planId });
  }
);

// 6. Sync Seed Plans from Firestore (Admin only)
plansRouter.post('/api/admin/plans/sync-seed', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const { plans } = req.body;
  if (Array.isArray(plans) && plans.length > 0) {
    MEMORY_ADMIN_PLANS = plans;
    saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
  }

  res.json({ success: true, count: MEMORY_ADMIN_PLANS.length });
});
