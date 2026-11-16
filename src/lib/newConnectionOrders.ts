import { bookingQuoteSchema } from './newConnectionPricing';
export { calculateNewConnectionPrice, advanceQuote, sameBookingQuote, moneyUnits } from './newConnectionPricing';
export type { BookingQuote } from './newConnectionPricing';
import { z } from 'zod';
import type { CatalogData, NewConnectionSettings } from './newConnectionCatalog';
import { compatibleEquipment, visibleCatalog } from './newConnectionBrowse';

export const paymentProviders = ['razorpay', 'youpi', 'manual', 'none'] as const;
export type NewConnectionProvider = typeof paymentProviders[number];
const id = z.string().regex(/^[\p{L}\p{N}_-]{1,128}$/u);
const text = (max: number) => z.string().trim().max(max);
export const TN_DISTRICTS = ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'] as const;
export const customerDetailsSchema = z.object({ name: text(100).min(2), phone: text(10).regex(/^[6-9][0-9]{9}$/), altPhone: text(10).refine(v => !v || /^[6-9][0-9]{9}$/.test(v)).default(''), email: text(254).refine(v => !v || z.email().safeParse(v).success).default(''), address: text(500).min(10), landmark: text(150).default(''), pincode: text(6).regex(/^[1-9][0-9]{5}$/), district: z.enum(TN_DISTRICTS), preferredDate: text(10).regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v), preferredSlot: z.enum(['Morning', 'Afternoon', 'Evening', 'Any']), notes: text(1000).default('') });
export const bookingInputSchema = z.object({ brandId: id, packId: id, offerId: id, selectedValidityDays: z.number().int().min(1).max(3650), connectionCount: z.number().int().min(1).max(3), customer: customerDetailsSchema, provider: z.enum(paymentProviders), consent: z.object({ terms: z.literal(true), contact: z.literal(true) }), displayedQuote: bookingQuoteSchema, idempotencyKey: z.string().uuid(), honeypot: z.string().max(0), formStartedAt: z.number().int().positive() }).strict();
export type BookingInput = z.infer<typeof bookingInputSchema>;
export const paymentStatusSchema = z.enum(['pending', 'awaiting_admin_confirmation', 'paid', 'failed', 'refunded', 'partially_refunded']);
export const bookingStatusSchema = z.enum(['received', 'contacted', 'scheduled', 'installed', 'cancelled', 'refund_initiated', 'refunded']);
export const ledgerEntrySchema = z.object({ id: text(128).min(1), type: z.enum(['payment', 'refund']), amount: z.number().positive().refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001), method: z.enum(['razorpay', 'youpi', 'cash', 'upi', 'bank_transfer', 'other']), reference: text(128), recordedBy: text(140).min(1), recordedAt: z.string(), note: text(500), paymentEntryId: text(128).default('') });
export type ConnectionLedgerEntry = z.infer<typeof ledgerEntrySchema>;
export const connectionTransitions: Record<z.infer<typeof bookingStatusSchema>, readonly z.infer<typeof bookingStatusSchema>[]> = {
  received: ['contacted', 'cancelled'], contacted: ['scheduled', 'cancelled'], scheduled: ['installed', 'cancelled'], installed: [], cancelled: [], refund_initiated: [], refunded: [],
};
export const newConnectionOrderSchema = bookingQuoteSchema.extend({ id, bookingId: z.string().regex(/^DTH-NC-\d{6}-[A-Z0-9]{4}$/), uid: text(128).min(1), brandId: id, packId: id, offerId: id, selectedValidityDays: z.number().int(), connectionCount: z.number().int().min(1).max(3), snapshot: z.object({ brand: text(200), pack: text(200), offer: text(200) }), customer: customerDetailsSchema, provider: z.enum(paymentProviders), providerOrderId: text(128), providerPaymentId: text(128), providerRaw: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}), razorpayOrderId: text(128).default(''), razorpayPaymentId: text(128).default(''), paymentStatus: paymentStatusSchema, status: bookingStatusSchema, statusHistory: z.array(z.object({ status: text(64), at: z.string(), by: text(140), note: text(500) })).max(100), ledger: z.array(ledgerEntrySchema).max(500).default([]), amountPaid: z.number().default(0), amountRefunded: z.number().default(0), balance: z.number().default(0), schedule: z.object({ date: text(10), slot: z.enum(['Morning', 'Afternoon', 'Evening', 'Any']) }).nullable().default(null), installedAt: z.string().default(''), cancellationRequest: z.object({ at: z.string(), customerReason: text(500), status: z.enum(['open', 'accepted', 'declined']) }).nullable().default(null), notificationFailed: z.boolean().default(false), failedNotificationEvents: z.array(text(128)).default([]), pendingRefunds: z.array(z.object({ id: text(128), paymentEntryId: text(128), amount: z.number().positive(), status: z.enum(['initiated', 'failed', 'completed']), providerRefundId: text(128) })).max(500).default([]), adminNotes: z.literal('').default(''), consent: z.object({ terms: z.literal(true), contact: z.literal(true), at: z.string() }), createdAt: z.string(), updatedAt: z.string(), testMode: z.boolean() });
export type NewConnectionOrder = z.infer<typeof newConnectionOrderSchema>;
// Part 3 captures are backfilled deterministically, without trusting client claims.
export function withConnectionLedger(value: unknown): NewConnectionOrder {
  const order = newConnectionOrderSchema.parse(value);
  if (!order.ledger.length && order.providerPaymentId && ['paid', 'partially_refunded', 'refunded'].includes(order.paymentStatus) && order.amountDueNow > 0) {
    if (order.paymentStatus !== 'paid') throw new Error('LEGACY_REFUND_REQUIRES_REVIEW');
    order.ledger.push({ id: `gateway_${order.providerPaymentId}`, type: 'payment', amount: order.amountDueNow, method: order.provider === 'youpi' ? 'youpi' : 'razorpay', reference: order.providerPaymentId, recordedBy: order.statusHistory.find(h => h.by.startsWith('admin:'))?.by.slice(6) || 'system:verified_provider', recordedAt: order.statusHistory.find(h => h.status === 'paid')?.at || order.updatedAt, note: '', paymentEntryId: '' });
  }
  if (order.amountDueNow < order.priceBreakdown.total && order.providerPaymentId) order.statusHistory = order.statusHistory.map(h => h.status === 'paid' ? { ...h, status: 'payment_recorded' } : h);
  return deriveConnectionLedger(order);
}
export function deriveConnectionLedger(order: NewConnectionOrder): NewConnectionOrder {
  if (order.ledger.length > 500) throw new Error('LEDGER_LIMIT_REACHED');
  const paid = order.ledger.filter(e => e.type === 'payment').reduce((n, e) => n + Math.round(e.amount * 100), 0);
  const refunded = order.ledger.filter(e => e.type === 'refund').reduce((n, e) => n + Math.round(e.amount * 100), 0);
  const net = paid - refunded; const total = Math.round(order.priceBreakdown.total * 100);
  if (net < 0 || net > total) throw new Error('INVALID_LEDGER');
  return { ...order, amountPaid: net / 100, amountRefunded: refunded / 100, balance: (total - net) / 100, paymentStatus: refunded ? (net === 0 ? 'refunded' : 'partially_refunded') : net > 0 && net === total ? 'paid' : order.paymentStatus === 'awaiting_admin_confirmation' && !order.providerPaymentId ? 'awaiting_admin_confirmation' : 'pending' };
}
export function gatewayPaymentRecorded(order: NewConnectionOrder) { return order.ledger.some(e => e.type === 'payment' && e.method === order.provider && e.reference === order.providerPaymentId); }
export function installationDateBounds(now = Date.now()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  const parts = today.split('-').map(Number); const day = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return { min: new Date(day + 86400000).toISOString().slice(0, 10), max: new Date(day + 14 * 86400000).toISOString().slice(0, 10), today };
}
export function bookingServiceable(customer: Pick<BookingInput['customer'], 'pincode' | 'district'>, settings: Pick<NewConnectionSettings, 'serviceablePincodes' | 'serviceableDistricts'>) {
  return (!settings.serviceablePincodes.length || settings.serviceablePincodes.includes(customer.pincode)) && (!settings.serviceableDistricts.length || settings.serviceableDistricts.some(d => d.trim().toLowerCase() === customer.district.toLowerCase()));
}
export function selectedBookingItem(data: CatalogData, brandId: string, packId: string, offerId: string, validity: number) {
  const item = visibleCatalog(data).find(i => i.brand.id === brandId && i.pack.id === packId); const offer = item && compatibleEquipment(item, data.equipment).find(o => o.id === offerId); const option = item?.pack.pricingOptions.find(p => p.validityDays === validity);
  if (!item || !offer || !option) throw new Error('SELECTION_UNAVAILABLE'); return { item, offer, option };
}
