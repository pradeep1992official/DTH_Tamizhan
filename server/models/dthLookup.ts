import { z } from 'zod';
import type { DthLookupInput, DthLookupResponse } from '../../src/lib/dthLookup';

const value = z.union([z.string(), z.number()]).nullable().optional();
const fields = ['customer_id', 'name', 'registered_mobile', 'balance', 'monthly_amount', 'status', 'plan', 'next_recharge_date', 'last_recharge_date', 'last_recharge_amount', 'switch_off_date', 'address', 'city', 'district', 'state', 'pin_code'] as const;
const providerSchema = z.object({
  success: z.boolean(), status: z.string().optional(), charged: z.boolean().optional(),
  message_code: z.string().optional(), order_id: z.string().max(200).optional(),
  data: z.object({ order_id: z.string().max(200).optional(), result: z.object(Object.fromEntries(fields.map(field => [field, value]))) .optional().nullable() }).nullable().optional(),
});
export function dthLookupConfigured() { return !!process.env.WAY2API_API_KEY?.trim(); }

export async function lookupDth(input: DthLookupInput): Promise<DthLookupResponse> {
  if (input.mode === 'demo') return {
    success: true, mode: 'demo', outcome: 'found', charged: false, reference: 'DEMO-ONLY',
    details: { customer_id: input.subscriberId, name: 'Demo customer (sample data)', registered_mobile: '98******00', balance: '125.00', plan: 'Sample pack', status: 'Sample active status' },
  };
  if (!input.consent) throw new Error('Confirm permission and lookup charges before a live lookup.');
  const key = process.env.WAY2API_API_KEY?.trim();
  if (!key) throw new Error('Add WAY2API_API_KEY to the server environment and restart the server.');
  let response: globalThis.Response;
  try {
    response = await fetch('https://app.way2api.com/api/v1/dth/info', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ dth_number: input.subscriberId, operator: input.operator }),
    });
  } catch {
    return { success: false, mode: 'live', outcome: 'failed', charged: null, reference: null, details: null,
      error: 'No response was received. Check Way2API request history before retrying; the lookup may have been billed.' };
  }
  const parsed = providerSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return { success: false, mode: 'live', outcome: 'failed', charged: null, reference: null, details: null,
    error: 'The provider returned an unreadable response. Check Way2API request history before retrying.' };
  const data = parsed.data;
  const base = { mode: 'live' as const, charged: data.charged ?? null, reference: data.order_id || data.data?.order_id || null };
  if (response.status === 202 || data.status === 'PENDING') return { ...base, success: false, outcome: 'pending', details: null,
    error: 'Lookup pending with Way2API. Check the provider dashboard using the reference below; do not immediately retry.' };
  if (!response.ok || !data.success || !data.data?.result) {
    const errors: Record<string, string> = {
      INVALID_API_KEY: 'Way2API rejected the API key or server IP.', MISSING_API_KEY: 'The provider did not accept the API key.',
      INSUFFICIENT_BALANCE: 'Way2API trial credits or wallet balance are insufficient.', NO_API_ACCESS: 'Enable DTH lookup access in your Way2API account.',
      NO_RECORD_FOUND: 'No DTH account was found for these details.', INVALID_INPUT: 'Check the operator and subscriber ID.',
      RATE_LIMITED: 'Way2API request limit reached. Please wait.', SOURCE_UNAVAILABLE: 'The operator data source is unavailable.',
    };
    return { ...base, success: false, outcome: 'failed', details: null, error: errors[data.message_code || ''] || 'The provider could not verify this DTH account. Check the provider dashboard for details.' };
  }
  const details: Record<string, string> = {};
  for (const field of fields) {
    const entry = data.data.result[field];
    if (entry !== null && entry !== undefined && String(entry).trim() && !/^(N\/A|NA)$/i.test(String(entry).trim())) details[field] = String(entry).slice(0, 1000);
  }
  return { ...base, success: true, outcome: 'found', details };
}
