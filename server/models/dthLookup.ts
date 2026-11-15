import { z } from 'zod';
import type { DthLookupInput, DthLookupResponse } from '../../src/lib/dthLookup';
import { fallbackProviderStatus, lookupFallbackProvider } from './dthLookupFallbacks';
import type { DthLookupProvider, LookupProviderStatus } from '../../src/lib/dthLookup';

const value = z.union([z.string(), z.number()]).nullable().optional();
const fields = ['customer_id', 'name', 'registered_mobile', 'balance', 'monthly_amount', 'status', 'plan', 'next_recharge_date', 'last_recharge_date', 'last_recharge_amount', 'switch_off_date', 'address', 'city', 'district', 'state', 'pin_code'] as const;
const providerSchema = z.object({
  success: z.boolean(), status: z.string().optional(), charged: z.boolean().optional(),
  message_code: z.string().optional(), order_id: z.string().max(200).optional(),
  data: z.object({ order_id: z.string().max(200).optional(), result: z.object(Object.fromEntries(fields.map(field => [field, value]))) .optional().nullable() }).nullable().optional(),
});
export function dthLookupProviders(): LookupProviderStatus[] {
  const configured = !!process.env.WAY2API_API_KEY?.trim();
  return [{ id: 'way2api', configured, ready: configured, note: configured ? 'Primary provider' : 'Set WAY2API_API_KEY' }, ...fallbackProviderStatus()];
}
export function dthLookupConfigured() { return dthLookupProviders().some(provider => provider.ready); }

async function lookupWay2Dth(input: DthLookupInput): Promise<DthLookupResponse> {
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
    const fallbackSafe = data.charged === false && ['MISSING_API_KEY', 'INVALID_API_KEY', 'INSUFFICIENT_BALANCE', 'NO_API_ACCESS', 'RATE_LIMITED', 'REQUEST_FAILED', 'NOT_FOUND', 'INTERNAL_ERROR', 'PROVIDER_UNAVAILABLE'].includes(data.message_code || '');
    return { ...base, fallbackSafe, success: false, outcome: 'failed', details: null, error: errors[data.message_code || ''] || 'The provider could not verify this DTH account. Check the provider dashboard for details.' };
  }
  const details: Record<string, string> = {};
  for (const field of fields) {
    const entry = data.data.result[field];
    if (entry !== null && entry !== undefined && String(entry).trim() && !/^(N\/A|NA)$/i.test(String(entry).trim())) details[field] = String(entry).slice(0, 1000);
  }
  return { ...base, success: true, outcome: 'found', details };
}

export async function lookupDth(input: DthLookupInput, selected: 'auto' | DthLookupProvider = 'auto', beforeAttempt?: () => Promise<void>): Promise<DthLookupResponse> {
  if (input.mode === 'demo') return lookupWay2Dth(input);
  if (!input.consent) throw new Error('Confirm permission and lookup charges before a live lookup.');
  const providers = dthLookupProviders().filter(provider => provider.ready && (selected === 'auto' || selected === provider.id));
  if (!providers.length) throw new Error('Configure WAY2API_API_KEY or a fallback lookup provider on the server.');
  const attempts: NonNullable<DthLookupResponse['attempts']> = [];
  let result: DthLookupResponse | undefined;
  for (const provider of providers) {
    await beforeAttempt?.();
    result = provider.id === 'way2api' ? await lookupWay2Dth(input) : await lookupFallbackProvider(provider.id, input);
    attempts.push({ provider: provider.id, outcome: result.outcome, charged: result.charged });
    result = { ...result, provider: provider.id, attempts: [...attempts] };
    // Never repeat a completed billable check, an invalid account, a pending request,
    // or a request whose processing/billing status is uncertain.
    if (result.success || !result.fallbackSafe || result.outcome === 'pending') return result;
  }
  return result!;
}
