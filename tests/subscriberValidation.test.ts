import { describe, it, expect, vi } from 'vitest';
import { SUBSCRIBER_RULES, subscriberError, filterSubscriberInput, normalizeSubscriberId } from '../src/lib/subscriberValidation';
import { SubscriberSchema, CreateOrderSchema, validateBody } from '../server/middleware/validation';

const valid = { sun_direct: '41289456123', tata_play: '1029384756', airtel_dth: '3009482715', dish_tv: '02589412356', d2h: '89456123' };
describe('shared subscriber validation (QA-01, QA-17)', () => {
  for (const operator of Object.keys(valid) as (keyof typeof valid)[]) {
    it(`${operator}: accepts valid and rejects empty, too short, too long`, () => {
      expect(subscriberError(operator, valid[operator])).toBeNull();
      for (const id of ['', '123', '1'.repeat(12)]) {
        expect(subscriberError(operator, id)).toContain('Please update this ID');
        expect(SubscriberSchema.safeParse({ operator, smartCardNumber: id }).success).toBe(false);
      }
    });
    it(`${operator}: normalizes pasted formatted text on client and server`, () => {
      const formatted = valid[operator].slice(0, 3) + ' - ' + valid[operator].slice(3);
      expect(filterSubscriberInput(formatted)).toBe(valid[operator]);
      expect(normalizeSubscriberId(formatted)).toBe(valid[operator]);
      expect(SubscriberSchema.parse({ operator, smartCardNumber: formatted }).smartCardNumber).toBe(valid[operator]);
    });
  }
  it('rejects wrong Dish TV prefix and preserves leading zeroes', () => {
    expect(subscriberError('dish_tv', '12589412356')).not.toBeNull();
    expect(subscriberError('dish_tv', '01589412356')).toBeNull();
  });
  it('does not invent unconfirmed prefixes', () => {
    for (const operator of ['sun_direct', 'tata_play', 'airtel_dth'] as const) {
      expect(SUBSCRIBER_RULES[operator].prefixes).toEqual([]);
    }
  });
  it('handles combined Dish/D2H selection consistently', () => {
    expect(subscriberError('dish_tv', valid.d2h, true)).toBeNull();
    expect(subscriberError('dish_tv', '025123', true)).not.toBeNull();
  });
  it('filters letters and symbols in UI but rejects them at the server boundary', () => {
    expect(filterSubscriberInput('abc41289-456123!')).toBe(valid.sun_direct);
    expect(SubscriberSchema.safeParse({ operator: 'sun_direct', smartCardNumber: 'a1289456123' }).success).toBe(false);
  });
  it('uses only the selected language for validation errors', () => {
    const english = subscriberError('sun_direct', '123', false, 'en');
    const tamil = subscriberError('sun_direct', '123', false, 'ta');
    expect(english).toContain('Please update this ID. Smart Card Number: 11 digits.');
    expect(english).not.toMatch(/[\u0b80-\u0bff]/);
    expect(tamil).toContain('இந்த எண்ணைத் திருத்தவும்.');
    expect(tamil).toContain('11 இலக்கங்கள்');
    expect(tamil).not.toContain('Please update');
    expect(tamil).not.toContain('Smart Card Number');
    expect(subscriberError('dish_tv', '123', false, 'ta')).toContain('015 / 025');
    expect(subscriberError('sun_direct', valid.sun_direct, false, 'ta')).toBeNull();
  });
  it('rejects unknown operators', () => {
    expect(subscriberError('unknown', valid.sun_direct)).not.toBeNull();
  });
  it('blocks a forged recharge request with HTTP 400 before the handler runs', () => {
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const payload = { user_id: 'test', operator: 'sun_direct', operatorName: 'Sun Direct', smartCardNumber: '123', amount: 10, packId: 'test', packName: 'Test', packValidity: '30 days', paymentMethod: 'upi' };
    validateBody(CreateOrderSchema)({ body: payload } as any, { status } as any, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(json.mock.calls[0][0].error).toContain('smartCardNumber');
    expect(CreateOrderSchema.safeParse({ ...payload, smartCardNumber: valid.sun_direct }).success).toBe(true);
    expect(CreateOrderSchema.safeParse({ ...payload, smartCardNumber: '412894561234' }).success).toBe(false);
  });
});
