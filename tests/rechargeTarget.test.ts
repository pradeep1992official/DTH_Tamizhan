import { expect, it } from 'vitest';
import { rechargeTarget } from '../src/lib/rechargeTarget';

it('recognizes new-customer requests in supported languages', () => {
  for (const request of ['Recharge a new customer ID', 'Recharge a new ID', 'Use another subscriber', 'புதிய சந்தாதாரர் எண்ணை ரீசார்ஜ் செய்யவும்', 'pudhu customer ID recharge pannunga']) {
    expect(rechargeTarget([request, 'HD 6 months']).newCustomer).toBe(true);
  }
});
it('excludes old subscriber targets and retains the new request across follow-ups', () => {
  const target = rechargeTarget(['Airtel 3012345678', 'Recharge a new customer ID', 'HD 6m', '3012586589']);
  expect(target.messages).toEqual(['Recharge a new customer ID', 'HD 6m', '3012586589']);
  expect(target.newCustomer).toBe(true);
});
it('allows an explicit return to saved-box mode', () => {
  const target = rechargeTarget(['Recharge a new customer ID', 'Use my saved box']);
  expect(target.newCustomer).toBe(false);
  expect(target.messages).toEqual(['Use my saved box']);
});
