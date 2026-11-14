import { ownedAssistantOrders, summarizeAssistantOrder } from './assistantHistory';
import { refundDraftArgs, type RefundDraft } from '../../src/lib/assistantDrafts';
import { collections } from '../persistence';
import { queryRecords } from '../queries';
import type { PaymentLedgerEntry } from './paymentLedger';

// Read-only. Never persists a draft, changes an order or initiates a refund.
// Merchant rule: requests are allowed before recharge is marked completed, with no time deadline.
export async function draftRefund(uid: string, args: unknown): Promise<RefundDraft> {
  const draft = refundDraftArgs.parse(args);
  const [record] = await ownedAssistantOrders(uid, 1, draft.order_id);
  const order = record ? summarizeAssistantOrder(record) : null;
  const result = (status: RefundDraft['eligibility']['status'], explanation: string): RefundDraft =>
    ({ type: 'refund_draft', draft, order, eligibility: { status, explanation } });
  if (!record) return result('unavailable', 'No matching order was found in your account. Refund eligibility cannot be checked.');
  if (record.testMode) return result('ineligible', 'This is a test order. No real payment refund can be requested.');
  if (record.rechargeStatus === 'completed') return result('ineligible', 'This recharge is already marked completed. The before-completion refund-request cutoff has passed. Contact Support for any service-error review.');
  if (!['pending', 'processing', 'failed'].includes(record.rechargeStatus)) return result('unavailable', 'The recharge status could not be verified. Please contact Support.');
  if (!record.paymentId) return result('unavailable', 'A captured payment could not be verified. Please contact Support.');
  const payments = await queryRecords<PaymentLedgerEntry>(collections.payments, [
    { field: 'customerUid', op: 'eq', value: uid }, { field: 'orderId', op: 'eq', value: draft.order_id },
    { field: 'id', op: 'eq', value: record.paymentId },
  ], { limit: 2 });
  const payment = payments.find(item => item.customerUid === uid && item.orderId === draft.order_id && item.id === record.paymentId && !item.testMode);
  if (payment?.status === 'refunded' || payment?.providerStatus === 'refunded') return result('ineligible', 'This payment has already been refunded. A second refund request cannot be submitted.');
  if (!payment || payment.status !== 'paid' || payment.providerStatus !== 'captured' || payment.amount !== record.amount || payment.currency !== 'INR') return result('unavailable', 'A captured payment for this order could not be verified. Please contact Support to check the payment.');
  return result('eligible', 'Eligible to request review: this order belongs to you, its payment is captured, and the recharge is not marked completed. There is no separate time limit. Support must review the request; this does not approve or initiate a refund.');
}
