import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ values: [] as any[], index: 0, fetch: vi.fn(), confirmed: vi.fn(), confirm: vi.fn() }));
vi.mock('react', async original => ({ ...await original<any>(), useState: (initial: any) => {
  const index = f.index++; if (!(index in f.values)) f.values[index] = initial;
  return [f.values[index], (value: any) => { f.values[index] = value; }];
} }));
import { LegacyBankPaymentConfirmation } from '../src/components/Admin/NewConnectionPaymentReview';
const order = { id: 'nc_legacy', provider: 'youpi', amountDueNow: 300, providerRaw: {}, providerPaymentId: '', ledger: [] } as any;
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : [];
function draw(value = order) {
  f.index = 0;
  return LegacyBankPaymentConfirmation({ order: value, getAuthHeaders: async () => ({ Authorization: 'Bearer admin' }), onConfirmed: f.confirmed });
}
beforeEach(() => {
  f.values = []; vi.clearAllMocks(); f.confirm.mockReturnValue(true); f.fetch.mockResolvedValue({ ok: true });
  vi.stubGlobal('window', { confirm: f.confirm }); vi.stubGlobal('fetch', f.fetch);
});
afterEach(() => vi.unstubAllGlobals());
it('offers bank verification only for existing, unconfirmed legacy payments', () => {
  expect(draw()).not.toBeNull();
  expect(draw({ ...order, provider: 'razorpay' })).toBeNull();
  expect(draw({ ...order, amountDueNow: 0 })).toBeNull();
  expect(draw({ ...order, providerPaymentId: '123456789012', ledger: [{ type: 'payment', method: 'youpi', reference: '123456789012' }] })).toBeNull();
});
async function submit() {
  let tree = nodes(draw());
  tree.find(node => node.type === 'input' && node.props.pattern).props.onChange({ target: { value: '123456789012' } });
  tree.find(node => node.type === 'textarea').props.onChange({ target: { value: 'Verified receipt in receiving bank' } });
  tree.find(node => node.props.type === 'checkbox').props.onChange({ target: { checked: true } });
  await (draw() as any).props.onSubmit({ preventDefault() {} });
}
it('submits the exact reference and bank confirmation through the existing authorized endpoint', async () => {
  await submit();
  expect(f.fetch).toHaveBeenCalledOnce();
  const [url, request] = f.fetch.mock.calls[0];
  expect(url).toBe('/api/admin/new-connection/payments/nc_legacy/confirm');
  expect(request.headers.Authorization).toBe('Bearer admin');
  expect(JSON.parse(request.body)).toEqual({ utr: '123456789012', amount: 300, note: 'Verified receipt in receiving bank', bankChecked: true });
  expect(f.confirmed).toHaveBeenCalledOnce();
});
it('keeps confirmation incomplete and displays an error after a server rejection', async () => {
  f.fetch.mockResolvedValue({ ok: false }); await submit();
  expect(f.confirmed).not.toHaveBeenCalled();
  expect(nodes(draw()).find(node => node.props.role === 'alert').props.children).toContain('Could not confirm');
});
it('does not submit when the bank confirmation is cancelled', async () => {
  f.confirm.mockReturnValue(false); await submit(); expect(f.fetch).not.toHaveBeenCalled();
});
