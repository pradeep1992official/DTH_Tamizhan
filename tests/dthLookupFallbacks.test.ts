import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { dthLookupConfigured, dthLookupProviders, lookupDth } from '../server/models/dthLookup';
const input = { mode: 'live' as const, operator: 'airtel_dth' as const, subscriberId: '3012012012', consent: true };
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const mapping = { successPath: 'ok', successValue: true, fields: { name: 'account.fullName', balance: 'account.amount', customer_id: 'account.id' } };
beforeEach(() => {
  vi.stubEnv('WAY2API_API_KEY', 'way-secret'); vi.stubEnv('PLANAPI_MEMBER_ID', 'plan-member');
  vi.stubEnv('PLANAPI_API_PASSWORD', 'plan-secret'); vi.stubEnv('DATAYUGE_API_KEY', 'data-secret');
  vi.stubEnv('DATAYUGE_DTH_RESPONSE_MAP', JSON.stringify(mapping));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('falls back from explicit unbilled Way2API exhaustion to PlanAPI and normalises its fields', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(reply({ success: false, charged: false, message_code: 'INSUFFICIENT_BALANCE' }, 402))
    .mockResolvedValueOnce(reply({ error: '0', DATA: { VC: input.subscriberId, Name: 'Customer', Balance: 0, Monthly: '250', Plan: '', 'PIN Code': '600001' } }));
  vi.stubGlobal('fetch', fetcher); const before = vi.fn().mockResolvedValue(undefined);
  const result = await lookupDth(input, 'auto', before);
  expect(result.provider).toBe('planapi'); expect(result.success).toBe(true);
  expect(result.details).toEqual({ customer_id: input.subscriberId, name: 'Customer', balance: '0', monthly_amount: '250', pin_code: '600001' });
  const url = new URL(fetcher.mock.calls[1][0]);
  expect(url.origin).toBe('https://planapi.in'); expect(url.pathname).toBe('/api/Mobile/DTHINFOCheck');
  expect(url.searchParams.get('Opcode')).toBe('24'); expect(url.searchParams.get('api_password')).toBe('plan-secret');
  expect(result.attempts).toHaveLength(2); expect(before).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(result)).not.toContain('plan-secret');
});
it.each([
  { success: false, charged: true, message_code: 'NO_RECORD_FOUND' },
  { success: false, charged: true, status: 'PENDING' },
  { success: false, charged: true, message_code: 'SOURCE_UNAVAILABLE' },
  { success: false, charged: false, message_code: 'INVALID_INPUT' },
  { success: false, message_code: 'INSUFFICIENT_BALANCE' },
])('does not run another provider after charged, pending, invalid or uncertain results: %j', async body => {
  const fetcher = vi.fn().mockResolvedValue(reply(body)); vi.stubGlobal('fetch', fetcher);
  await lookupDth(input); expect(fetcher).toHaveBeenCalledOnce();
});
it('stops after a timeout or malformed response instead of guessing whether a call was billed', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(reply({ unexpected: true }));
  vi.stubGlobal('fetch', fetcher);
  expect((await lookupDth(input)).charged).toBeNull(); expect(fetcher).toHaveBeenCalledOnce();
  expect((await lookupDth(input)).charged).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('uses verified DataYuge mapping and operator codes after PlanAPI auth rejection', async () => {
  vi.stubEnv('WAY2API_API_KEY', '');
  const fetcher = vi.fn().mockResolvedValueOnce(reply({ ERROR: '1', STATUS: '3', MESSAGE: 'Authentication failed' }))
    .mockResolvedValueOnce(reply({ ok: true, account: { fullName: 'Test name', amount: '150', id: input.subscriberId }, extra: 'not returned' }));
  vi.stubGlobal('fetch', fetcher);
  const result = await lookupDth(input);
  expect(result.provider).toBe('datayuge'); expect(result.details).toEqual({ name: 'Test name', balance: '150', customer_id: input.subscriberId });
  const url = new URL(fetcher.mock.calls[1][0]);
  expect(url.origin).toBe('https://api.datayuge.com'); expect(url.pathname).toBe('/api/v1/dth/customer/details');
  expect(url.searchParams.get('operator_code')).toBe('ART'); expect(url.searchParams.get('customer_id')).toBe(input.subscriberId);
  expect(JSON.stringify(result)).not.toContain('data-secret');
});
it('keeps DataYuge disabled without a verified response contract', async () => {
  vi.stubEnv('WAY2API_API_KEY', ''); vi.stubEnv('PLANAPI_MEMBER_ID', ''); vi.stubEnv('DATAYUGE_DTH_RESPONSE_MAP', '');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect(dthLookupProviders().find(provider => provider.id === 'datayuge')).toMatchObject({ configured: true, ready: false });
  expect(dthLookupConfigured()).toBe(false);
  await expect(lookupDth(input)).rejects.toThrow('Configure'); expect(fetcher).not.toHaveBeenCalled();
});
it('allows explicit provider tests without contacting other configured providers', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply({ error: '0', DATA: { Name: 'Plan test' } })); vi.stubGlobal('fetch', fetcher);
  expect((await lookupDth(input, 'planapi')).provider).toBe('planapi');
  expect(fetcher).toHaveBeenCalledOnce(); expect(new URL(fetcher.mock.calls[0][0]).hostname).toBe('planapi.in');
});
it('does not fall through an ambiguous PlanAPI error to DataYuge', async () => {
  vi.stubEnv('WAY2API_API_KEY', '');
  const fetcher = vi.fn().mockResolvedValue(reply({ error: '7', DATA: null, Message: 'Customer ID invalid' })); vi.stubGlobal('fetch', fetcher);
  expect((await lookupDth(input)).success).toBe(false); expect(fetcher).toHaveBeenCalledOnce();
});
it('reserves customer quota for every attempted provider and stops when it is exhausted', async () => {
  const fetcher = vi.fn().mockResolvedValue(reply({ success: false, charged: false, message_code: 'RATE_LIMITED' }, 429)); vi.stubGlobal('fetch', fetcher);
  const before = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('daily budget'));
  await expect(lookupDth(input, 'auto', before)).rejects.toThrow('daily budget');
  expect(fetcher).toHaveBeenCalledOnce();
});
