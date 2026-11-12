import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../server/models/planModel', () => ({ planModel: { getAll: () => [] } }));
beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', ''); });
describe('unconfigured suggestion service copy', () => {
  it.each(['en', 'ta'])('does not invent a pack recommendation in %s', async preferredLanguage => {
    const { recommendPlans } = await import('../server/controllers/aiController');
    const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res);
    await recommendPlans({ body: { preferredLanguage } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].success).toBe(false);
    expect(res.json.mock.calls[0][0].recommendation).toBeUndefined();
    expect(res.json.mock.calls[0][0].error).toContain(preferredLanguage === 'ta' ? 'பரிந்துரைகள்' : 'suggestions are unavailable');
  });
});
