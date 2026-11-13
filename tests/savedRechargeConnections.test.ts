import { describe, expect, it } from 'vitest';
import { connectionFromRecharge } from '../server/models/savedRechargeConnections';
import type { RechargeOrder } from '../src/types';

const order = { user_id: 'customer-one', operator: 'airtel_dth', operatorName: 'Airtel Digital TV', smartCardNumber: '3012121212', customerName: 'Customer', registeredMobile: '9876543210', packName: 'Tamil Pack', packValidity: '6 months', amount: 1200, createdAt: '2026-11-13T07:00:00.000Z', rechargeStatus: 'completed', completedAt: '2026-11-15T07:00:00.000Z' } as RechargeOrder;
describe('completed recharge connections', () => {
  it('keeps different boxes and account owners separate while retries reuse the same ID', () => {
    const first = connectionFromRecharge(order);
    expect(connectionFromRecharge(order).id).toBe(first.id);
    expect(connectionFromRecharge({ ...order, smartCardNumber: '3012121213' }).id).not.toBe(first.id);
    expect(connectionFromRecharge({ ...order, user_id: 'customer-two' }).id).not.toBe(first.id);
  });
  it('preserves a saved nickname while refreshing the pack and monthly price', () => {
    const existing = { ...connectionFromRecharge(order), id: 'saved-box', nickname: 'Living room', packName: 'Old pack' };
    const updated = connectionFromRecharge(order, existing);
    expect(updated.id).toBe('saved-box');
    expect(updated.nickname).toBe('Living room');
    expect(updated.packName).toBe('Tamil Pack');
    expect(updated.monthlyPackPrice).toBe(200);
    expect(updated.lastRechargeDate).toBe(order.createdAt);
    expect(updated.rechargeCompletedAt).toBe(order.completedAt);
    expect(updated.expiryDate).toBe('2027-05-14');
    expect(connectionFromRecharge({ ...order, rechargeStatus: 'pending' }).expiryDate).toBeUndefined();
    expect(connectionFromRecharge({ ...order, packValidity: '3 months' }).expiryDate).toBeUndefined();
  });
});
