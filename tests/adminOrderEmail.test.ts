import { afterEach, expect, it, vi } from 'vitest';
import { adminOrderEmail } from '../server/adminOrderEmail';
import type { PaymentLedgerEntry } from '../server/models/paymentLedger';
const payment = { id: 'pay_demo', orderId: 'order_demo', amount: 10, currency: 'INR', operator: 'airtel_dth', customerName: 'Customer <script>', customerPhone: '9942555292', smartCardNumber: '3045340569', packName: 'Custom top-up', packValidity: 'Operator terms apply', createdAt: '2026-11-28T17:17:12Z', testMode: false } as PaymentLedgerEntry;
afterEach(() => vi.unstubAllEnvs());
it('brands the alert with real logos, operational details and escaped customer data', () => {
  const email = adminOrderEmail(payment);
  expect(email.htmlContent).toContain('https://dthtamizhan.in/dth-tamizhan-logo.png');
  expect(email.htmlContent).toContain('https://dthtamizhan.in/airtel_logo.png');
  expect(email.htmlContent).toContain('Customer &lt;script&gt;');
  expect(email.htmlContent).not.toContain('Customer <script>');
  expect(email.htmlContent).toContain('Open order dashboard');
  expect(email.textContent).toContain(payment.smartCardNumber);
  expect(email.textContent).not.toContain('Your payment');
});
it.each(['http://localhost:3000', 'https://127.0.0.1', 'https://192.168.1.10', 'https://app.local', 'invalid', 'https://user:pass@example.com'])('uses the public website instead of an unusable email link: %s', url => {
  vi.stubEnv('APP_URL', url);
  expect(adminOrderEmail(payment).textContent).toContain('Open orders: https://dthtamizhan.in/admin/pending');
});
it('retains a configured public HTTPS deployment', () => {
  vi.stubEnv('APP_URL', 'https://example.com/path');
  expect(adminOrderEmail(payment).textContent).toContain('https://example.com/admin/pending');
});
it('labels test transactions and prevents real fulfilment instructions', () => {
  const email = adminOrderEmail({ ...payment, testMode: true, operator: 'unknown' });
  expect(email.subject).toContain('[TEST]');
  expect(email.textContent).toContain('Do not fulfil');
  expect(email.htmlContent).not.toContain('/undefined');
});
