import { describe, expect, it } from 'vitest';
import { filterAndSortPlans } from '../src/lib/browsePlansData';
import { PlanCatalogService } from '../src/lib/planCatalogService';
import { BrowsePlan, PlanFilters, resolveDishFamilyOperatorId } from '../src/types';

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

describe('Dish TV and D2H shared operator group', () => {
  it('includes D2H catalog plans when filtering the combined operator', () => {
    expect(filterAndSortPlans([d2hPlan], defaultFilters)).toHaveLength(1);
  });

  it('finds D2H recommendations when querying Dish TV', () => {
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

    expect(PlanCatalogService.getRecommendedPlan(plans, 'dish_tv', 'HD', 1)?.id).toBe(d2hPlan.id);
  });

  it('routes Dish TV subscriber prefixes and defaults other IDs to D2H', () => {
    expect(resolveDishFamilyOperatorId('01512345678')).toBe('dish_tv');
    expect(resolveDishFamilyOperatorId('02512345678')).toBe('dish_tv');
    expect(resolveDishFamilyOperatorId('12345678')).toBe('d2h');
  });
});
