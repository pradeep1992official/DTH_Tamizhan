import { beforeEach, expect, it, vi } from 'vitest';
import { helpProblems, helpInputSchema } from '../src/lib/help';
import { defaultServiceBrands } from '../src/lib/serviceBrands';
const f = vi.hoisted(() => ({ records: new Map<string, any>(), recommend: vi.fn(), owned: vi.fn(), query: vi.fn(), chain: Promise.resolve() as Promise<unknown> }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/utils/assistantTools', () => ({ executeAssistantTool: f.recommend }));
vi.mock('../server/models/serviceBrands', () => ({ readServiceBrands: async () => defaultServiceBrands }));
vi.mock('../server/models/assistantHistory', () => ({ ownedAssistantOrders: f.owned }));
vi.mock('../server/middleware/auth', () => {
  const ref = (path: string) => ({ path, id: path.split('/').at(-1), get: async () => ({ exists: f.records.has(path), data: () => structuredClone(f.records.get(path)) }) });
  const set = (value: any, data: any, options?: any) => f.records.set(value.path, options?.merge ? { ...f.records.get(value.path), ...data } : structuredClone(data));
  return { getAdminFirestore: () => ({ collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }), runTransaction: (callback: any) => {
    const result = f.chain.then(() => callback({ get: (value: any) => value.get(), set, create: set, update: (value: any, data: any) => set(value, data, { merge: true }) })); f.chain = result.catch(() => {}); return result;
  } }) };
});
import { createHelpTicket, upgradeHelpTicket, chooseCustomerCare, reclassifyHelpTicket } from '../server/models/help';
import { expireUnpaidServiceRequests } from '../server/models/serviceSchedule';
const request = { requestKey: '11111111-1111-4111-8111-111111111111', phone: '9876543210', brand: 'tata_play', subscriberId: '1234567890', fullAddress: '12 East Street, Thirukoilur, Tamil Nadu 605757', problem: 'no_signal', language: 'en' };
beforeEach(() => { f.records.clear(); f.chain = Promise.resolve(); f.recommend.mockReset(); f.owned.mockReset(); f.owned.mockResolvedValue([]); });
it('routes every named chip deterministically without Gemini or client route authority', async () => {
  for (const [problem, config] of Object.entries(helpProblems)) {
    f.records.clear();
    const ticket = await createHelpTicket('owner', { ...request, problem }, 'Customer');
    expect(ticket).toMatchObject({ status: 'open', helpRoute: config.route, type: config.route === 'free' ? 'support' : 'dth_service', payment: { required: false, amount: 0 } });
  }
  expect(f.recommend).not.toHaveBeenCalled();
  expect(helpInputSchema.safeParse({ ...request, route: 'free' }).success).toBe(false);
  expect(helpInputSchema.safeParse({ ...request, payment: { status: 'paid' } }).success).toBe(false);
});
it('uses classification only for other, defaults uncertain classification to free and creates no checkout', async () => {
  f.recommend.mockResolvedValue({ type: 'support_recommendation', recommendation: { route: 'dth_service', confident: false, category: 'other', summary: 'Please review this issue.' } });
  const ticket = await createHelpTicket('owner', { ...request, problem: 'other', description: 'Some unclear issue today.', subscriberId: '' }, 'Customer');
  expect(ticket.helpRoute).toBe('free'); expect(ticket.payment.gatewayOrderId).toBeNull();
  expect(f.recommend).toHaveBeenCalledWith('recommend_support_option', { problem_text: 'Some unclear issue today.' }, 'owner');
});
it('upgrades the SAME ticket once, preserves ticket number and records history without marking paid', async () => {
  const ticket = await createHelpTicket('owner', request, 'Customer');
  const args = { brand: 'tata_play', subscriberId: '1234567890', acceptedTerms: true };
  const upgraded = await upgradeHelpTicket('owner', ticket.id, args);
  const retry = await upgradeHelpTicket('owner', ticket.id, args);
  expect(upgraded).toMatchObject({ id: ticket.id, ticketNo: ticket.ticketNo, type: 'service_request', status: 'pending_payment', payment: { required: true, amount: 50, paidAt: null } });
  expect(upgraded.statusHistory.at(-1)?.event).toBe('upgraded'); expect(retry.statusHistory).toHaveLength(2);
  expect([...f.records.keys()].filter(key => key.startsWith('tickets/'))).toHaveLength(1);
});
it('keeps a customer-care choice free, with history, and lets admins reclassify before an upgrade', async () => {
  const ticket = await createHelpTicket('owner', request, 'Customer');
  const called = await chooseCustomerCare('owner', ticket.id);
  expect(called).toMatchObject({ type: 'support', status: 'open', payment: { amount: 0, required: false } });
  expect(called.statusHistory.at(-1)?.event).toBe('customer_care_selected');
  const reclassified = await reclassifyHelpTicket(ticket.id, 'admin', 'free', 'Website issue after review');
  expect(reclassified.statusHistory.at(-1)?.event).toBe('reclassified_free');
  const upgraded = await upgradeHelpTicket('', ticket.id, { brand: 'tata_play', subscriberId: '1234567890', acceptedTerms: true }, 'admin', true);
  expect(upgraded.id).toBe(ticket.id); expect(upgraded.payment.paidAt).toBeNull();
});
it('checks ownership, linked orders, duplicate open requests and strict inputs', async () => {
  await expect(createHelpTicket('owner', { ...request, problem: 'recharge_failed', orderId: 'foreign' }, 'Customer')).rejects.toThrow('own account');
  const ticket = await createHelpTicket('owner', request, 'Customer');
  await expect(upgradeHelpTicket('other', ticket.id, { brand: 'tata_play', subscriberId: '1234567890', acceptedTerms: true })).rejects.toThrow('not found');
  await expect(createHelpTicket('owner', { ...request, requestKey: '22222222-2222-4222-8222-222222222222' }, 'Customer')).rejects.toThrow('already have');
  expect(helpInputSchema.safeParse({ ...request, description: 'x'.repeat(1001) }).success).toBe(false);
});
it('starts unpaid expiry at upgrade, not the original free-ticket creation date', async () => {
  const ticket = await createHelpTicket('owner', request, 'Customer');
  f.records.get(`tickets/${ticket.id}`).createdAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const now = Date.now(); const upgraded = await upgradeHelpTicket('owner', ticket.id, { brand: 'tata_play', subscriberId: '1234567890', acceptedTerms: true }, 'owner', false, now);
  f.query.mockResolvedValue([upgraded]);
  await expireUnpaidServiceRequests(now + 5 * 60_000);
  expect(f.records.get(`tickets/${ticket.id}`).status).toBe('pending_payment');
  await expireUnpaidServiceRequests(now + 31 * 60_000);
  expect(f.records.get(`tickets/${ticket.id}`).status).toBe('expired');
});
it('requires a full address for DTH intake and upgrades, but not free help', async () => {
  await expect(createHelpTicket('owner', { ...request, fullAddress: '' }, 'Customer')).rejects.toThrow('full address');
  const free = await createHelpTicket('owner', { ...request, problem: 'website_issue', fullAddress: '' }, 'Customer');
  expect(free.fullAddress).toBe('');
  f.records.clear();
  f.recommend.mockResolvedValue({ type: 'support_recommendation', recommendation: { route: 'dth_service', confident: true, category: 'no_signal', summary: 'There is no signal.' } });
  const ticket = await createHelpTicket('owner', { ...request, problem: 'other', description: 'There is no signal.', fullAddress: '', subscriberId: '' }, 'Customer');
  const args = { acceptedTerms: true, brand: 'tata_play', subscriberId: '1234567890' };
  await expect(upgradeHelpTicket('owner', ticket.id, args)).rejects.toThrow();
  const upgraded = await upgradeHelpTicket('owner', ticket.id, { ...args, fullAddress: '<b>12 East Street</b>, Thirukoilur, Tamil Nadu 605757' });
  expect(upgraded.fullAddress).toBe('12 East Street, Thirukoilur, Tamil Nadu 605757');
});
