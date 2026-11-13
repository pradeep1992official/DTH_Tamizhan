import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentError } from './payments';

export function razorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new PaymentError(503, 'Razorpay is not configured.');
  return new Razorpay({ key_id, key_secret });
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
