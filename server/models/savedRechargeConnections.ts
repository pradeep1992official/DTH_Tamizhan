import type { DthConnection, RechargeOrder } from '../../src/types';
import { getPackDuration, calculateConnectionExpiry } from '../../src/lib/connectionExpiry';
import { getAdminFirestore } from '../middleware/auth';
import { cleanData, documentKey, usesFirestore } from '../persistence';
import { limitedRecords } from '../queries';

export function connectionFromRecharge(order: RechargeOrder, existing?: DthConnection): DthConnection {
  const months = getPackDuration(order.packValidity);
  const completedAt = order.rechargeStatus === 'completed' ? order.completedAt || order.updatedAt : undefined;
  return cleanData({ ...existing,
    id: existing?.id || `recharge-${documentKey(`${order.user_id}|${order.operator}|${order.smartCardNumber}`)}`,
    user_id: order.user_id, operator: order.operator, operatorName: order.operatorName,
    smartCardNumber: order.smartCardNumber, nickname: existing?.nickname || `${order.operatorName} Box`,
    customerName: order.customerName, registeredMobile: order.registeredMobile || existing?.registeredMobile,
    lastRechargeDate: order.createdAt, packDurationMonths: months,
    rechargeCompletedAt: completedAt,
    expiryDate: months && completedAt ? calculateConnectionExpiry(completedAt, months) : undefined,
    monthlyPackPrice: months ? order.amount / months : undefined, packName: order.packName,
    createdAt: existing?.createdAt || order.createdAt,
  });
}

// Called only with orders from the provider-backed paid recharge model.
// Fulfillment saves the connection even when the customer's checkout tab is closed.
export async function syncCompletedRechargeConnection(order: RechargeOrder): Promise<void> {
  if (!usesFirestore() || order.paymentStatus !== 'paid' || order.rechargeStatus !== 'completed' ||
      !order.user_id || order.user_id === 'legacy-unassigned') return;
  const connections = await limitedRecords<DthConnection>('dth_connections', [
    { field: 'user_id', op: 'eq', value: order.user_id }, { field: 'operator', op: 'eq', value: order.operator },
    { field: 'smartCardNumber', op: 'eq', value: order.smartCardNumber },
  ], 1);
  const existing = connections.find(box => box.user_id === order.user_id && box.operator === order.operator && box.smartCardNumber === order.smartCardNumber);
  const proposed = connectionFromRecharge(order, existing);
  const db = getAdminFirestore();
  const ref = db.collection('dth_connections').doc(proposed.id);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() as DthConnection : undefined;
    if (current && (current.user_id !== order.user_id || current.operator !== order.operator || current.smartCardNumber !== order.smartCardNumber)) throw new Error('Connection identity mismatch.');
    if (current?.lastRechargeDate && Date.parse(current.lastRechargeDate) > Date.parse(order.createdAt)) return;
    transaction.set(ref, connectionFromRecharge(order, current || existing));
  });
}
