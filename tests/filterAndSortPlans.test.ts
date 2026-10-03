import { describe, it, expect } from 'vitest';
import { filterAndSortPlans, computePlanMetrics } from '../src/lib/browsePlansData';
import { BrowsePlan, PlanFilters } from '../src/types';

describe('filterAndSortPlans', () => {
  const samplePlans: BrowsePlan[] = [
    {
      id: 'sun_hd_1m',
      operator: 'sun_direct',
      name: 'Sun Direct HD 1M',
      tamilName: 'சன் டைரக்ட் எச்டி 1 மாதம்',
      type: 'HD',
      duration_months: 1,
      price: 300,
      monthly_equivalent_rate: 300,
      channel_count: 200,
      hd_channel_count: 30,
      channels: ['Sun TV HD', 'KTV HD', 'Star Vijay HD'],
      genre_tags: ['tamil', 'entertainment'],
      is_recommended: true,
      description: '1 Month Sun HD pack with popular Tamil entertainment channels',
    },
    {
      id: 'sun_hd_6m',
      operator: 'sun_direct',
      name: 'Sun Direct HD 6M Saver',
      tamilName: 'சன் டைரக்ட் எச்டி 6 மாத சேமிப்பு',
      type: 'HD',
      duration_months: 6,
      price: 1500, // 250/mo -> 50/mo savings (17%)
      monthly_equivalent_rate: 250,
      channel_count: 200,
      hd_channel_count: 30,
      channels: ['Sun TV HD', 'KTV HD', 'Star Vijay HD'],
      genre_tags: ['tamil', 'entertainment', 'saver'],
      is_recommended: false,
      description: '6 Months Sun HD pack saving money',
    },
    {
      id: 'tata_sd_1m',
      operator: 'tata_play',
      name: 'Tata Play Tamil Value SD',
      tamilName: 'டாடா ப்ளே தமிழ் வேல்யூ',
      type: 'SD',
      duration_months: 1,
      price: 220,
      monthly_equivalent_rate: 220,
      channel_count: 120,
      hd_channel_count: 0,
      channels: ['Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil'],
      genre_tags: ['tamil', 'regional'],
      is_recommended: false,
      description: 'Affordable Tata Play Tamil basic pack',
    },
    {
      id: 'airtel_hd_12m',
      operator: 'airtel_dth',
      name: 'Airtel Mega HD Annual',
      tamilName: 'ஏர்டெல் மெகா எச்டி வருடாந்திரம்',
      type: 'HD',
      duration_months: 12,
      price: 3600,
      monthly_equivalent_rate: 300,
      channel_count: 300,
      hd_channel_count: 50,
      channels: ['Star Sports 1 Tamil HD', 'Sun TV HD', 'Sony Ten 1 HD'],
      genre_tags: ['tamil', 'sports', 'movies'],
      is_recommended: true,
      description: 'Annual pack for sports and entertainment lovers',
    },
    {
      id: 'dish_sd_3m',
      operator: 'dish_tv',
      name: 'Dish TV South Joy 3M',
      tamilName: 'டிஷ் டிவி சவுத் ஜாய்',
      type: 'SD',
      duration_months: 3,
      price: 450,
      monthly_equivalent_rate: 150,
      channel_count: 90,
      hd_channel_count: 0,
      channels: ['Sun News', 'Kalaignar TV', 'Captain News'],
      genre_tags: ['news', 'tamil'],
      is_recommended: false,
      description: '3 months pack with news and classic tamil channels',
    },
  ];

  const defaultFilters: PlanFilters = {
    operators: [],
    type: 'all',
    durations: [],
    priceRange: [0, 5000],
    channelRange: [0, 500],
    genreTags: [],
    searchQuery: '',
    sortBy: 'recommended',
  };

  it('returns all plans when default empty filters are applied', () => {
    const result = filterAndSortPlans(samplePlans, defaultFilters);
    expect(result).toHaveLength(5);
  });

  it('filters correctly by single or multiple operators', () => {
    const resultSunOnly = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      operators: ['sun_direct'],
    });
    expect(resultSunOnly).toHaveLength(2);
    expect(resultSunOnly.every((p) => p.operator === 'sun_direct')).toBe(true);

    const resultMultiOp = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      operators: ['sun_direct', 'tata_play'],
    });
    expect(resultMultiOp).toHaveLength(3);
    expect(resultMultiOp.every((p) => p.operator === 'sun_direct' || p.operator === 'tata_play')).toBe(true);
  });

  it('filters strictly by HD or SD pack type', () => {
    const hdOnly = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      type: 'HD',
    });
    expect(hdOnly).toHaveLength(3);
    expect(hdOnly.every((p) => p.type === 'HD')).toBe(true);

    const sdOnly = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      type: 'SD',
    });
    expect(sdOnly).toHaveLength(2);
    expect(sdOnly.every((p) => p.type === 'SD')).toBe(true);
  });

  it('filters by selected durations', () => {
    const durations1And6 = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      durations: [1, 6],
    });
    expect(durations1And6).toHaveLength(3);
    expect(durations1And6.map((p) => p.duration_months)).toEqual(expect.arrayContaining([1, 6]));
    expect(durations1And6.some((p) => p.duration_months === 3 || p.duration_months === 12)).toBe(false);
  });

  it('filters by price range', () => {
    const lowPrice = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      priceRange: [200, 500],
    });
    // Expected: sun_hd_1m (300), tata_sd_1m (220), dish_sd_3m (450)
    expect(lowPrice).toHaveLength(3);
    expect(lowPrice.every((p) => p.price >= 200 && p.price <= 500)).toBe(true);
  });

  it('filters by channel count range', () => {
    const highChannels = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      channelRange: [150, 350],
    });
    // Expected: sun_hd_1m (200), sun_hd_6m (200), airtel_hd_12m (300)
    expect(highChannels).toHaveLength(3);
    expect(highChannels.every((p) => p.channel_count >= 150 && p.channel_count <= 350)).toBe(true);
  });

  it('filters by genre tags', () => {
    const sportsOnly = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      genreTags: ['sports'],
    });
    expect(sportsOnly).toHaveLength(1);
    expect(sportsOnly[0].id).toBe('airtel_hd_12m');

    const newsOnly = filterAndSortPlans(samplePlans, {
      ...defaultFilters,
      genreTags: ['news'],
    });
    expect(newsOnly).toHaveLength(1);
    expect(newsOnly[0].id).toBe('dish_sd_3m');
  });

  describe('Search Query Filtering', () => {
    it('matches by English plan name case-insensitively', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        searchQuery: 'saver',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sun_hd_6m');
    });

    it('matches by Tamil script plan name', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        searchQuery: 'டாடா',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tata_sd_1m');
    });

    it('matches by included channel name', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        searchQuery: 'Star Sports 1 Tamil HD',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('airtel_hd_12m');
    });

    it('matches by plan description text', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        searchQuery: 'sports and entertainment lovers',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('airtel_hd_12m');
    });

    it('returns empty array when search query matches nothing', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        searchQuery: 'NonExistentPackXYZ123',
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('Sorting Algorithms', () => {
    it('sorts by recommended first, then price ascending', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        sortBy: 'recommended',
      });
      // Recommended first: sun_hd_1m (300, rec: true), airtel_hd_12m (3600, rec: true)
      expect(result[0].is_recommended).toBe(true);
      expect(result[1].is_recommended).toBe(true);
      expect(result[0].price).toBeLessThanOrEqual(result[1].price);
      // Non-recommended afterwards
      expect(result[2].is_recommended).toBe(false);
    });

    it('sorts by price_asc', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        sortBy: 'price_asc',
      });
      const prices = result.map((p) => p.price);
      expect(prices).toEqual([220, 300, 450, 1500, 3600]);
    });

    it('sorts by price_desc', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        sortBy: 'price_desc',
      });
      const prices = result.map((p) => p.price);
      expect(prices).toEqual([3600, 1500, 450, 300, 220]);
    });

    it('sorts by price_per_channel_asc', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        sortBy: 'price_per_channel_asc',
      });
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].price_per_channel!).toBeLessThanOrEqual(result[i + 1].price_per_channel!);
      }
    });

    it('sorts by channels_desc', () => {
      const result = filterAndSortPlans(samplePlans, {
        ...defaultFilters,
        sortBy: 'channels_desc',
      });
      const channels = result.map((p) => p.channel_count);
      expect(channels).toEqual([300, 200, 200, 120, 90]);
    });
  });

  describe('computePlanMetrics badges', () => {
    it('flags lowest price per channel as is_best_value', () => {
      const enriched = computePlanMetrics(samplePlans);
      const bestValuePlan = enriched.find((p) => p.is_best_value);
      expect(bestValuePlan).toBeDefined();

      const lowestPricePerChannel = Math.min(...enriched.map((p) => p.price_per_channel || Infinity));
      expect(bestValuePlan?.price_per_channel).toBe(lowestPricePerChannel);
    });

    it('flags highest savings percentage as is_best_savings', () => {
      const enriched = computePlanMetrics(samplePlans);
      // sun_hd_6m has 17% savings against sun_hd_1m
      const bestSavingsPlan = enriched.find((p) => p.is_best_savings);
      expect(bestSavingsPlan).toBeDefined();
      expect(bestSavingsPlan?.id).toBe('sun_hd_6m');
      expect(bestSavingsPlan?.savings_pct).toBe(17);
    });
  });
});
