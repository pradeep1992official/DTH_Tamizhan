import { z } from 'zod';

export const lookupOperators = {
  airtel_dth: 'Airtel DTH', tata_play: 'Tata Play', dish_tv: 'Dish TV',
  sun_direct: 'Sun Direct', videocon_d2h: 'd2h',
} as const;
export const dthLookupInput = z.object({
  mode: z.enum(['demo', 'live']),
  operator: z.enum(['airtel_dth', 'tata_play', 'dish_tv', 'sun_direct', 'videocon_d2h']),
  subscriberId: z.string().trim().regex(/^\d{9,13}$/),
  consent: z.boolean().default(false),
}).strict();
export type DthLookupInput = z.infer<typeof dthLookupInput>;
export type DthLookupProvider = 'way2api' | 'planapi' | 'datayuge';
export const adminDthLookupInput = dthLookupInput.extend({ mode: z.literal('live'), provider: z.enum(['auto', 'way2api', 'planapi', 'datayuge']).default('auto') });
export const lookupProviderNames: Record<DthLookupProvider, string> = { way2api: 'Way2API', planapi: 'EzyTM / PlanAPI', datayuge: 'DataYuge' };
export interface LookupProviderStatus { id: DthLookupProvider; configured: boolean; ready: boolean; note: string }
export interface DthLookupResponse {
  success: boolean;
  mode: 'demo' | 'live';
  outcome: 'found' | 'pending' | 'failed';
  charged: boolean | null;
  reference: string | null;
  error?: string;
  errorCode?: 'account_not_found' | 'invalid_input' | 'provider_unavailable';
  details: Record<string, string> | null;
  provider?: DthLookupProvider;
  fallbackSafe?: boolean;
  attempts?: { provider: DthLookupProvider; outcome: 'found' | 'pending' | 'failed'; charged: boolean | null }[];
}

export const customerLookupInput = dthLookupInput.pick({ operator: true, subscriberId: true }).extend({ consent: z.literal(true) }).strict();
export interface CustomerDthLookupResponse {
  success: boolean;
  details: Record<string, string> | null;
  error?: string;
  cached?: boolean;
  checkedAt?: string;
}
export function lookupOperatorId(operator: string, _subscriberId: string): DthLookupInput['operator'] | null {
  const resolved = operator;
  if (resolved === 'd2h' || resolved === 'videocon_d2h') return 'videocon_d2h';
  return Object.hasOwn(lookupOperators, resolved) ? resolved as DthLookupInput['operator'] : null;
}
