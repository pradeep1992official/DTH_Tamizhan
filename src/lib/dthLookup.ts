import { z } from 'zod';
import { resolveDishFamilyOperatorId } from '../types';

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
export interface DthLookupResponse {
  success: boolean;
  mode: 'demo' | 'live';
  outcome: 'found' | 'pending' | 'failed';
  charged: boolean | null;
  reference: string | null;
  error?: string;
  details: Record<string, string> | null;
}

export const customerLookupInput = dthLookupInput.pick({ operator: true, subscriberId: true }).extend({ consent: z.literal(true) }).strict();
export interface CustomerDthLookupResponse {
  success: boolean;
  details: Record<string, string> | null;
  error?: string;
  cached?: boolean;
  checkedAt?: string;
}
export function lookupOperatorId(operator: string, subscriberId: string): DthLookupInput['operator'] | null {
  const resolved = operator === 'dish_tv' || operator === 'd2h' ? resolveDishFamilyOperatorId(subscriberId) : operator;
  if (resolved === 'd2h' || resolved === 'videocon_d2h') return 'videocon_d2h';
  return Object.hasOwn(lookupOperators, resolved) ? resolved as DthLookupInput['operator'] : null;
}
