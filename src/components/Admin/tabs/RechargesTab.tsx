import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Check,
  RefreshCw,
  Phone,
  Eye
} from '../../../lib/icons';
import { RechargeOrder, Language, DthOperatorId, isSameDthOperatorGroup } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface RechargesTabProps {
  orders: RechargeOrder[];
  ordersLoading: boolean;
  ordersError: string | null;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const RechargesTab: React.FC<RechargesTabProps> = ({
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
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderId.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.smartCardNumber.includes(orderSearch) ||
      (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.rechargeStatus === statusFilter;
    const matchOp = opFilter === 'all' || isSameDthOperatorGroup(o.operator, opFilter as DthOperatorId);
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
    <div className="admin-tab space-y-6">
      {/* Search & Filters */}
      <div className={`admin-toolbar flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-paper border-rule shadow-none' : 'bg-paper-2 border-rule'
      }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <input
              type="text"
              placeholder={t.searchOrders}
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm border focus:outline-none ${
                isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-ink/30 border-rule text-accent-ink'
              }`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full sm:w-auto border text-sm rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <option value="all">{t.allStatuses}</option>
            <option value="completed">{t.completed}</option>
            <option value="pending">{t.pending}</option>
            <option value="processing">Processing</option>
            <option value="failed">{t.failed}</option>
          </select>

          <select
            value={opFilter}
            onChange={(e) => setOpFilter(e.target.value)}
            className={`w-full sm:w-auto border text-sm rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <option value="all">{t.allOperators}</option>
            <option value="sun_direct">Sun Direct</option>
            <option value="tata_play">Tata Play</option>
            <option value="airtel_dth">Airtel DTH</option>
            <option value="dish_tv">Dish TV &amp; D2H</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className={`p-2.5 rounded-xl border transition-colors ${
            isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper-2 hover:bg-paper-2 text-accent-ink'
          }`}
          title={t.refresh}
        >
          <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                <th className="p-3.5 font-medium">{t.orderIdAndDate}</th>
                <th className="p-3.5 font-bold  ">{t.customerAndCard}</th>
                <th className="hidden md:table-cell p-3.5 font-medium">{t.packAndValidity}</th>
                <th className="p-3.5 font-medium">{t.amountAndPayment}</th>
                <th className="p-3.5 font-medium">{t.status}</th>
                <th className="p-3.5 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {ordersError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-error ">{ordersError}</p>
                    <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      Retry loading recharges
                    </button>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    {t.noOrdersFound}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-paper-2 transition-colors">
                    <td data-label={t.orderIdAndDate} className="p-3.5 font-mono">
                      <div className="font-bold">{ord.orderId}</div>
                      <div className="hidden sm:block text-sm text-muted ">
                        {new Date(ord.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td data-label={t.customerAndCard} className="p-3.5">
                      <div className="font-medium">{ord.customerName || t.customer}</div>
                      <div className="text-sm font-mono text-muted ">{ord.operatorName} • {ord.smartCardNumber}</div>
                    </td>
                    <td data-label={t.packAndValidity} className="hidden md:table-cell p-3.5">
                      <div className="font-medium">{ord.packName}</div>
                      <div className="text-sm text-muted ">{ord.packValidity}</div>
                    </td>
                    <td data-label={t.amountAndPayment} className="p-3.5">
                      <div className="font-mono font-medium text-sm">₹{ord.amount}</div>
                      <div className="text-sm  text-muted  font-medium">{ord.paymentMethod}</div>
                    </td>
                    <td data-label={t.status} className="p-3.5">
                      <span className={`text-sm px-2.5 py-1 rounded-full font-bold  inline-flex items-center gap-1 ${
                        ord.rechargeStatus === 'completed'
                          ? 'bg-success/10 text-success border border-rule'
                          : ord.rechargeStatus === 'failed'
                          ? 'bg-error/10 text-error border border-rule'
                          : 'bg-warning/10 text-warning border border-rule'
                      }`}>
                        {ord.rechargeStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {ord.rechargeStatus === 'pending' && <Clock className="w-3 h-3" />}
                        {ord.rechargeStatus === 'failed' && <AlertCircle className="w-3 h-3" />}
                        <span>{ord.rechargeStatus}</span>
                      </span>
                    </td>
                    <td data-label={t.actions} className="p-3.5 text-right space-x-1.5">
                      {ord.rechargeStatus !== 'completed' && (
                        <button
                          onClick={() => handleUpdateStatus(ord.orderId, 'completed')}
                          className="px-2.5 py-1 rounded-lg bg-accent hover:bg-success/10 text-accent-ink font-bold text-sm shadow"
                        >
                          {t.creditBox}
                        </button>
                      )}
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
