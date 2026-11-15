import { z } from 'zod';
import type { DthLookupInput, DthLookupProvider, DthLookupResponse, LookupProviderStatus } from '../../src/lib/dthLookup';

const fields = ['customer_id', 'name', 'registered_mobile', 'balance', 'monthly_amount', 'status', 'plan', 'next_recharge_date', 'last_recharge_date', 'last_recharge_amount', 'switch_off_date', 'address', 'city', 'district', 'state', 'pin_code'] as const;
const field = z.enum(fields);
const path = z.string().regex(/^[A-Za-z0-9_ -]+(?:\.[A-Za-z0-9_ -]+)*$/).max(200);
// DataYuge publishes its request but no response body. A verified account-specific
// mapping is required rather than inventing JSON keys or a success indicator.
const mappingSchema = z.object({ successPath: path, successValue: z.union([z.boolean(), z.number(), z.string()]), fields: z.partialRecord(field, path) }).strict()
  .refine(map => !!(map.fields.name || map.fields.balance || map.fields.customer_id));
function datayugeMap() {
  try { return mappingSchema.parse(JSON.parse(process.env.DATAYUGE_DTH_RESPONSE_MAP || '')); } catch { return null; }
}
export function fallbackProviderStatus(): LookupProviderStatus[] {
  const planConfigured = !!process.env.PLANAPI_MEMBER_ID?.trim() && !!process.env.PLANAPI_API_PASSWORD?.trim();
  const dataConfigured = !!process.env.DATAYUGE_API_KEY?.trim();
  return [
    { id: 'planapi', configured: planConfigured, ready: planConfigured, note: planConfigured ? 'First fallback' : 'Set PLANAPI_MEMBER_ID and PLANAPI_API_PASSWORD' },
    { id: 'datayuge', configured: dataConfigured, ready: dataConfigured && !!datayugeMap(), note: !dataConfigured ? 'Set DATAYUGE_API_KEY and verified response mapping' : !datayugeMap() ? 'Needs DATAYUGE_DTH_RESPONSE_MAP from a verified sample response' : 'Second fallback' },
  ];
}
const planCodes: Record<DthLookupInput['operator'], string> = { airtel_dth: '24', dish_tv: '25', sun_direct: '27', tata_play: '28', videocon_d2h: '29' };
const dataCodes: Record<DthLookupInput['operator'], string> = { airtel_dth: 'ART', dish_tv: 'DSH', sun_direct: 'SUN', tata_play: 'TSK', videocon_d2h: 'VDH' };
const planFields: Record<string, typeof fields[number]> = { VC: 'customer_id', Name: 'name', Rmn: 'registered_mobile', Balance: 'balance', Monthly: 'monthly_amount', Plan: 'plan', 'Next Recharge Date': 'next_recharge_date', Address: 'address', City: 'city', District: 'district', State: 'state', 'PIN Code': 'pin_code' };
function scalar(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = String(value).trim(); return result && !/^(N\/A|NA|null)$/i.test(result) ? result.slice(0, 1000) : null;
}
function readPath(value: unknown, key: string): unknown {
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part) || ['__proto__', 'constructor', 'prototype'].includes(part)) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}
const failed = (error: string, fallbackSafe = false): DthLookupResponse => ({ success: false, mode: 'live', outcome: 'failed', charged: null, reference: null, details: null, fallbackSafe, error });

export async function lookupFallbackProvider(provider: Exclude<DthLookupProvider, 'way2api'>, input: DthLookupInput): Promise<DthLookupResponse> {
  const map = provider === 'datayuge' ? datayugeMap() : null;
  if (provider === 'datayuge' && !map) return failed('DataYuge response mapping is not configured.', true);
  const url = new URL(provider === 'planapi' ? 'https://planapi.in/api/Mobile/DTHINFOCheck' : 'https://api.datayuge.com/api/v1/dth/customer/details');
  const parameters = provider === 'planapi'
    ? { apimember_id: process.env.PLANAPI_MEMBER_ID!, api_password: process.env.PLANAPI_API_PASSWORD!, mobile_no: input.subscriberId, Opcode: planCodes[input.operator] }
    : { apikey: process.env.DATAYUGE_API_KEY!, customer_id: input.subscriberId, operator_code: dataCodes[input.operator] };
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  let response: Response;
  try { response = await fetch(url.toString(), { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } }); }
  catch { return failed('No response received from the fallback provider. Check its request history before retrying.'); }
  const raw: unknown = await response.json().catch(() => null);
  if (!raw || typeof raw !== 'object') return failed('The fallback provider returned an unreadable response. Check its request history.');
  // HTTP errors alone cannot establish whether these providers billed the call.
  if (!response.ok || response.status === 202) return failed('Fallback provider request was not completed. Check its dashboard before retrying.');
  const data = raw as Record<string, unknown>;
  const details: Record<string, string> = {};
  if (provider === 'planapi') {
    const error = String(data.error ?? data.ERROR ?? '');
    // Documented code 3 is authentication failure, before account processing.
    if (error === '3' || String(data.STATUS) === '3' && /authentication failed/i.test(String(data.MESSAGE || data.Message || ''))) return failed('PlanAPI authentication failed. Check server credentials or IP access.', true);
    if (error !== '0' || !data.DATA || typeof data.DATA !== 'object' || Array.isArray(data.DATA)) return failed('PlanAPI could not verify the account. Check its request history before retrying.');
    for (const [from, to] of Object.entries(planFields)) { const value = scalar((data.DATA as Record<string, unknown>)[from]); if (value !== null) details[to] = value; }
  } else {
    if (readPath(data, map!.successPath) !== map!.successValue) return failed('DataYuge did not return a successful account lookup. Check its request history.');
    for (const [to, from] of Object.entries(map!.fields)) { const value = scalar(readPath(data, from)); if (value !== null) details[to] = value; }
  }
  if (!Object.keys(details).length) return failed('No recognised DTH details were returned. Verify the response mapping.');
  return { success: true, mode: 'live', outcome: 'found', charged: null, reference: null, details };
}
