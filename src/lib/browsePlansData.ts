import { BrowsePlan, DthOperatorId, PlanCatalogItem, PlanFilters } from '../types';
import { INITIAL_PLAN_CATALOG } from './planCatalogService';

/**
 * Converts a PlanCatalogItem from Firestore / Admin Catalog to a BrowsePlan
 */
export function catalogItemToBrowsePlan(p: PlanCatalogItem): BrowsePlan {
  const isHd = p.pack_type === 'HD' || (p as any).type === 'HD';
  const defaultChannelCount = isHd ? 210 : 145;
  const channelCount = Number(p.channel_count) || (Array.isArray(p.channel_list) && p.channel_list.length > 20 ? p.channel_list.length : defaultChannelCount);
  const hdChannelCount = p.hd_channel_count !== undefined 
    ? Number(p.hd_channel_count) 
    : (isHd ? 32 : 0);

  const price = Number(p.amount || p.price) || 299;
  const durationMonths = (Number(p.duration_months) || 1) as 1 | 3 | 6 | 12;

  return {
    id: p.id,
    operator: p.operator,
    name: p.plan_name || (p as any).name || 'DTH Pack',
    tamilName: p.tamilName,
    type: isHd ? 'HD' : 'SD',
    duration_months: durationMonths,
    price: price,
    monthly_equivalent_rate: Math.round(price / durationMonths),
    channel_count: channelCount,
    hd_channel_count: hdChannelCount,
    channels: Array.isArray(p.channel_list) ? p.channel_list : (Array.isArray(p.channels) ? p.channels : []),
    genre_tags: Array.isArray(p.genre_tags) && p.genre_tags.length > 0 ? p.genre_tags : ['tamil', 'entertainment'],
    is_recommended: Boolean(p.is_recommended),
    description: p.description || `${durationMonths} Month${durationMonths > 1 ? 's' : ''} ${isHd ? 'HD' : 'SD'} pack for ${p.operator}.`,
  };
}

/**
 * Canonical initial Browse Plans derived from the unified catalog
 */
export const INITIAL_BROWSE_PLANS: BrowsePlan[] = INITIAL_PLAN_CATALOG.map(catalogItemToBrowsePlan);

/**
 * Computes ranking metrics for a list of plans:
 * 1. price_per_channel = price / channel_count
 * 2. savings_pct = ((oneMonthRate * duration_months) - price) / (oneMonthRate * duration_months)
 *    Computed against the 1-month baseline rate of the same operator pack family!
 * 3. Best Value badge: lowest price_per_channel in the set
 * 4. Best Savings badge: highest savings_pct (> 0) in the set
 */
export function computePlanMetrics(plans: BrowsePlan[]): BrowsePlan[] {
  if (!plans.length) return [];

  // Build a lookup map of 1-month baseline prices by operator and type (e.g. 'sun_direct_HD' -> 299)
  const oneMonthBaselineMap = new Map<string, number>();
  for (const plan of plans) {
    if (plan.duration_months === 1) {
      const key = `${plan.operator}_${plan.type}`;
      // Prefer recommended 1M pack if multiple exist, or set if not present
      if (!oneMonthBaselineMap.has(key) || plan.is_recommended) {
        oneMonthBaselineMap.set(key, plan.price);
      }
    }
  }

  // 1. Calculate basic metrics
  const enriched = plans.map((plan) => {
    const channelCount = Math.max(1, plan.channel_count || 1);
    const pricePerChannel = Math.round((plan.price / channelCount) * 100) / 100;

    // Resolve 1-month baseline rate for the same operator pack family
    const familyKey = `${plan.operator}_${plan.type}`;
    const oneMonthBaseRate = oneMonthBaselineMap.get(familyKey) || plan.price;
    const baseCost = oneMonthBaseRate * (plan.duration_months || 1);

    // Compute savings percentage against 1-month baseline
    const savingsPct = (plan.duration_months > 1 && baseCost > plan.price)
      ? Math.round(((baseCost - plan.price) / baseCost) * 100)
      : 0;

    const monthlyRate = Math.round(plan.price / (plan.duration_months || 1));

    return {
      ...plan,
      monthly_equivalent_rate: monthlyRate,
      price_per_channel: pricePerChannel,
      savings_pct: savingsPct,
    };
  });

  // 2. Identify Best Value (lowest price_per_channel)
  let lowestPpc = Infinity;
  let highestSavings = 0;

  for (const p of enriched) {
    if (p.price_per_channel !== undefined && p.price_per_channel < lowestPpc) {
      lowestPpc = p.price_per_channel;
    }
    if (p.savings_pct !== undefined && p.savings_pct > highestSavings) {
      highestSavings = p.savings_pct;
    }
  }

  // 3. Mark computed badges
  return enriched.map((p) => ({
    ...p,
    is_best_value: lowestPpc < Infinity && p.price_per_channel === lowestPpc,
    is_best_savings: highestSavings > 0 && p.savings_pct === highestSavings,
  }));
}

/**
 * Filters and sorts plans based on user selection
 */
export function filterAndSortPlans(plans: BrowsePlan[], filters: PlanFilters): BrowsePlan[] {
  let filtered = plans.filter((p) => {
    // Operator multi-select
    if (filters.operators.length > 0 && !filters.operators.includes(p.operator)) {
      return false;
    }

    // Type filter (HD / SD / all)
    if (filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    // Duration filter (1 / 3 / 6 / 12)
    if (filters.durations.length > 0 && !filters.durations.includes(p.duration_months)) {
      return false;
    }

    // Price range
    if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) {
      return false;
    }

    // Channel count range
    const count = p.channel_count || 100;
    if (count < filters.channelRange[0] || count > filters.channelRange[1]) {
      return false;
    }

    // Genre tags (if any selected, plan must contain at least one)
    if (filters.genreTags.length > 0) {
      const hasGenre = filters.genreTags.some((g) => p.genre_tags.includes(g.toLowerCase()));
      if (!hasGenre) return false;
    }

    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchTamil = (p.tamilName || '').toLowerCase().includes(q);
      const matchDesc = (p.description || '').toLowerCase().includes(q);
      const matchChannel = p.channels.some((c) => c.toLowerCase().includes(q));
      const matchGenreTag = p.genre_tags.some((g) => g.toLowerCase().includes(q));
      if (!matchName && !matchTamil && !matchDesc && !matchChannel && !matchGenreTag) {
        return false;
      }
    }

    return true;
  });

  // Re-compute badges for the filtered subset
  const computed = computePlanMetrics(filtered);

  // Sorting
  computed.sort((a, b) => {
    switch (filters.sortBy) {
      case 'recommended':
        if (a.is_recommended !== b.is_recommended) {
          return a.is_recommended ? -1 : 1;
        }
        return a.price - b.price;

      case 'price_asc':
        return a.price - b.price;

      case 'price_desc':
        return b.price - a.price;

      case 'price_per_channel_asc':
        return (a.price_per_channel || 0) - (b.price_per_channel || 0);

      case 'savings_pct_desc':
        return (b.savings_pct || 0) - (a.savings_pct || 0);

      case 'channels_desc':
        return b.channel_count - a.channel_count;

      default:
        return 0;
    }
  });

  return computed;
}
