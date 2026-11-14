import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ account: { uid: 'owner' } as { uid: string } | null, admin: false,
  verify: vi.fn(), query: vi.fn(), events: [] as any[], failAudit: false }));
vi.mock('../server/middleware/auth', () => ({
  verifyAuthToken: f.verify,
  isCallerAdminAuthorized: async () => ({ authorized: f.admin }),
  getAdminFirestore: () => ({ collection: (name: string) => ({ doc: () => ({ create: async (event: unknown) => {
    expect(name).toBe('server_ai_tool_audit'); if (f.failAudit) throw new Error('database unavailable'); f.events.push(event);
  } }) }) }),
}));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/models/planModel', () => ({ planModel: { getForOperator: vi.fn() } }));
import { executeAssistantTool } from '../server/utils/assistantTools';
import { runAiTool, withAiRequest, auditValue } from '../server/utils/aiToolSecurity';
afterEach(() => vi.unstubAllEnvs());
const req = { headers: { authorization: 'Bearer test-token' } } as any;
beforeEach(() => { f.account = { uid: 'owner' }; f.admin = false; f.events = []; f.failAudit = false;
  f.query.mockReset(); f.verify.mockReset(); f.verify.mockImplementation(async () => f.account); });
it('does not accept a UID string as proof of authentication', async () => {
  const execute = vi.fn();
  await expect(runAiTool('customer', 'get_my_history', {}, execute, 'owner')).rejects.toThrow();
  expect(execute).not.toHaveBeenCalled();
});
it('records attempted and successful calls with the signed UID, arguments and result', async () => {
  const execute = vi.fn(async uid => ({ owner: uid, rows: [] }));
  const result = await withAiRequest(req, () => runAiTool('customer', 'get_my_history', { limit: 5 }, execute, 'owner'));
  expect(result).toEqual({ owner: 'owner', rows: [] });
  expect(f.events).toHaveLength(2);
  expect(f.events[0]).toMatchObject({ uid: 'owner', tool: 'get_my_history', arguments: { limit: 5 }, phase: 'attempt' });
  expect(f.events[1]).toMatchObject({ uid: 'owner', phase: 'result', status: 'success', result });
  expect(f.events[0].callId).toBe(f.events[1].callId);
});
it('re-verifies every call, rejects UID substitution, and logs denials without executing', async () => {
  const execute = vi.fn(async () => ({}));
  await withAiRequest(req, () => runAiTool('customer', 'navigate', {}, execute, 'owner'));
  f.account = null;
  await expect(withAiRequest(req, () => runAiTool('customer', 'get_my_history', {}, execute, 'owner'))).rejects.toThrow();
  expect(execute).toHaveBeenCalledTimes(1); expect(f.verify).toHaveBeenCalledTimes(2);
  f.account = { uid: 'victim' };
  await expect(withAiRequest(req, () => runAiTool('customer', 'get_my_history', {}, execute, 'owner'))).rejects.toThrow();
  expect(f.events.at(-1)).toMatchObject({ uid: 'victim', status: 'denied' });
});
it('rechecks admin authority on each tool, so revocation blocks the next invocation', async () => {
  const execute = vi.fn(async () => ({})); f.admin = true;
  await withAiRequest(req, () => runAiTool('admin', 'get_revenue_totals', {}, execute));
  f.admin = false;
  await expect(withAiRequest(req, () => runAiTool('admin', 'get_revenue_totals', {}, execute))).rejects.toThrow();
  expect(execute).toHaveBeenCalledTimes(1); expect(f.events.at(-1).status).toBe('denied');
});
it('fails closed when mandatory auditing is unavailable', async () => {
  f.failAudit = true; const execute = vi.fn();
  await expect(withAiRequest(req, () => runAiTool('customer', 'navigate', { page: 'home' }, execute))).rejects.toThrow('temporarily unavailable');
  expect(execute).not.toHaveBeenCalled();
});
it('records failures without provider stack traces, tokens or raw error messages', async () => {
  await expect(withAiRequest(req, () => runAiTool('customer', 'unknown', { authorization: 'Bearer confidential' }, async () => {
    throw new Error('secret raw provider stack');
  }))).rejects.toThrow();
  const logs = JSON.stringify(f.events);
  expect(logs).not.toContain('confidential'); expect(logs).not.toContain('secret raw provider stack');
  expect(f.events.at(-1)).toMatchObject({ status: 'failed', result: { error: 'tool_failed' } });
});
it('redacts secrets and bounds recursive/untrusted audit payloads', () => {
  const value: any = { password: 'never-store', text: 'Bearer confidential', huge: 'x'.repeat(10000) }; value.self = value;
  const result = JSON.stringify(auditValue(value));
  expect(result).not.toContain('never-store'); expect(result).not.toContain('confidential');
  expect(result).toContain('[TRUNCATED]'); expect(result).toContain('[CIRCULAR]');
});

it('scopes an actual customer status tool to the verified owner and suppresses foreign rows', async () => {
  f.query.mockResolvedValue([{ user_id: 'victim', orderId: 'order_1', rechargeStatus: 'completed' }]);
  const result = await withAiRequest(req, () => executeAssistantTool('get_recharge_status', { order_id: 'order_1' }, 'owner'));
  expect(f.query.mock.calls[0][1]).toContainEqual({ field: 'user_id', op: 'eq', value: 'owner' });
  expect(result).toEqual({ type: 'show_recharge_status', order: null });
});
it('rejects prompt-injected permission/query fields and admin tools in the customer registry', async () => {
  await expect(withAiRequest(req, () => executeAssistantTool('get_my_history', { limit: 5, uid: 'victim', permissions: 'admin', query: 'users' }, 'owner'))).rejects.toThrow();
  await expect(withAiRequest(req, () => executeAssistantTool('get_revenue_totals', {}, 'owner'))).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  expect(f.events.filter(event => event.phase === 'result').every(event => event.status === 'failed')).toBe(true);
});

it('redacts exact configured secret values even when echoed inside unstructured text', () => {
  vi.stubEnv('RAZORPAY_KEY_SECRET', 'fixture-secret-value-long');
  expect(JSON.stringify(auditValue({ message: 'Do not store fixture-secret-value-long here' }))).not.toContain('fixture-secret-value-long');
});
