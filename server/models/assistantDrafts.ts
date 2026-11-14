import { ownedAssistantOrders, summarizeAssistantOrder } from './assistantHistory';
import { refundDraftArgs, type RefundDraft } from '../../src/lib/assistantDrafts';
import { collections } from '../persistence';
import { queryRecords } from '../queries';
import type { PaymentLedgerEntry } from './paymentLedger';

// Read-only. Never persists a draft, changes an order or initiates a refund.
// Only verified, unfinished recharges are marked eligible; other owned orders can still be reviewed by Support.
export async function draftRefund(uid: string, args: unknown): Promise<RefundDraft> {
  const draft = refundDraftArgs.parse(args);
  const [record] = await ownedAssistantOrders(uid, 1, draft.order_id);
  const order = record ? summarizeAssistantOrder(record) : null;
  const result = (status: RefundDraft['eligibility']['status'], explanation: string): RefundDraft =>
    ({ type: 'refund_draft', draft, order, eligibility: { status, explanation } });
  if (!record) return result('unavailable', 'No matching order was found in your account. Refund eligibility cannot be checked.');
  if (record.testMode) return result('ineligible', 'This is a test order. No real payment refund can be requested.');
  if (!record.paymentId) return result('manual_review_required', 'This order is in your account, but its captured payment could not be confirmed. Support can review it; this request does not approve or initiate a refund.');
  const payments = await queryRecords<PaymentLedgerEntry>(collections.payments, [
    { field: 'customerUid', op: 'eq', value: uid }, { field: 'orderId', op: 'eq', value: draft.order_id },
    { field: 'id', op: 'eq', value: record.paymentId },
  ], { limit: 2 });
  const payment = payments.find(item => item.customerUid === uid && item.orderId === draft.order_id && item.id === record.paymentId);
  if (payment?.testMode) return result('ineligible', 'This is a test order. No real payment refund can be requested.');
  if (payment?.status === 'refunded' || payment?.providerStatus === 'refunded') return result('ineligible', 'The payment for this order has already been refunded. A second refund request cannot be submitted.');
  if (record.rechargeStatus === 'completed') return result('manual_review_required', 'This order is already completed. You can still ask Support to review a reported service issue; no refund is automatic.');
  if (!['pending', 'processing', 'failed'].includes(record.rechargeStatus) ||
      !payment || payment.status !== 'paid' || payment.providerStatus !== 'captured' || payment.amount !== record.amount || payment.currency !== 'INR') {
    return result('manual_review_required', 'This order is in your account, but its captured payment could not be confirmed. Support can review it; this request does not approve or initiate a refund.');
  }
  return result('eligible', 'This order belongs to you and its payment is captured. You can request a Support review; this does not approve or initiate a refund.');
}
