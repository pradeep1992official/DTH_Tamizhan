import { lookupOperatorId } from '../src/lib/dthLookup';
import { describe, expect, it } from 'vitest';
import { filterAndSortPlans } from '../src/lib/browsePlansData';
import { PlanCatalogService } from '../src/lib/planCatalogService';
import { BrowsePlan, PlanFilters } from '../src/types';

const d2hPlan: BrowsePlan = {
  id: 'd2h_hd_1m',
  operator: 'd2h',
  name: 'D2H HD Monthly',
  type: 'HD',
  duration_months: 1,
  price: 300,
  monthly_equivalent_rate: 300,
  channel_count: 150,
  hd_channel_count: 24,
  channels: [],
  genre_tags: ['entertainment'],
  is_recommended: true,
  description: 'Monthly HD pack',
};

const defaultFilters: PlanFilters = {
  operators: ['dish_tv'],
  type: 'all',
  durations: [],
  priceRange: [0, 5000],
  channelRange: [0, 500],
  genreTags: [],
  searchQuery: '',
  sortBy: 'recommended',
};

describe('Dish TV and D2H separate operators', () => {
  it('excludes D2H catalog plans when filtering Dish TV', () => {
    expect(filterAndSortPlans([d2hPlan], defaultFilters)).toHaveLength(0);
  });

  it('does not recommend a D2H pack for Dish TV', () => {
    const plans = [{
      id: d2hPlan.id,
      operator: d2hPlan.operator,
      pack_type: 'HD' as const,
      duration_months: 1 as const,
      plan_name: d2hPlan.name,
      amount: d2hPlan.price,
      is_recommended: true,
      channel_count: d2hPlan.channel_count,
      hd_channel_count: d2hPlan.hd_channel_count,
      channel_list: d2hPlan.channels,
      genre_tags: d2hPlan.genre_tags,
    }];

    expect(PlanCatalogService.getRecommendedPlan(plans, 'dish_tv', 'HD', 1)).toBeUndefined();
    expect(PlanCatalogService.getRecommendedPlan(plans, 'd2h', 'HD', 1)?.id).toBe(d2hPlan.id);
  });

  it('uses the selected operator regardless of ID prefix', () => {
    expect(lookupOperatorId('dish_tv', '07211194569')).toBe('dish_tv');
    expect(lookupOperatorId('d2h', '01512345678')).toBe('videocon_d2h');
  });
});
