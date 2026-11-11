import { describe, expect, it } from 'vitest';
import { calculateConnectionExpiry, getConnectionExpiry, getPackDuration } from '../src/lib/connectionExpiry';
import { DthConnection } from '../src/types';

describe('saved connection expiry', () => {
  it('uses 180 and 360 days rather than calendar months', () => {
    expect(calculateConnectionExpiry('2026-01-01T00:00:00Z', 6)).toBe('2026-06-30');
    expect(calculateConnectionExpiry('2026-01-01T00:00:00Z', 12)).toBe('2026-12-27');
  });
  it('hides monthly expiry even when a recorded expiry exists', () => {
    expect(getConnectionExpiry({ packDurationMonths: 1, expiryDate: '2026-12-01' } as DthConnection)).toBeUndefined();
  });
  it('calculates from the recharge date and preserves legacy recorded dates', () => {
    expect(getConnectionExpiry({ packDurationMonths: 6, lastRechargeDate: '2026-01-01', expiryDate: '2026-07-01' } as DthConnection)).toBe('2026-06-30');
    expect(getConnectionExpiry({ expiryDate: '2026-07-01' } as DthConnection)).toBe('2026-07-01');
  });
  it('recognizes stored validity labels and rejects invalid dates', () => {
    expect(getPackDuration('180 Days')).toBe(6);
    expect(getPackDuration('12 Months')).toBe(12);
    expect(getPackDuration('Annual Dhamaka')).toBe(12);
    expect(calculateConnectionExpiry('invalid', 6)).toBeUndefined();
  });
});
