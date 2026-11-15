import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ records: new Map<string, any>(), save: vi.fn(), download: vi.fn() }));
vi.mock('firebase-admin/storage', () => ({ getStorage: () => ({ bucket: () => ({ file: () => ({ save: f.save, download: f.download }) }) }) }));
vi.mock('../server/receiptPdf', () => ({ receiptPdf: async () => Buffer.from('%PDF-mock') }));
vi.mock('../server/models/serviceBrands', () => ({ readServiceBrands: async () => [{ id: 'tata_play', displayName: 'Tata Play' }] }));
vi.mock('../server/middleware/auth', () => {
  const update = (key: string, data: any) => { const current = f.records.get(key); for (const [field, value] of Object.entries(data)) { if (field.includes('.')) { const [parent, child] = field.split('.'); current[parent][child] = value; } else current[field] = value; } };
  const ref = (key: string) => ({ key, get: async () => ({ exists: f.records.has(key), data: () => structuredClone(f.records.get(key)) }), update: async (data: any) => update(key, data) });
  return { getAdminFirestore: () => ({ collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }), runTransaction: async (callback: any) => callback({ get: (value: any) => value.get(), set: (value: any, data: any) => f.records.set(value.key, data), update: (value: any, data: any) => update(value.key, data) }) }) };
});
import { downloadServiceReceipt, ensureServiceReceipt, receiptFinancialYear, serviceReceiptData } from '../server/models/serviceReceipts';
import { ticketSchema } from '../src/lib/tickets';
const ticket = ticketSchema.parse({ id: 'one', ticketNo: 'SRQ-0001', type: 'service_request', uid: 'owner', name: 'Customer', phone: '9876543210', state: 'Tamil Nadu', brand: 'tata_play', subscriberId: '1234567890', issueCategory: 'no_signal', description: 'No signal', status: 'paid', statusHistory: [], companyRefNo: '', adminNotes: '', payment: { required: true, amount: 50, status: 'paid', gatewayOrderId: 'order_1', paymentId: 'pay_1', paidAt: '2026-11-14T12:00:00.000Z', refundId: null, refundedAt: null }, receipt: { number: null, path: null, generatedAt: null }, createdAt: '2026-11-14T12:00:00.000Z', updatedAt: '2026-11-14T12:00:00.000Z' });
beforeEach(() => { f.records.clear(); f.records.set('tickets/one', structuredClone(ticket)); f.save.mockReset(); f.save.mockResolvedValue(undefined); f.download.mockReset(); });
it('uses the April boundary in India, including UTC dates still in March', () => {
  expect(receiptFinancialYear('2026-03-31T18:29:59Z')).toBe('2025-26');
  expect(receiptFinancialYear('2026-03-31T18:30:00Z')).toBe('2026-27');
});
it('reserves the receipt atomically and reuses its number after PDF upload failure', async () => {
  f.save.mockRejectedValueOnce(new Error('storage offline'));
  await expect(ensureServiceReceipt('one')).rejects.toThrow();
  const generated = await ensureServiceReceipt('one'); await ensureServiceReceipt('one');
  expect(generated.receipt.number).toBe('DTH/2026-27/0001');
  expect(f.records.get('server_receipt_counters/2026-27').value).toBe(1);
  expect(f.save).toHaveBeenCalledTimes(2);
  const data = serviceReceiptData(generated, 'Tata Play');
  expect(JSON.stringify(data)).toContain('******7890'); expect(JSON.stringify(data)).not.toContain('1234567890');
  expect(data.rows.some(([label]) => label === 'GST')).toBe(false);
});
it('rejects a receipt before verified payment', async () => {
  f.records.get('tickets/one').payment.paidAt = null;
  await expect(ensureServiceReceipt('one')).rejects.toThrow(); expect(f.save).not.toHaveBeenCalled();
});
it('downloads a verified receipt without depending on an upload', async () => {
  f.save.mockRejectedValue(new Error('storage offline'));
  const first = await downloadServiceReceipt('one');
  const second = await downloadServiceReceipt('one');
  expect(first.pdf.toString()).toBe('%PDF-mock');
  expect(second.ticket.receipt.number).toBe(first.ticket.receipt.number);
  expect(f.records.get('server_receipt_counters/2026-27').value).toBe(1);
  expect(f.save).not.toHaveBeenCalled();
});
it('regenerates a stored receipt when its file is unavailable', async () => {
  const stored = await ensureServiceReceipt('one');
  f.download.mockRejectedValue(new Error('file missing'));
  const result = await downloadServiceReceipt('one');
  expect(result.pdf.toString()).toBe('%PDF-mock');
  expect(result.ticket.receipt.number).toBe(stored.receipt.number);
});
it('still rejects unverified payments when downloading directly', async () => {
  f.records.get('tickets/one').payment.paidAt = null;
  await expect(downloadServiceReceipt('one')).rejects.toThrow('Verified service payment required');
});
