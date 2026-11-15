import { documentKey, mutateRecord } from '../persistence';
import { lookupDth } from './dthLookup';
import type { DthLookupInput, CustomerDthLookupResponse } from '../../src/lib/dthLookup';

// Short-lived, per-account memory cache. No customer lookup profiles are written to disk.
const cache = new Map<string, { until: number; result: CustomerDthLookupResponse }>();
const pending = new Map<string, Promise<CustomerDthLookupResponse>>();
const allowedFields = ['name', 'balance', 'plan', 'monthly_amount', 'next_recharge_date', 'last_recharge_date', 'last_recharge_amount', 'switch_off_date', 'status'];
export class LookupLimitError extends Error {}
async function reserveBudget(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  const configured = Number(process.env.DTH_CUSTOMER_LOOKUP_DAILY_LIMIT || 100);
  const appLimit = Number.isSafeInteger(configured) && configured > 0 ? Math.min(configured, 500) : 100;
  for (const [scope, limit] of [[`user:${uid}`, 20], ['app', appLimit]] as const) {
    await mutateRecord<{ count: number; day: string }>('server_runtime', documentKey(`dth-lookup:${scope}:${day}`), previous => {
      const count = previous?.count || 0;
      if (count >= limit) throw new LookupLimitError('Daily lookup limit reached. You can still enter your details manually.');
      return { count: count + 1, day };
    });
  }
}
export async function customerDthLookup(uid: string, input: Pick<DthLookupInput, 'operator' | 'subscriberId'>): Promise<CustomerDthLookupResponse> {
  const key = documentKey(`${uid}:${input.operator}:${input.subscriberId}`);
  const now = Date.now();
  for (const [id, entry] of cache) if (entry.until <= now) cache.delete(id);
  const found = cache.get(key);
  if (found) return { ...found.result, cached: true };
  const running = pending.get(key);
  if (running) return running;
  const response = await lookupDth({ ...input, mode: 'live', consent: true }, 'auto', () => reserveBudget(uid));
  const job = (async () => {
    const details = response.success && response.details
      ? Object.fromEntries(allowedFields.filter(field => response.details![field] !== undefined).map(field => [field, response.details![field]])) : null;
    const result: CustomerDthLookupResponse = {
      success: response.success, details, cached: false, checkedAt: new Date().toISOString(),
      ...(!response.success && { error: response.outcome === 'pending' || response.charged === null ? 'The details check is delayed. Please wait before trying again, or continue manually.' : 'We could not check this account. Confirm the operator and number, or continue manually.' }),
    };
    if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: Date.now() + (result.success ? 5 * 60_000 : 60_000), result });
    return result;
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}
