import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
import { assistantHistory } from '../server/models/assistantHistory';
import { executeAssistantTool } from '../server/utils/assistantTools';
import { actionNotice, rechargeExplanation } from '../src/lib/assistantActions';
const base = { user_id: 'owner', orderId: 'order_1', rechargeStatus: 'completed', paymentStatus: 'paid',
  amount: 299, packName: 'Tamil HD', createdAt: '2026-11-14T00:00:00Z', workerNotes: 'private', smartCardNumber: '1234567890' };
beforeEach(() => { f.query.mockReset(); f.query.mockResolvedValue([base]); });
it('scopes history to verified UID in Firestore before sorting and limiting', async () => {
  const result = await executeAssistantTool('get_my_history', { limit: 5 }, 'owner');
  expect(f.query).toHaveBeenCalledWith('server_recharges', [{ field: 'user_id', op: 'eq', value: 'owner' }], { limit: 5, idField: 'orderId' });
  expect(result).toMatchObject({ type: 'show_history', orders: [{ orderId: 'order_1', status: 'success' }] });
  expect(JSON.stringify(result)).not.toContain('private'); expect(JSON.stringify(result)).not.toContain('1234567890');
});
it('queries order ID and verified UID together and never reveals another owner?s order', async () => {
  f.query.mockResolvedValue([{ ...base, user_id: 'other' }]);
  expect(await executeAssistantTool('get_recharge_status', { order_id: 'order_1' }, 'owner')).toEqual({ type: 'show_recharge_status', order: null });
  expect(f.query).toHaveBeenCalledWith('server_recharges', [{ field: 'user_id', op: 'eq', value: 'owner' }, { field: 'orderId', op: 'eq', value: 'order_1' }], { limit: 1, idField: 'orderId' });
});
it('rejects UID injection, missing identity, malformed IDs and invalid limits without querying', async () => {
  for (const [name, args] of [['get_my_history', { limit: 5, uid: 'other' }], ['get_recharge_status', { order_id: 'order_1', uid: 'other' }],
    ['get_my_history', { limit: 0 }], ['get_my_history', { limit: 21 }], ['get_my_history', { limit: 1.5 }],
    ['get_recharge_status', { order_id: '../other/order' }]]) await expect(executeAssistantTool(name, args, 'owner')).rejects.toThrow();
  await expect(executeAssistantTool('get_my_history', { limit: 5 }, '')).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
});
it('maps fulfillment states honestly, offers refund review for failure, and distinguishes test orders', async () => {
  for (const [raw, status] of [['completed', 'success'], ['pending', 'pending'], ['processing', 'pending'], ['failed', 'failed'], ['unrecognized', 'unknown']]) {
    f.query.mockResolvedValue([{ ...base, rechargeStatus: raw, testMode: true }]);
    const [order] = await assistantHistory('owner', 1);
    expect(order.status).toBe(status); expect(rechargeExplanation(order)).toContain('Test order:');
    if (status === 'failed') expect(rechargeExplanation(order)).toContain('refund request');
  }
});
it('returns indistinguishable missing results and fails closed on database failures', async () => {
  f.query.mockResolvedValue([]);
  const result = await executeAssistantTool('get_recharge_status', { order_id: 'missing' }, 'owner');
  expect(actionNotice(result)).toContain('No matching order');
  f.query.mockRejectedValue(new Error('offline'));
  await expect(executeAssistantTool('get_my_history', { limit: 5 }, 'owner')).rejects.toThrow('offline');
});
