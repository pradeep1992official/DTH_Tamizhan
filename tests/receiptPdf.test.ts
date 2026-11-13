import { expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { receiptPdf, receiptDataFromText } from '../server/receiptPdf';
it('creates a valid PDF with embedded English and Tamil fonts', async () => {
  const buffer = await receiptPdf({ title: 'Payment receipt', testMode: true, operator: 'airtel_dth',
    rows: [['Customer', 'பிரதீப் Kumar'], ['Subscriber ID', '3015222222'], ['Pack', 'Tamil Super Star HD Pack'], ['Amount', '₹1,396.00']],
    note: 'Payment received. Recharge is awaiting manual processing.' });
  expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  const pdf = await PDFDocument.load(buffer); expect(pdf.getPageCount()).toBe(1);
  expect(pdf.getTitle()).toBe('DTH Tamizhan - Payment receipt');
});
it('wraps long plan names and references without failing PDF generation', async () => {
  const buffer = await receiptPdf({ title: 'Recharge confirmation', rows: Array.from({ length: 18 }, (_, index) => [`Field ${index}`, 'Long details '.repeat(20)]), note: 'Administrator confirmed the recharge.' });
  expect((await PDFDocument.load(buffer)).getPageCount()).toBeGreaterThan(1);
});
it('can migrate queued but unattempted HTML-only jobs to receipt data', () => {
  expect(receiptDataFromText('DTH TAMIZHAN\nPayment receipt\n\nCustomer: Name\nOrder ID: order_1\n\nPayment received.')).toEqual({ title: 'Payment receipt', rows: [['Customer', 'Name'], ['Order ID', 'order_1']], note: 'Payment received.' });
});
