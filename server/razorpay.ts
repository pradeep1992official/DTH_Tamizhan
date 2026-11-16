import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentError } from './payments';

export function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new PaymentError(503, 'Razorpay is not configured.');
  return new Razorpay({ key_id, key_secret });
}
export async function createIdempotentRazorpayRefund(paymentId: string, idempotencyKey: string, body: { amount: number; speed: 'normal'; receipt: string; notes: Record<string, string> }) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new Error('INVALID_PAYMENT_REFERENCE');
  // SDK 2.9 filters this header; shared transport preserves documented idempotency.
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`, 'Content-Type': 'application/json', 'X-Refund-Idempotency': idempotencyKey }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('REFUND_UNCONFIRMED');
  return response.json();
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function verifyRazorpayWebhookSignature(body: Buffer, signature: unknown, secret?: string) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(body).digest(), Buffer.from(signature, 'hex'));
}
