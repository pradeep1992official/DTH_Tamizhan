import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  RefreshCw, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RechargeOrder, Language, DthOperatorId } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface PendingOrdersTabProps {
  orders: RechargeOrder[];
  ordersLoading: boolean;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
}

export const PendingOrdersTab: React.FC<PendingOrdersTabProps> = ({
  orders,
  ordersLoading,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
  onTriggerRefresh,
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
    <div className="space-y-6">
      {/* Queue Header Banner */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        isLight ? 'bg-amber-500/10 border-amber-500/20 text-gray-900' : 'bg-amber-500/10 border-amber-500/20 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Operator Verification Queue</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {pendingQueue.length} order{pendingQueue.length === 1 ? '' : 's'} waiting for transponder confirmation or credit dispatch.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 transition-colors"
          title="Refresh Queue"
          aria-label="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Pending Orders Cards Grid */}
      {pendingQueue.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/[0.02] border-white/10 text-gray-300'
        }`}>
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h4 className="font-bold text-sm">Queue is completely clear!</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">All customer recharge requests have been fulfilled successfully.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingQueue.map((order) => (
            <div
              key={order.orderId}
              className={`p-4 rounded-2xl border space-y-3 relative overflow-hidden transition-all ${
                isLight ? 'bg-white border-gray-200 text-gray-900 shadow-sm' : 'bg-white/[0.03] border-white/10 text-white'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-gray-500/20">
                <div className="font-mono text-xs font-bold text-amber-500">{order.orderId}</div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold uppercase border border-amber-500/30">
                  {order.rechargeStatus}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm">{order.customerName || 'Subscriber'}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-mono">{order.operatorName} • {order.smartCardNumber}</div>
                <div className="font-semibold text-gray-800 dark:text-gray-200">{order.packName} ({order.packValidity})</div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-500/20 text-xs">
                <div className="font-mono font-bold text-base">₹{order.amount}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTriggerRefresh(order.operator, order.smartCardNumber)}
                    className="p-1.5 rounded-lg border text-purple-400 hover:bg-purple-500/10"
                    title="Send refresh pulse"
                    aria-label="Send signal refresh pulse"
                  >
                    <Radio className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessOrder(order.orderId, 'failed')}
                    className="px-2.5 py-1.5 rounded-lg font-bold text-rose-500 hover:bg-rose-500/10 text-xs"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessOrder(order.orderId, 'completed')}
                    className="px-3 py-1.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-500 text-xs shadow"
                  >
                    Confirm Credit
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
