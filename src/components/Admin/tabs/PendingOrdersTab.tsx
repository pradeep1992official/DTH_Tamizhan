import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight
} from '../../../lib/icons';
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
  const pendingQueue = orders.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing');

  const handleProcessOrder = async (orderId: string, status: 'completed' | 'failed') => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          rechargeStatus: status,
          workerNotes: `Processed via Worker Queue on ${new Date().toLocaleTimeString()}`,
        }),
      });

      if (res.ok) {
        showToast(`Order ${orderId} marked as ${status}`);
        onRefresh();
      }
    } catch (err) {
      showToast('Error processing order');
    }
  };

  return (
    <div className="admin-tab space-y-6">
      {/* Queue Header Banner */}
      <div className={`admin-section-heading flex items-center justify-between gap-4 ${
        isLight ? 'bg-warning/10 border-rule text-ink' : 'bg-warning/10 border-rule text-accent-ink'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t.operatorQueueTitle}</h3>
            <p className="text-sm text-muted ">
              {pendingQueue.length} {pendingQueue.length === 1 ? t.order : t.orders} • {t.operatorQueueDesc}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl bg-warning/10 hover:bg-warning/10 text-warning transition-colors"
          title={t.refreshQueue}
          aria-label={t.refreshQueue}
        >
          <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Pending Orders Cards Grid */}
      {ordersError ? (
        <div role="alert" className={`p-6 rounded-lg border text-center ${isLight ? 'bg-error/10 border-rule text-error' : 'bg-error/10 border-rule text-error'}`}>
          <p className="text-sm font-medium">{ordersError}</p>
          <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Retry loading queue
          </button>
        </div>
      ) : pendingQueue.length === 0 ? (
        <div className={`p-12 text-center rounded-lg border ${
          isLight ? 'bg-paper border-rule text-ink' : 'bg-paper-2 border-rule text-muted'
        }`}>
          <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
          <h4 className="font-bold text-sm">{t.queueClear}</h4>
          <p className="text-sm text-muted  mt-1 font-medium">{t.queueClearDesc}</p>
        </div>
      ) : (
        <div className="admin-queue">
          {pendingQueue.map((order) => (
            <div
              key={order.orderId}
              className={`admin-queue-order space-y-3 relative ${
                isLight ? 'bg-paper border-rule text-ink shadow-none' : 'bg-paper-2 border-rule text-accent-ink'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-rule">
                <div className="font-mono text-sm font-bold text-warning">{order.orderId}</div>
                <span className="text-sm px-2.5 py-0.5 rounded-full bg-warning/10 text-warning  font-bold  border border-rule">
                  {order.rechargeStatus}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <div className="font-bold text-sm">{order.customerName || t.customer}</div>
                <div className="text-sm text-muted">{order.operatorName} • {order.smartCardNumber}</div>
                <div className="font-medium text-ink ">{order.packName} ({order.packValidity})</div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-rule text-sm">
                <div className="font-mono font-bold text-base">₹{order.amount}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleProcessOrder(order.orderId, 'failed')}
                    className="px-2.5 py-1.5 rounded-lg font-bold text-error hover:bg-error/10 text-sm"
                  >
                    {t.reject}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessOrder(order.orderId, 'completed')}
                    className="px-3 py-1.5 rounded-lg font-bold text-accent-ink bg-accent hover:bg-success/10 text-sm shadow"
                  >
                    {t.confirmCredit}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
