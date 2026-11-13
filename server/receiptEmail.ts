import type { PaymentLedgerEntry } from './models/paymentLedger';
import type { RechargeOrder } from '../src/types';

export type ReceiptEvent = 'payment' | 'recharge';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function receiptEmail(payment: PaymentLedgerEntry, event: ReceiptEvent, order?: RechargeOrder) {
  const title = event === 'payment' ? 'Payment receipt' : 'Recharge confirmation';
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount);
  const operator = ({ airtel_dth: 'Airtel Digital TV', sun_direct: 'Sun Direct', tata_play: 'Tata Play', dish_tv: 'Dish TV', d2h: 'D2H' } as Record<string, string>)[payment.operator] || payment.operator;
  const rows = [['Customer', payment.customerName], ['Phone', payment.customerPhone || 'Not provided'], ['Operator', operator],
    ['Subscriber ID', payment.smartCardNumber || 'Not recorded'], ['Pack', payment.packName || 'Not recorded'],
    ['Validity', payment.packValidity || 'Not recorded'], ['Amount', amount], ['Payment ID', payment.id], ['Order ID', payment.orderId],
    ['Date (IST)', new Date(event === 'recharge' ? order!.updatedAt : payment.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]];
  if (event === 'recharge' && order?.operatorRefId) rows.push(['Operator reference', order.operatorRefId]);
  const note = payment.testMode ? 'This is a test transaction. No real money was collected and no real DTH recharge is confirmed.' :
    event === 'payment' ? 'Your payment is confirmed. Your recharge is awaiting manual processing. This payment receipt is not a tax invoice or confirmation of recharge.' :
    'Your administrator has confirmed that your DTH recharge was completed.';
  const subject = `${payment.testMode ? '[TEST] ' : ''}DTH Tamizhan — ${title} — ${payment.orderId}`;
  const textContent = `DTH TAMIZHAN\n${title}\n\n${rows.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${note}`;
  const htmlContent = `<!doctype html><html lang="en"><meta charset="utf-8"><body style="margin:0;background:#f5f2ee;font-family:Arial,sans-serif;color:#302c2a"><main style="max-width:620px;margin:24px auto;padding:28px;background:#fffdf8;border-top:5px solid #68162f"><p style="color:#68162f;font-size:12px;letter-spacing:2px">DTH TAMIZHAN</p><h1 style="font-size:25px">${escapeHtml(title)}</h1>${payment.testMode ? '<p style="color:#91620d;font-weight:bold">TEST TRANSACTION</p>' : ''}<table style="width:100%;border-collapse:collapse">${rows.map(([key, value]) => `<tr><th style="text-align:left;padding:12px 8px;border-bottom:1px solid #e7ddd0;font-size:13px;vertical-align:top">${escapeHtml(key)}</th><td style="padding:12px 8px;border-bottom:1px solid #e7ddd0;font-size:13px;overflow-wrap:anywhere">${escapeHtml(value)}</td></tr>`).join('')}</table><p style="font-size:13px;line-height:1.7;margin-top:24px">${escapeHtml(note)}</p><p style="font-size:12px;color:#766b65">Keep this email for your records.</p></main></body></html>`;
  return { subject, textContent, htmlContent, pdfData: { title, rows, note, operator: payment.operator, testMode: payment.testMode } };
}
