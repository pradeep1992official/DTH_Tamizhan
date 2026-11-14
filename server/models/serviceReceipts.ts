import { getStorage } from 'firebase-admin/storage';
import { getAdminFirestore } from '../middleware/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { serviceBusinessDetails } from '../serviceBusiness';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
import { receiptPdf } from '../receiptPdf';

export function receiptFinancialYear(paidAt: string) {
  const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date(paidAt)).split('-').map(Number);
  const start = month >= 4 ? year : year - 1; return `${start}-${String(start + 1).slice(-2)}`;
}
export function serviceReceiptData(ticket: Ticket, brandName: string) {
  const business = serviceBusinessDetails();
  if (!ticket.payment.paidAt || !ticket.payment.paymentId || !ticket.receipt.number) throw new Error('Verified payment and receipt number required.');
  return { title: 'Service payment receipt', testMode: true,
    rows: [
      ['Business', `DTH Tamizhan / ${business.legalName}`], ['Address', business.address], ['Phone', business.phone], ['Email', business.email], ['Website', business.website],
      ['Receipt number', ticket.receipt.number], ['Paid at (IST)', new Date(ticket.payment.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
      ['Customer', ticket.name], ['Customer phone', ticket.phone], ['Request', ticket.ticketNo], ['Brand', brandName],
      ['Subscriber ID', `${'*'.repeat(Math.max(0, ticket.subscriberId.length - 4))}${ticket.subscriberId.slice(-4)}`],
      ['Service', `Complaint registration assistance service - ${brandName}`], ['Amount paid', 'INR 50.00'], ['Payment reference', ticket.payment.paymentId],
      ['Status', ticket.payment.status === 'refunded' ? 'Refunded' : 'Paid'],
    ], note: 'This is a computer generated receipt. Test payment: no real money collected. This receipt is not a tax invoice.' };
}
const bucket = () => getStorage().bucket(process.env.TICKET_STORAGE_BUCKET || firebaseConfig.storageBucket);
export async function ensureServiceReceipt(ticketId: string) {
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(ticketId);
  const ticket = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const current = ticketSchema.parse(snapshot.data());
    if (!current.payment.paidAt || !current.payment.paymentId || !['paid', 'refunding', 'refunded'].includes(current.payment.status)) throw new Error('Verified service payment required.');
    if (current.receipt.number) return current;
    const year = receiptFinancialYear(current.payment.paidAt); const counterRef = db.collection('server_receipt_counters').doc(year); const counter = await tx.get(counterRef);
    const previous = counter.exists ? counter.data()?.value : 0;
    if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new Error('Receipt counter unavailable.');
    const receipt = { number: `DTH/${year}/${String(previous + 1).padStart(4, '0')}`, path: `service-receipts/${current.uid}/${current.id}.pdf`, generatedAt: null };
    tx.set(counterRef, { value: previous + 1 }); tx.update(ref, { receipt }); return { ...current, receipt };
  });
  if (ticket.receipt.generatedAt) return ticket;
  const { readServiceBrands } = await import('./serviceBrands');
  const brandName = (await readServiceBrands()).find(brand => brand.id === ticket.brand)?.displayName || ticket.brand;
  const pdf = await receiptPdf(serviceReceiptData(ticket, brandName));
  await bucket().file(ticket.receipt.path!).save(pdf, { resumable: false, contentType: 'application/pdf', metadata: { cacheControl: 'private, no-store' } });
  const generatedAt = new Date().toISOString();
  await ref.update({ 'receipt.generatedAt': generatedAt });
  return { ...ticket, receipt: { ...ticket.receipt, generatedAt } };
}
export async function downloadServiceReceipt(ticketId: string) {
  const ticket = await ensureServiceReceipt(ticketId);
  const [pdf] = await bucket().file(ticket.receipt.path!).download();
  return { pdf, ticket };
}
