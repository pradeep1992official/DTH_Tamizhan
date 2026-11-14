vi.mock('../server/utils/aiToolSecurity', () => ({ runAiTool: async (_scope: string, _name: unknown, _args: unknown, execute: (uid: string) => Promise<unknown>, uid = 'admin-test') => execute(uid) }));
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ recharges: vi.fn(), tickets: vi.fn(), pending: vi.fn() }));
vi.mock('../server/models/adminAiData', () => ({ overallPendingRecharges: f.pending, queryAdminRecharges: f.recharges, openSupportTickets: f.tickets }));
import { executeAdminTool, indiaDateRange, adminToolDefinitions } from '../server/utils/adminAiTools';
beforeEach(() => { f.recharges.mockReset(); f.tickets.mockReset(); f.recharges.mockResolvedValue([]); f.tickets.mockResolvedValue([]); });
it('only exposes strict read-only tools', () => {
  expect(adminToolDefinitions.map(tool => tool.name)).toEqual(['get_revenue_totals', 'get_recharge_totals', 'list_pending_recharges', 'query_recharges', 'list_open_tickets']);
  for (const tool of adminToolDefinitions) expect(tool.parametersJsonSchema).toMatchObject({ additionalProperties: false });
});
it('rejects raw queries, extra fields, unknown tools and invalid limits before data reads', async () => {
  for (const [name, args] of [['delete_ticket', {}], ['__proto__', {}], ['query_recharges', { query: 'DELETE FROM orders' }],
    ['query_recharges', { status: 'failed', start_date: '2026-11-13', end_date: '2026-11-13', limit: 20, collection: 'users' }],
    ['query_recharges', { status: 'failed', start_date: '2026-02-30', end_date: '2026-03-01', limit: 20 }],
    ['query_recharges', { status: 'refunded', start_date: '2026-11-13', end_date: '2026-11-13', limit: 20 }],
    ['list_open_tickets', { kind: 'all', limit: 1000 }]]) await expect(executeAdminTool(name, args)).rejects.toThrow();
  expect(f.recharges).not.toHaveBeenCalled(); expect(f.tickets).not.toHaveBeenCalled();
});
it('binds yesterday to the entire India calendar day rather than server-local time', async () => {
  const result = await executeAdminTool('query_recharges', { status: 'failed', start_date: '2026-11-13', end_date: '2026-11-13', limit: 20 });
  expect(f.recharges).toHaveBeenCalledWith('failed', '2026-11-12T18:29:59.999Z', '2026-11-13T18:29:59.999Z', 20);
  expect(result).toMatchObject({ type: 'recharges', timezone: 'Asia/Kolkata', rows: [] });
});
it('rejects inverted and oversized ranges and accepts leap days', () => {
  expect(() => indiaDateRange('2026-11-14', '2026-11-13')).toThrow();
  expect(() => indiaDateRange('2026-01-01', '2026-02-02')).toThrow();
  expect(indiaDateRange('2028-02-29', '2028-02-29').through).toBe('2028-02-29T18:29:59.999Z');
});
it('uses only the registered ticket-kind and bounded limit', async () => {
  await executeAdminTool('list_open_tickets', { kind: 'refund', limit: 10 });
  expect(f.tickets).toHaveBeenCalledWith('refund', 10);
});

it('loads the full pending backlog through India today without a start-date cutoff', async () => {
  f.pending.mockResolvedValue({ rows: [{ orderId: 'old', createdAt: '2025-01-01T00:00:00Z', status: 'pending' }], nextCursor: null });
  const result = await executeAdminTool('list_pending_recharges', { limit: 100 }, Date.parse('2026-11-13T20:00:00Z'));
  expect(f.pending).toHaveBeenCalledWith('2026-11-14T18:29:59.999Z', 100, undefined);
  expect(result).toMatchObject({ type: 'pending_recharges', through_date: '2026-11-14', rows: [{ orderId: 'old' }] });
});
