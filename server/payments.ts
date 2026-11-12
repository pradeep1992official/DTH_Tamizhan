import { randomUUID } from 'node:crypto';
import type { PlanCatalogItem, DthOperatorId } from '../src/types';
import { isSameDthOperatorGroup } from '../src/types';
import { subscriberError, normalizeSubscriberId } from '../src/lib/subscriberValidation';
import { validateTopUpAmount } from '../src/lib/topUpAmount';

export const paymentMode = (value = process.env.PAYMENT_MODE): 'sandbox' | 'production' =>
  value === 'sandbox' ? 'sandbox' : 'production';

export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function paise(amount: number): number {
  const value = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(value) || Math.abs(value / 100 - amount) > 1e-9) {
    throw new PaymentError(400, 'Amount must be positive INR with at most two decimal places.');
  }
  return value;
}

export function calculatePayment(input: { packId: string; operator: DthOperatorId; customAmount?: number }, plans: PlanCatalogItem[]) {
  if (input.packId === 'custom') {
    const error = validateTopUpAmount(input.customAmount);
    if (error) throw new PaymentError(400, error);
    const amountPaise = paise(input.customAmount!);
    return { amountPaise, packName: 'Custom top-up', validity: 'Operator terms apply' };
  }
  const plan = plans.find(plan => plan.id === input.packId);
  if (!plan || !isSameDthOperatorGroup(plan.operator, input.operator)) throw new PaymentError(400, 'Plan is unavailable for this operator.');
  return { amountPaise: paise(plan.amount), packName: plan.plan_name, validity: `${plan.duration_months} months` };
}

export type SandboxOutcome = 'success' | 'failed' | 'pending';
export interface CheckoutSession {
  id: string;
  mode: 'sandbox';
  provider: string;
  amountPaise: number;
  packName: string;
  validity: string;
  expiresAt: number;
  status: 'ready' | SandboxOutcome;
}

// Sandbox-only, bounded process-local state. Never writes orders, customers or Firestore.
export function createPaymentService(getPlans: () => PlanCatalogItem[], getMode = paymentMode, now = Date.now) {
  const sessions = new Map<string, { fingerprint: string; session: CheckoutSession }>();
  const byId = new Map<string, CheckoutSession>();
  const requireSandbox = () => {
    if (getMode() !== 'sandbox') throw new PaymentError(503, 'Payment provider is not configured. No payment has been taken. Please retry later.');
  };
  return {
    prepare(input: { idempotencyKey: string; packId: string; operator: DthOperatorId; smartCardNumber: string; customAmount?: number }) {
      requireSandbox();
      const error = subscriberError(input.operator, input.smartCardNumber);
      if (error) throw new PaymentError(400, error);
      const fingerprint = JSON.stringify([input.packId, input.operator, normalizeSubscriberId(input.smartCardNumber), input.customAmount]);
      for (const [key, entry] of sessions) {
        if (entry.session.expiresAt <= now()) { sessions.delete(key); byId.delete(entry.session.id); }
      }
      const existing = sessions.get(input.idempotencyKey);
      if (existing) {
        if (existing.fingerprint !== fingerprint) throw new PaymentError(409, 'Idempotency key already used for another checkout.');
        return existing.session;
      }
      if (sessions.size >= 1000) throw new PaymentError(503, 'Test checkout is busy. Please retry later.');
      const session: CheckoutSession = {
        ...calculatePayment(input, getPlans()), id: `TEST-${randomUUID()}`, mode: 'sandbox',
        provider: 'Local sandbox simulator', expiresAt: now() + 180_000, status: 'ready',
      };
      sessions.set(input.idempotencyKey, { fingerprint, session });
      byId.set(session.id, session);
      return session;
    },
    complete(id: string, outcome: SandboxOutcome) {
      requireSandbox();
      const session = byId.get(id);
      if (!session || session.expiresAt <= now()) throw new PaymentError(410, 'Session expired, generate a new QR.');
      if (session.status !== 'ready' && session.status !== outcome) throw new PaymentError(409, 'This test payment already has a result. Generate a new session.');
      session.status = outcome;
      return session;
    },
  };
}
