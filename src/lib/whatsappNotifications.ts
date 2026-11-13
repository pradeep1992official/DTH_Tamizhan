import type { RechargeOrder } from '../types';

interface PaymentNotice {
  id: string; orderId?: string; customerName: string; customerPhone?: string; registeredMobile?: string;
  amount: number; currency?: string; operator: string; smartCardNumber?: string; packName?: string;
  packValidity?: string; status: string; providerStatus?: string; testMode?: boolean;
}
const operators: Record<string, string> = { airtel_dth: 'Airtel Digital TV', sun_direct: 'Sun Direct', tata_play: 'Tata Play', dish_tv: 'Dish TV', d2h: 'D2H' };
const clean = (value?: string) => value?.replace(/\s+/g, ' ').trim() || 'Not recorded';

export function whatsappRecipient(value?: string): string | null {
  const phone = (value || '').replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(phone)) return `91${phone}`;
  if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone.slice(1);
  return null;
}
function link(phone: string | undefined, lines: string[]) {
  const recipient = whatsappRecipient(phone);
  return recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent(lines.join('\n'))}` : null;
}
export function paymentWhatsAppLink(payment: PaymentNotice) {
  if (payment.status !== 'paid' || payment.providerStatus !== 'captured') return null;
  return link(payment.customerPhone || payment.registeredMobile, [
    'DTH TAMIZHAN — Payment receipt',
    ...(payment.testMode ? ['TEST TRANSACTION — No real money collected. No real recharge confirmed.'] : []),
    `Hello ${clean(payment.customerName)},`,
    `Payment received: ${clean(payment.currency || 'INR')} ${payment.amount.toLocaleString('en-IN')}`,
    `Operator: ${clean(operators[payment.operator] || payment.operator)}`,
    `Subscriber ID: ${clean(payment.smartCardNumber)}`,
    `Pack: ${clean(payment.packName)}`,
    ...(payment.packValidity ? [`Validity: ${clean(payment.packValidity)}`] : []),
    `Payment ID: ${clean(payment.id)}`, `Order ID: ${clean(payment.orderId)}`,
    'Your recharge is awaiting manual processing. This confirms payment only.',
    'Sign in to DTH Tamizhan → My History to download your receipt.',
  ]);
}
export function rechargeWhatsAppLink(order: RechargeOrder) {
  if (order.paymentStatus !== 'paid' || order.rechargeStatus !== 'completed') return null;
  return link(order.registeredMobile, [
    'DTH TAMIZHAN — Recharge confirmation',
    ...(order.testMode ? ['TEST TRANSACTION — No real recharge confirmed.'] : []),
    `Hello ${clean(order.customerName)},`,
    ...(order.testMode ? ['The test order has been marked completed.'] : ['Your DTH recharge has been completed.']),
    `Operator: ${clean(order.operatorName || operators[order.operator])}`,
    `Subscriber ID: ${clean(order.smartCardNumber)}`,
    `Pack: ${clean(order.packName)}`, `Validity: ${clean(order.packValidity)}`,
    `Amount: INR ${order.amount.toLocaleString('en-IN')}`,
    `Order ID: ${clean(order.orderId)}`,
    ...(order.operatorRefId ? [`Operator reference: ${clean(order.operatorRefId)}`] : []),
    'Sign in to DTH Tamizhan → My History to view your recharge and receipt.',
  ]);
}
