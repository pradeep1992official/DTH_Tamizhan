import { Request, Response } from 'express';
import { isCallerAdminAuthorized } from '../middleware/auth';
import { APPROVED_ADMIN_EMAILS } from '../models/store';
import { filterAndSortPlans, catalogItemToBrowsePlan } from '../../src/lib/browsePlansData';
import { PlanCatalogItem } from '../../src/types';
import { planModel } from '../models/planModel';

export const plansController = {
  list(req: Request, res: Response): void {
    try {
      const {
        operatorId, operators, category, type, durations, minPrice, maxPrice,
        minChannels, maxChannels, genres, sort, q,
      } = req.query;
      const isLegacyQuery = operatorId && !operators && !type && !durations && !genres && !minPrice && !maxPrice;

      if (isLegacyQuery) {
        let legacyPlans = planModel.getAll().map(plan => ({ ...catalogItemToBrowsePlan(plan), operatorId: plan.operator, category: 'tamil_base' }));
        if (operatorId) legacyPlans = legacyPlans.filter((plan) => plan.operatorId === operatorId);
        if (category && category !== 'all') legacyPlans = legacyPlans.filter((plan) => plan.category === category);
        res.json({ success: true, count: legacyPlans.length, plans: legacyPlans });
        return;
      }

      const parsedOperators = typeof operators === 'string' && operators.trim()
        ? operators.split(',').map((value) => value.trim().toLowerCase())
        : typeof operatorId === 'string' && operatorId.trim()
          ? [operatorId.trim().toLowerCase()]
          : [];
      const parsedDurations = typeof durations === 'string' && durations.trim()
        ? durations.split(',').map((value) => parseInt(value.trim(), 10))
          .filter((value): value is 1 | 3 | 6 | 12 => [1, 3, 6, 12].includes(value))
        : [];
      const parsedGenres = typeof genres === 'string' && genres.trim()
        ? genres.split(',').map((value) => value.trim().toLowerCase())
        : [];
      const parsedMinPrice = typeof minPrice === 'string' ? Math.max(0, parseFloat(minPrice) || 0) : 0;
      const parsedMaxPrice = typeof maxPrice === 'string' ? Math.max(parsedMinPrice, parseFloat(maxPrice) || 10000) : 10000;
      const parsedMinChannels = typeof minChannels === 'string' ? Math.max(0, parseInt(minChannels, 10) || 0) : 0;
      const parsedMaxChannels = typeof maxChannels === 'string' ? Math.max(parsedMinChannels, parseInt(maxChannels, 10) || 500) : 500;
      const parsedType = type === 'HD' || type === 'SD' ? type : 'all';
      const parsedSort = (
        sort === 'price_asc' ||
        sort === 'price_desc' ||
        sort === 'price_per_channel_asc' ||
        sort === 'savings_pct_desc' ||
        sort === 'channels_desc'
      ) ? sort : 'recommended';
      const catalogPlans = planModel.getAll();
      const sourcePlans = catalogPlans.map(catalogItemToBrowsePlan);
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

      res.json({ success: true, count: results.length, plans: results });
    } catch (error) {
      console.error('[API Error] /api/plans failed:', error);
      res.status(500).json({ success: false, error: 'Internal error processing plan query' });
    }
  },

  listCatalog(_req: Request, res: Response): void { res.json({ success: true, plans: planModel.getAll() }); },
  async listAdmin(req: Request, res: Response): Promise<void> {
    if (!(await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS)).authorized) { res.status(403).json({ success: false, error: 'Forbidden' }); return; }
    const plans = planModel.getAll();
    res.json({ success: true, count: plans.length, plans });
  },

  async listDeleted(req: Request, res: Response): Promise<void> {
    if (!(await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS)).authorized) { res.status(403).json({ success: false, error: 'Forbidden' }); return; }
    res.json({ success: true, deletedIds: planModel.getDeletedIds() });
  },

  async save(req: Request, res: Response): Promise<void> {
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
    planModel.save(finalItem);
    res.json({ success: true, plan: finalItem });
  },

  async delete(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    const { planId } = req.body;
    planModel.delete(planId);
    res.json({ success: true, deletedPlanId: planId });
  },

  async syncSeed(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    const { plans } = req.body;
    if (Array.isArray(plans) && plans.length > 0) planModel.sync(plans.map(plan => ({ ...plan, price: plan.amount, is_recommended: Boolean(plan.is_recommended), channel_list: plan.channel_list || [], updated_at: new Date().toISOString(), updated_by: adminCheck.email })));
    res.json({ success: true, count: planModel.getAll().length });
  },
};
