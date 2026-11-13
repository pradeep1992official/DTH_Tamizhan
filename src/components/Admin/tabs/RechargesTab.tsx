import { normalizeRechargeOrder } from '../../../lib/pendingRechargeOrders';
import { WhatsAppShare } from '../WhatsAppShare';
import { rechargeWhatsAppLink } from '../../../lib/whatsappNotifications';
import { AdminRefreshButton } from '../AdminRefreshButton';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';
import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Eye,
  X
} from '../../../lib/icons';
import { RechargeOrder, Language, DthOperatorId, isSameDthOperatorGroup } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

type OrderSortKey = 'createdAt' | 'operator' | 'smartCardNumber' | 'packName' | 'amount' | 'paymentMethod' | 'rechargeStatus';

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
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [sort, setSort] = useState<{ key: OrderSortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [selectedOrder, setSelectedOrder] = useState<RechargeOrder | null>(null);
  const { modalRef } = useAccessibleModal({ isOpen: Boolean(selectedOrder), onClose: () => setSelectedOrder(null) });
  const operatorNames: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV & D2H', d2h: 'Dish TV & D2H' };
  const paymentNames: Record<string, string> = { qr_code: 'QR code', card: 'Card', upi: 'UPI', netbanking: 'Net banking', wallet: 'Wallet' };
  const formatDate = (value: string, time = false) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Unavailable';
    return time ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  };
  const heading = (key: OrderSortKey, label: string, hidden = false) => (
    <th scope="col" className={`${hidden ? 'hidden md:table-cell ' : ''}p-3.5 font-medium`} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button className="catalog-sort-heading" type="button" onClick={() => setSort((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}>
        {label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '\u2191' : '\u2193') : '\u2195'}</span>
      </button>
    </th>
  );

  const filteredOrders = orders.map(normalizeRechargeOrder).filter((o) => {
    const matchSearch =
      o.orderId.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.smartCardNumber.includes(orderSearch) ||
      (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase()));
    const matchStatus = statusFilter === 'all' || o.rechargeStatus === statusFilter;
    const matchOp = opFilter === 'all' || isSameDthOperatorGroup(o.operator, opFilter as DthOperatorId);
    return matchSearch && matchStatus && matchOp;
  }).sort((a, b) => {
    const comparison = sort.key === 'amount' ? a.amount - b.amount : sort.key === 'createdAt' ? (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) : String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), undefined, { numeric: true, sensitivity: 'base' });
    return (sort.direction === 'asc' ? comparison : -comparison) || a.orderId.localeCompare(b.orderId);
  });

  return (
    <div className="admin-tab recharge-history-tab space-y-4">
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

        <AdminRefreshButton onRefresh={onRefresh} loading={ordersLoading} label={t.refresh} />
      </div>

      {/* Orders Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                {heading('createdAt', 'Order / Date')}
                {heading('operator', 'Operator')}
                {heading('smartCardNumber', 'Customer ID')}
                {heading('packName', 'Pack', true)}
                {heading('amount', 'Amount')}
                {heading('paymentMethod', 'Method')}
                {heading('rechargeStatus', t.status)}
                <th scope="col" className="history-actions-heading p-3.5 font-medium"><span>Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {ordersError ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-error ">{ordersError}</p>
                    <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      Retry loading recharges
                    </button>
                  </td>
                </tr>
              ) : ordersLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted" role="status">Loading recharge history...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    {t.noOrdersFound}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-paper-2 transition-colors">
                    <td data-label="Order / Date" className="p-3.5 history-order-cell">
                      <div className="font-bold font-mono history-order-id">{ord.orderId}</div>
                      <div className="history-order-date text-muted">
                        {formatDate(ord.createdAt)} <span>{formatDate(ord.createdAt, true)}</span>
                      </div>
                    </td>
                    <td data-label="Operator" className="p-3.5">
                      <span className="compact-plan-pill compact-plan-operator font-bold" data-operator={ord.operator}>{operatorNames[ord.operator] || ord.operatorName}</span>
                    </td>
                    <td data-label="Customer ID" className="p-3.5 font-mono text-xs font-bold">
                      <span className="compact-plan-pill history-customer-id">{ord.smartCardNumber}</span>
                    </td>
                    <td data-label="Pack" className="history-pack-cell hidden md:table-cell p-3.5">
                      <div className="font-medium">{ord.packName}</div>
                      <div className="text-sm text-muted ">{ord.packValidity}</div>
                    </td>
                    <td data-label="Amount" className="p-3.5">
                      <span className="compact-plan-pill history-amount">Rs. {ord.amount.toLocaleString('en-IN')}</span>
                    </td>
                    <td data-label="Payment method" className="p-3.5 text-sm text-muted">
                      {paymentNames[ord.paymentMethod] || ord.paymentMethod}
                    </td>
                    <td data-label={t.status} className="p-3.5">
                      <span className={`history-status history-status-${ord.rechargeStatus} inline-flex items-center gap-1`}>
                        {ord.rechargeStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {ord.rechargeStatus === 'pending' && <Clock className="w-3 h-3" />}
                        {ord.rechargeStatus === 'failed' && <AlertCircle className="w-3 h-3" />}
                        <span>{ord.rechargeStatus.charAt(0).toUpperCase() + ord.rechargeStatus.slice(1)}</span>
                      </span>
                    </td>
                    <td data-label="View details" className="p-3.5 text-right space-x-1.5">
                      <button type="button" onClick={() => setSelectedOrder(ord)} className="history-view-action rounded-lg hover:bg-paper-2" title="View details" aria-label={`View details for ${ord.orderId}`}><Eye className="w-4 h-4" /></button>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-scrim/70 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="history-details-title" tabIndex={-1} className="history-details-dialog bg-paper text-ink border border-rule">
            <div className="history-details-header">
              <div>
                <h3 id="history-details-title">Recharge details</h3>
                <p className="history-details-order">{selectedOrder.orderId}</p>
              </div>
              <button type="button" className="history-details-close" aria-label="Close recharge details" onClick={() => setSelectedOrder(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="history-details-hero">
              <div className="history-details-connection">
                <span className="compact-plan-pill compact-plan-operator" data-operator={selectedOrder.operator}>{operatorNames[selectedOrder.operator] || selectedOrder.operatorName}</span>
                <span className="history-details-label">Customer ID</span>
                <strong className="history-details-card">{selectedOrder.smartCardNumber}</strong>
                {selectedOrder.customerName && <span className="text-muted text-sm">{selectedOrder.customerName}</span>}
              </div>
              <div className="history-details-total">
                <span className="history-details-label">Recharge amount</span>
                <strong>Rs. {selectedOrder.amount.toLocaleString('en-IN')}</strong>
                <span className={`history-status history-status-${selectedOrder.rechargeStatus}`}>
                  {selectedOrder.rechargeStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                  {selectedOrder.rechargeStatus.charAt(0).toUpperCase() + selectedOrder.rechargeStatus.slice(1)}
                </span>
              </div>
            </div>
            <section className="history-details-section" aria-labelledby="history-pack-title">
              <h4 id="history-pack-title">Recharge</h4>
              <div className="history-details-pack"><strong>{selectedOrder.packName}</strong><span className="history-details-validity">{selectedOrder.packValidity}</span></div>
              <p className="text-muted text-sm">{formatDate(selectedOrder.createdAt)} at {formatDate(selectedOrder.createdAt, true)} IST</p>
            </section>
            <section className="history-details-section" aria-labelledby="history-payment-title">
              <h4 id="history-payment-title">Payment</h4>
              <dl className="history-details-fields">
                <div><dt>Method</dt><dd>{paymentNames[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</dd></div>
                <div><dt>Payment status</dt><dd><span className={`history-payment-status history-payment-${selectedOrder.paymentStatus}`}>{selectedOrder.paymentStatus === 'paid' && <CheckCircle2 className="w-3 h-3" />}{selectedOrder.paymentStatus.charAt(0).toUpperCase() + selectedOrder.paymentStatus.slice(1)}</span></dd></div>
              </dl>
            </section>
            <div className="history-details-reference"><span>Operator reference</span><span className="font-mono">{selectedOrder.operatorRefId || 'Not provided'}</span></div>
            {selectedOrder.paymentStatus === 'paid' && selectedOrder.rechargeStatus === 'completed' && <WhatsAppShare href={rechargeWhatsAppLink(selectedOrder)} currentLang={currentLang} />}
          </div>
        </div>
      )}
    </div>
  );
};
