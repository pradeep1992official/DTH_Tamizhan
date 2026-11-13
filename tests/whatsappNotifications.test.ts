import { expect, it } from 'vitest';
import { whatsappRecipient, paymentWhatsAppLink, rechargeWhatsAppLink } from '../src/lib/whatsappNotifications';

const payment = { id: 'pay_123', orderId: 'order_123', customerName: 'Customer', customerPhone: '98765 43210',
  amount: 1396, operator: 'airtel_dth', smartCardNumber: '3012345678', packName: 'Tamil HD & Sports',
  status: 'paid', providerStatus: 'captured' };
const order = { orderId: 'order_123', customerName: 'Customer', registeredMobile: '+919876543210', amount: 1396,
  operator: 'airtel_dth', operatorName: 'Airtel Digital TV', smartCardNumber: '3012345678', packName: 'Tamil HD',
  packValidity: '6 months', paymentStatus: 'paid', rechargeStatus: 'completed', operatorRefId: 'REF123' } as any;
it('normalizes Indian and international numbers and rejects invalid recipient paths', () => {
  expect(whatsappRecipient('98765 43210')).toBe('919876543210');
  expect(whatsappRecipient('+1 (650) 555-3434')).toBe('16505553434');
  for (const phone of ['', '123', 'https://evil.test', '9876543210?text=other']) expect(whatsappRecipient(phone)).toBeNull();
});
it('creates an encoded payment draft without claiming recharge completion', () => {
  const url = new URL(paymentWhatsAppLink(payment)!);
  expect(url.hostname).toBe('wa.me'); expect(url.pathname).toBe('/919876543210');
  expect(url.searchParams.get('text')).toContain('Tamil HD & Sports');
  expect(url.searchParams.get('text')).toContain('awaiting manual processing');
  expect(url.searchParams.get('text')).toContain('pay_123');
  expect(url.searchParams.get('text')).not.toContain('recharge has been completed');
});
it('does not offer a receipt draft for failed or uncaptured payments or missing phones', () => {
  expect(paymentWhatsAppLink({ ...payment, status: 'failed' })).toBeNull();
  expect(paymentWhatsAppLink({ ...payment, providerStatus: 'authorized' })).toBeNull();
  expect(paymentWhatsAppLink({ ...payment, customerPhone: undefined })).toBeNull();
  expect(paymentWhatsAppLink({ ...payment, customerPhone: undefined, registeredMobile: '+919876543210' })).toBeTruthy();
});
it('offers recharge confirmation only for paid and completed orders', () => {
  expect(rechargeWhatsAppLink({ ...order, rechargeStatus: 'pending' })).toBeNull();
  expect(rechargeWhatsAppLink({ ...order, paymentStatus: 'failed' })).toBeNull();
  const text = new URL(rechargeWhatsAppLink(order)!).searchParams.get('text');
  expect(text).toContain('recharge has been completed'); expect(text).toContain('REF123');
  expect(text).toContain('6 months'); expect(text).toContain('3012345678');
});
it('clearly identifies test drafts and never claims a real recharge', () => {
  expect(new URL(paymentWhatsAppLink({ ...payment, testMode: true })!).searchParams.get('text')).toContain('No real money');
  const text = new URL(rechargeWhatsAppLink({ ...order, testMode: true })!).searchParams.get('text');
  expect(text).toContain('No real recharge confirmed'); expect(text).not.toContain('Your DTH recharge has been completed');
});
