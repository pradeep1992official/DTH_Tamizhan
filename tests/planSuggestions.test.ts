import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ account: { uid: 'customer' } as any, rank: vi.fn(), plans: [] as any[] }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async () => fixture.account }));
vi.mock('../server/models/planModel', () => ({ planModel: { getAll: async () => fixture.plans } }));
vi.mock('../server/utils/freeTierAi', () => ({ freeTierRank: fixture.rank, FreeAiUnavailable: class extends Error {} }));
import { recommendPlans } from '../server/controllers/aiController';
const base = { id: 'pack', operator: 'airtel_dth', pack_type: 'HD', duration_months: 6, plan_name: 'Tamil HD', amount: 1396,
  channel_list: [], is_recommended: false, channel_counts_unavailable: true };
beforeEach(() => { fixture.account = { uid: 'customer' }; fixture.plans = [base]; fixture.rank.mockReset(); fixture.rank.mockRejectedValue(new Error('Unavailable')); });
async function request(body: object = {}) { const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }; res.status.mockReturnValue(res); await recommendPlans({ body } as any, res as any); return res; }
it('requires sign-in and validates budgets before using the provider', async () => {
  fixture.account = null; expect((await request()).status).toHaveBeenCalledWith(401);
  fixture.account = { uid: 'customer' }; expect((await request({ monthlyBudget: -1 })).status).toHaveBeenCalledWith(400); expect(fixture.rank).not.toHaveBeenCalled();
});
it('provides catalog suggestions when free AI is unavailable, using accurate pack totals and monthly rates', async () => {
  const res = await request({ monthlyBudget: 300, duration: 6, quality: 'HD' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'catalog', plans: [expect.objectContaining({ id: 'pack', amount: 1396, monthlyRate: 232.67, duration: 6 })] }));
});
it('respects budget, operator, duration and quality without asking Gemini when none match', async () => {
  for (const body of [{ monthlyBudget: 100 }, { operator: 'sun_direct' }, { duration: 12 }, { quality: 'SD' }]) expect((await request(body)).json).toHaveBeenCalledWith(expect.objectContaining({ plans: [], notice: 'no_matches' }));
  expect(fixture.rank).not.toHaveBeenCalled();
});
it('labels AI selections and takes all displayed facts from the real catalog', async () => {
  fixture.rank.mockResolvedValue(['pack']); const res = await request();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai', plans: [expect.objectContaining({ name: 'Tamil HD', amount: 1396 })] }));
});
it('shows the Sun Direct Telugu option honestly above budget instead of unrelated packs', async () => {
  fixture.plans = [
    { ...base, id: 'joy', operator: 'sun_direct', plan_name: 'Joy', duration_months: 1, amount: 199 },
    { ...base, id: 'telugu', operator: 'sun_direct', plan_name: 'Tamil Telugu Jodi', duration_months: 1, amount: 329 },
  ];
  const res = await request({ preferences: 'Telugu', monthlyBudget: 300, duration: 1 });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ notice: 'over_budget', monthlyBudget: 300, plans: [expect.objectContaining({ id: 'telugu', amount: 329 })] }));
  expect(fixture.rank).not.toHaveBeenCalled();
});
it('restricts AI language candidates and recognizes Telugu in Tamil script', async () => {
  fixture.plans = [
    { ...base, id: 'joy', operator: 'sun_direct', plan_name: 'Joy', duration_months: 1, amount: 199 },
    { ...base, id: 'telugu', operator: 'sun_direct', plan_name: 'Tamil Telugu Jodi', duration_months: 1, amount: 329 },
  ];
  fixture.rank.mockResolvedValue(['telugu']);
  const res = await request({ preferences: 'தெலுங்கு', monthlyBudget: 350, duration: 1 });
  expect(fixture.rank.mock.calls[0][1].map((plan: any) => plan.id)).toEqual(['telugu']);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai', plans: [expect.objectContaining({ id: 'telugu' })] }));
});
it('includes all valid Malayalam durations for a generous budget and any duration', async () => {
  fixture.plans = [
    { ...base, id: 'other', operator: 'sun_direct', plan_name: 'Joy', duration_months: 1, amount: 199 },
    ...[1, 3, 6].map((months, index) => ({ ...base, id: `malayalam-${months}`, operator: 'sun_direct', plan_name: 'Tamil Malayalam Jodi', duration_months: months, amount: [327, 987, 1797][index] })),
  ];
  fixture.rank.mockResolvedValue(['malayalam-1', 'malayalam-3', 'malayalam-6']);
  const res = await request({ preferences: 'Malayalam', monthlyBudget: 5000, duration: 0 });
  expect(fixture.rank.mock.calls[0][1].map((plan: any) => plan.id).sort()).toEqual(['malayalam-1', 'malayalam-3', 'malayalam-6']);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'ai', plans: expect.arrayContaining([expect.objectContaining({ name: 'Tamil Malayalam Jodi', amount: 327 })]) }));
});
