import { describe, it, expect } from 'vitest';
import { calculateSavings, PlanCatalogService } from '../src/lib/planCatalogService';
import { PlanCatalogItem } from '../src/types';

describe('calculateSavings', () => {
  const samplePlans: PlanCatalogItem[] = [
    {
      id: 'sun_hd_1m',
      operator: 'sun_direct',
      pack_type: 'HD',
      duration_months: 1,
      plan_name: 'Sun Prime HD 1M',
      amount: 300,
      price: 300,
      is_recommended: true,
      channel_count: 210,
      hd_channel_count: 32,
      channel_list: ['Sun TV HD', 'KTV HD'],
      genre_tags: ['tamil'],
    },
    {
      id: 'sun_hd_3m',
      operator: 'sun_direct',
      pack_type: 'HD',
      duration_months: 3,
      plan_name: 'Sun Prime HD 3M',
      amount: 810, // 270/mo vs 300/mo -> save 30/mo (10%)
      price: 810,
      is_recommended: true,
      channel_count: 210,
      hd_channel_count: 32,
      channel_list: ['Sun TV HD', 'KTV HD'],
      genre_tags: ['tamil'],
    },
    {
      id: 'sun_hd_6m',
      operator: 'sun_direct',
      pack_type: 'HD',
      duration_months: 6,
      plan_name: 'Sun Prime HD 6M',
      amount: 1500, // 250/mo vs 300/mo -> save 50/mo (17%)
      price: 1500,
      is_recommended: true,
      channel_count: 210,
      hd_channel_count: 32,
      channel_list: ['Sun TV HD', 'KTV HD'],
      genre_tags: ['tamil'],
    },
    {
      id: 'sun_hd_12m',
      operator: 'sun_direct',
      pack_type: 'HD',
      duration_months: 12,
      plan_name: 'Sun Prime HD 12M',
      amount: 2700, // 225/mo vs 300/mo -> save 75/mo (25%)
      price: 2700,
      is_recommended: true,
      channel_count: 210,
      hd_channel_count: 32,
      channel_list: ['Sun TV HD', 'KTV HD'],
      genre_tags: ['tamil'],
    },
    {
      id: 'sun_sd_1m',
      operator: 'sun_direct',
      pack_type: 'SD',
      duration_months: 1,
      plan_name: 'Sun Value SD 1M',
      amount: 200,
      price: 200,
      is_recommended: true,
      channel_count: 145,
      hd_channel_count: 0,
      channel_list: ['Sun TV', 'KTV'],
      genre_tags: ['tamil'],
    },
    {
      id: 'sun_sd_6m_no_discount',
      operator: 'sun_direct',
      pack_type: 'SD',
      duration_months: 6,
      plan_name: 'Sun Value SD 6M',
      amount: 1200, // 200/mo -> exact same, 0 savings
      price: 1200,
      is_recommended: true,
      channel_count: 145,
      hd_channel_count: 0,
      channel_list: ['Sun TV', 'KTV'],
      genre_tags: ['tamil'],
    },
  ];

  it('returns 0 savings for 1-month duration plan but returns correct 1-month rate', () => {
    const result = calculateSavings(samplePlans, 'sun_direct', 'HD', 1);
    expect(result.savePerMonth).toBe(0);
    expect(result.percentSave).toBe(0);
    expect(result.oneMonthRate).toBe(300);
  });

  it('calculates correct savings for 3-month duration plan', () => {
    // 300 baseline - (810/3 = 270) = 30 saved per month. 30/300 = 10%
    const result = calculateSavings(samplePlans, 'sun_direct', 'HD', 3);
    expect(result.savePerMonth).toBe(30);
    expect(result.percentSave).toBe(10);
    expect(result.oneMonthRate).toBe(300);
  });

  it('calculates correct savings for 6-month duration plan', () => {
    // 300 baseline - (1500/6 = 250) = 50 saved per month. 50/300 = 16.67% -> 17%
    const result = calculateSavings(samplePlans, 'sun_direct', 'HD', 6);
    expect(result.savePerMonth).toBe(50);
    expect(result.percentSave).toBe(17);
    expect(result.oneMonthRate).toBe(300);
  });

  it('calculates correct savings for 12-month duration plan', () => {
    // 300 baseline - (2700/12 = 225) = 75 saved per month. 75/300 = 25%
    const result = calculateSavings(samplePlans, 'sun_direct', 'HD', 12);
    expect(result.savePerMonth).toBe(75);
    expect(result.percentSave).toBe(25);
    expect(result.oneMonthRate).toBe(300);
  });

  it('returns 0 savings when multi-month pack offers no discount over 1-month rate', () => {
    const result = calculateSavings(samplePlans, 'sun_direct', 'SD', 6);
    expect(result.savePerMonth).toBe(0);
    expect(result.percentSave).toBe(0);
    expect(result.oneMonthRate).toBe(200);
  });

  it('returns 0 savings if 1-month baseline plan does not exist in catalog', () => {
    const result = calculateSavings(samplePlans, 'tata_play', 'HD', 6);
    expect(result.savePerMonth).toBe(0);
    expect(result.percentSave).toBe(0);
    expect(result.oneMonthRate).toBe(0);
  });

  it('returns 0 savings if requested duration plan does not exist in catalog', () => {
    const result = calculateSavings(samplePlans, 'sun_direct', 'SD', 12);
    expect(result.savePerMonth).toBe(0);
    expect(result.percentSave).toBe(0);
    expect(result.oneMonthRate).toBe(200);
  });

  it('handles empty plan array safely', () => {
    const result = calculateSavings([], 'sun_direct', 'HD', 6);
    expect(result.savePerMonth).toBe(0);
    expect(result.percentSave).toBe(0);
    expect(result.oneMonthRate).toBe(0);
  });

  it('prefers recommended plan over non-recommended plan for 1-month baseline', () => {
    const plansWithBoth: PlanCatalogItem[] = [
      {
        id: 'p_non_rec',
        operator: 'airtel_dth',
        pack_type: 'HD',
        duration_months: 1,
        plan_name: 'Airtel Standard HD',
        amount: 400,
        price: 400,
        is_recommended: false,
        channel_count: 100,
        hd_channel_count: 10,
        channel_list: [],
        genre_tags: [],
      },
      {
        id: 'p_rec',
        operator: 'airtel_dth',
        pack_type: 'HD',
        duration_months: 1,
        plan_name: 'Airtel Prime HD (Recommended)',
        amount: 350,
        price: 350,
        is_recommended: true,
        channel_count: 150,
        hd_channel_count: 20,
        channel_list: [],
        genre_tags: [],
      },
      {
        id: 'p_rec_6m',
        operator: 'airtel_dth',
        pack_type: 'HD',
        duration_months: 6,
        plan_name: 'Airtel Prime HD 6M',
        amount: 1800, // 300/mo vs 350/mo baseline -> 50/mo (14%)
        price: 1800,
        is_recommended: true,
        channel_count: 150,
        hd_channel_count: 20,
        channel_list: [],
        genre_tags: [],
      },
    ];

    const result = PlanCatalogService.calculateSavings(plansWithBoth, 'airtel_dth', 'HD', 6);
    expect(result.oneMonthRate).toBe(350);
    expect(result.savePerMonth).toBe(50);
    expect(result.percentSave).toBe(14);
  });
});
