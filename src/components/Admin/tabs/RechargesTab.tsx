import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Radio, 
  Check, 
  RefreshCw,
  Phone,
  Eye
} from 'lucide-react';
import { RechargeOrder, Language, DthOperatorId } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';

interface RechargesTabProps {
  orders: RechargeOrder[];
  ordersLoading: boolean;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
}

export const RechargesTab: React.FC<RechargesTabProps> = ({
  orders,
  ordersLoading,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
  onTriggerRefresh,
}) => {
  const isLight = currentTheme.isLightMode;
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderId.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.smartCardNumber.includes(orderSearch) ||
      (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.rechargeStatus === statusFilter;
    const matchOp = opFilter === 'all' || o.operator === opFilter;
    return matchSearch && matchStatus && matchOp;
  });

  const handleUpdateStatus = async (orderId: string, newStatus: 'completed' | 'failed' | 'processing') => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          rechargeStatus: newStatus,
          workerNotes: `Updated to ${newStatus} by admin portal on ${new Date().toLocaleTimeString()}`,
        }),
      });

      if (res.ok) {
        showToast(`Order ${orderId} marked as ${newStatus}`);
        onRefresh();
      }
    } catch (err) {
      showToast('Failed to update status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, card number, or name..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border focus:outline-none ${
                isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-black/30 border-white/20 text-white'
              }`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`border text-xs rounded-xl px-3 py-2 focus:outline-none ${
              isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#140029] border-white/20 text-white'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value)}
            className={`border text-xs rounded-xl px-3 py-2 focus:outline-none ${
              isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#140029] border-white/20 text-white'
            }`}
          >
            <option value="all">All Operators</option>
            <option value="sun_direct">Sun Direct</option>
            <option value="tata_play">Tata Play</option>
            <option value="airtel_dth">Airtel DTH</option>
            <option value="dish_tv">Dish TV</option>
            <option value="d2h">D2H</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className={`p-2.5 rounded-xl border transition-colors ${
            isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title="Refresh orders"
        >
          <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-gray-50/80 text-gray-600 border-gray-200' : 'bg-white/[0.03] text-gray-400 border-white/10'}`}>
              <tr>
                <th className="p-3.5 font-bold uppercase tracking-wider">Order ID & Date</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Customer & Card</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Pack & Validity</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Amount & Payment</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No recharge orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono">
                      <div className="font-bold">{ord.orderId}</div>
                      <div className="text-[10px] opacity-60">
                        {new Date(ord.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold">{ord.customerName || 'Subscriber'}</div>
                      <div className="text-[11px] font-mono opacity-75">{ord.operatorName} • {ord.smartCardNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium">{ord.packName}</div>
                      <div className="text-[10px] opacity-60">{ord.packValidity}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-sm">₹{ord.amount}</div>
                      <div className="text-[10px] uppercase opacity-60 font-semibold">{ord.paymentMethod}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                        ord.rechargeStatus === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : ord.rechargeStatus === 'failed'
                          ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                      }`}>
                        {ord.rechargeStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {ord.rechargeStatus === 'pending' && <Clock className="w-3 h-3" />}
                        {ord.rechargeStatus === 'failed' && <AlertCircle className="w-3 h-3" />}
                        <span>{ord.rechargeStatus}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {ord.rechargeStatus !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.orderId, 'completed')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow"
                        >
                          Credit Box
                        </button>
                      )}
                      <button
                        onClick={() => onTriggerRefresh(ord.operator, ord.smartCardNumber)}
                        className="p-1.5 rounded-lg border text-purple-400 hover:bg-purple-500/10 transition-colors"
                        title="Send satellite refresh pulse"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
