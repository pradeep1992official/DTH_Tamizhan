import { describe, expect, it } from 'vitest';
import { calculatePayment, createPaymentService, paymentMode } from '../server/payments';
import type { PlanCatalogItem } from '../src/types';

const plans = [{ id: 'sun-1', operator: 'sun_direct', amount: 249.50, plan_name: 'Tamil HD', duration_months: 1 },
  { id: 'd2h-1', operator: 'd2h', amount: 300, plan_name: 'D2H HD', duration_months: 3 }] as PlanCatalogItem[];
const input = { idempotencyKey: '00000000-0000-4000-8000-000000000001', packId: 'sun-1', operator: 'sun_direct' as const, smartCardNumber: '41289456123' };

describe('payment mode (QA-02, QA-03)', () => {
  it('enables sandbox only through the exact explicit flag', () => {
    expect(paymentMode('sandbox')).toBe('sandbox');
    for (const value of ['production', '', 'test', 'SANDBOX', 'true']) expect(paymentMode(value)).toBe('production');
  });
  it('production refuses session creation and completion, including forged sandbox requests', () => {
    const service = createPaymentService(() => plans, () => 'production');
    expect(() => service.prepare({ ...input, mode: 'sandbox' } as any)).toThrow('Payment provider is not configured');
    expect(() => service.complete('forged-test-session', 'success')).toThrow('Payment provider is not configured');
  });
  it('switching to production also rejects existing sandbox sessions', () => {
    let mode: 'sandbox' | 'production' = 'sandbox';
    const service = createPaymentService(() => plans, () => mode);
    const session = service.prepare(input);
    mode = 'production';
    expect(() => service.complete(session.id, 'success')).toThrow('Payment provider is not configured');
  });
});

describe('server price calculation', () => {
  it('ignores client amount, name and validity in favor of the catalog', () => {
    const quote = calculatePayment({ ...input, amount: 1, packName: 'Forged', packValidity: '1 year' } as any, plans);
    expect(quote).toEqual({ amountPaise: 24950, packName: 'Tamil HD', validity: '1 month' });
  });
  it('rejects missing/deleted plans and cross-operator plans', () => {
    expect(() => calculatePayment({ ...input, packId: 'deleted' }, plans)).toThrow('unavailable');
    expect(() => calculatePayment({ ...input, operator: 'airtel_dth' }, plans)).toThrow('unavailable');
  });
  it('preserves the existing Dish/D2H catalog grouping', () => {
    expect(calculatePayment({ packId: 'd2h-1', operator: 'dish_tv' }, plans).amountPaise).toBe(30000);
  });
  it('validates explicit custom face value and handles decimal paise', () => {
    expect(calculatePayment({ ...input, packId: 'custom', customAmount: 10.01 }, plans).amountPaise).toBe(1001);
    expect(calculatePayment({ ...input, packId: 'custom', customAmount: 10 }, plans).amountPaise).toBe(1000);
    for (const customAmount of [undefined, NaN, Infinity, -10, 0, 9.99, 10.001, Number.MAX_SAFE_INTEGER]) {
      expect(() => calculatePayment({ ...input, packId: 'custom', customAmount }, plans)).toThrow();
    }
  });
  it('rejects invalid catalog prices instead of creating an underpriced order', () => {
    for (const amount of [0, -1, NaN, Infinity, 1.234]) {
      expect(() => calculatePayment(input, [{ ...plans[0], amount }])).toThrow();
    }
  });
});

describe('sandbox sessions', () => {
  it('returns the same session on retries and rejects key reuse with changed intent', () => {
    const service = createPaymentService(() => plans, () => 'sandbox');
    const session = service.prepare(input);
    expect(session.mode).toBe('sandbox');
    expect(session.id).toMatch(/^TEST-/);
    expect(service.prepare(input)).toBe(session);
    expect(() => service.prepare({ ...input, smartCardNumber: '71289456123' })).toThrow('Idempotency key');
  });
  it('completion uses the immutable server quote and duplicate requests return the same result', () => {
    const service = createPaymentService(() => plans, () => 'sandbox');
    const session = service.prepare(input);
    const result = service.complete(session.id, 'success');
    expect(result.amountPaise).toBe(24950);
    expect(service.complete(session.id, 'success')).toBe(result);
    expect(() => service.complete(session.id, 'failed')).toThrow('already has a result');
  });
  it.each(['success', 'failed', 'pending'] as const)('supports explicit %s test result without creating a RechargeOrder', outcome => {
    const service = createPaymentService(() => plans, () => 'sandbox');
    const result = service.complete(service.prepare(input).id, outcome);
    expect(result.status).toBe(outcome);
    expect(result).not.toHaveProperty('paymentStatus');
    expect(result).not.toHaveProperty('rechargeStatus');
  });
  it('expires exactly at the server deadline and allows a fresh session', () => {
    let now = 1000;
    const service = createPaymentService(() => plans, () => 'sandbox', () => now);
    const original = service.prepare(input);
    now += 180_000;
    expect(() => service.complete(original.id, 'success')).toThrow('Session expired, generate a new QR');
    const renewed = service.prepare({ ...input, idempotencyKey: 'new-key' });
    expect(renewed.id).not.toBe(original.id);
    expect(renewed.expiresAt).toBe(now + 180_000);
  });
  it('rejects invalid subscriber IDs even if the client is bypassed', () => {
    const service = createPaymentService(() => plans, () => 'sandbox');
    expect(() => service.prepare({ ...input, smartCardNumber: '123' })).toThrow('Please update this ID');
  });
});
