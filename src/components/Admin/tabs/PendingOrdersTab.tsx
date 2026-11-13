import { AdminRefreshButton } from '../AdminRefreshButton';
import React, { useState } from 'react';
import { pendingPaidRecharges } from '../../../lib/pendingRechargeOrders';
import { Clock, CheckCircle2 } from '../../../lib/icons';
import { RechargeOrder, Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface PendingOrdersTabProps {
  orders: RechargeOrder[];
  ordersLoading: boolean;
  ordersError: string | null;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const PendingOrdersTab: React.FC<PendingOrdersTabProps> = ({
  orders,
  ordersLoading,
  ordersError,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const pendingQueue = pendingPaidRecharges(orders);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleProcessOrder = async (orderId: string) => {
    if (processingIds.has(orderId)) return;
    setProcessingIds(ids => new Set(ids).add(orderId));
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST', headers,
        body: JSON.stringify({ orderId, rechargeStatus: 'completed', workerNotes: 'Recharge confirmed successful by admin' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to update recharge');
      showToast(`Order ${orderId} marked as successfully recharged`);
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error processing order');
    } finally {
      setProcessingIds(ids => { const next = new Set(ids); next.delete(orderId); return next; });
    }
  };

  return (
    <div className="admin-tab pending-orders-tab space-y-4">
      {/* Queue Header Banner */}
      <div className={`admin-section-heading flex items-center justify-between gap-4 ${
        isLight ? 'bg-warning/10 border-rule text-ink' : 'bg-warning/10 border-rule text-accent-ink'
      }`}>
        <div className="pending-queue-heading">
          <span className="pending-status pending-status-paid"><CheckCircle2 className="w-3 h-3" /> All paid</span>
          <span className="text-sm text-muted">{pendingQueue.length} awaiting recharge</span>
        </div>

        <AdminRefreshButton onRefresh={onRefresh} loading={ordersLoading} label={t.refresh} />
      </div>


      {/* Paid orders awaiting fulfillment */}
      {ordersError ? (
        <div role="alert" className={`p-6 rounded-lg border text-center ${isLight ? 'bg-error/10 border-rule text-error' : 'bg-error/10 border-rule text-error'}`}>
          <p className="text-sm font-medium">{ordersError}</p>
          <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Retry loading queue
          </button>
        </div>
      ) : ordersLoading ? (
        <p role="status" className="text-sm text-muted">Loading paid orders...</p>
      ) : pendingQueue.length === 0 ? (
        <div className={`p-6 text-center rounded-lg border ${
          isLight ? 'bg-paper border-rule text-ink' : 'bg-paper-2 border-rule text-muted'
        }`}>
          <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
          <h4 className="font-bold text-sm">No pending orders</h4>
        </div>
      ) : (
        <div className="admin-queue">
          {pendingQueue.map((order) => (
            <article key={order.orderId} aria-label={`Order ${order.orderId}`} className="admin-queue-order pending-compact-order">
              <div className="pending-order-details">
                <div className="compact-plan-pills pending-order-highlights">
                  <span className="compact-plan-pill compact-plan-operator" data-operator={order.operator}>{order.operatorName}</span>
                  <span className="compact-plan-pill pending-customer-id"><span className="pending-pill-label">ID</span> {order.smartCardNumber}</span>
                  <span className="compact-plan-pill pending-order-price">Rs. {order.amount.toLocaleString('en-IN')}</span>
                  {order.testMode && <span className="compact-plan-pill">TEST · No real recharge</span>}
                </div>
                <div className="pending-order-summary text-sm">
                  <strong title={`Order ${order.orderId}`}>{order.customerName || t.customer}</strong>
                  <span className="text-muted">{order.packName} ({order.packValidity})</span>
                </div>

              </div>
              <div className="pending-order-actions">
                <div className="pending-order-statuses text-sm">
                  
                  
                  <span className={`pending-status pending-status-${order.rechargeStatus}`}>
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
                <button type="button" disabled={processingIds.has(order.orderId)} aria-label={`Mark recharge successful for ${order.smartCardNumber}`} onClick={() => handleProcessOrder(order.orderId)}
                  className="px-3 py-2 rounded-lg font-bold text-accent-ink bg-accent text-sm disabled:opacity-50 disabled:cursor-wait">
                  {processingIds.has(order.orderId) ? 'Saving...' : 'Mark Successful'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
