import { AdminRefreshButton } from '../AdminRefreshButton';
import React, { useState } from 'react';
import { Search, Eye, X } from '../../../lib/icons';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';
import { PaymentReportItem } from '../hooks/useAdminData';
import { Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

type PaymentSortKey = keyof PaymentReportItem;

interface PaymentsTabProps {
  payments: PaymentReportItem[];
  paymentsLoading: boolean;
  onRefresh: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
  getAuthHeaders?: () => Promise<Record<string, string>>;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  paymentsLoading,
  onRefresh,
  currentTheme,
  currentLang,
  getAuthHeaders,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [selectedPayment, setSelectedPayment] = useState<PaymentReportItem | null>(null);
  const { modalRef } = useAccessibleModal({ isOpen: Boolean(selectedPayment), onClose: () => setSelectedPayment(null) });
  const [paySearch, setPaySearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  async function syncRazorpay() {
    if (!getAuthHeaders || syncing) return;
    setSyncing(true); setSyncMessage('');
    try {
      const response = await fetch('/api/admin/payments/sync', { method: 'POST', headers: await getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sync payments. Super-administrator access is required.');
      setSyncMessage(data.message); onRefresh();
    } catch (error) { setSyncMessage(error instanceof Error ? error.message : 'Payment sync failed.'); }
    finally { setSyncing(false); }
  }
  const [methodFilter, setMethodFilter] = useState('all');
  const [sort, setSort] = useState<{ key: PaymentSortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const operators: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV & D2H', d2h: 'Dish TV & D2H' };
  const methods: Record<string, string> = { upi: 'UPI', qr_code: 'QR code', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet' };
  const dateLabel = (value: string, time = false) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Unavailable';
    return time ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  };
  const heading = (key: PaymentSortKey, label: string, className = '') => (
    <th scope="col" className={`p-3.5 font-medium ${className}`} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className="catalog-sort-heading" onClick={() => setSort((previous) => ({ key, direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc' }))}>
        {label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '\u2191' : '\u2193') : '\u2195'}</span>
      </button>
    </th>
  );

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      p.id.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.customerName.toLowerCase().includes(paySearch.toLowerCase()) ||
      (p.operatorRefId || '').toLowerCase().includes(paySearch.toLowerCase()) ||
      (p.orderId || '').toLowerCase().includes(paySearch.toLowerCase()) ||
      (p.smartCardNumber || '').toLowerCase().includes(paySearch.toLowerCase());
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchSearch && matchMethod && (modeFilter === 'all' || (modeFilter === 'test' ? p.testMode === true : p.testMode !== true));
  }).sort((a, b) => {
    const { key, direction } = sort;
    const value = (item: PaymentReportItem) => key === 'operator' ? operators[item.operator] || item.operator : key === 'paymentMethod' ? methods[item.paymentMethod] || item.paymentMethod : String(item[key] ?? '');
    const comparison = key === 'amount' ? a.amount - b.amount : key === 'createdAt' ? (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) : value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: 'base' });
    return (direction === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
  });

  const settledPayments = filteredPayments.filter((payment) => payment.status === 'paid' && !payment.testMode);
  const totalVolume = settledPayments.reduce((acc, payment) => acc + payment.amount, 0);

  return (
    <div className="admin-tab payments-tab space-y-4">
      {/* Metrics Banner */}
      <section aria-label="Payment summary" className="payments-summary">
      <div className="admin-summary">
        <div className="admin-summary-item">
          <div className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-muted'}`}>Total paid (live)</div>
          <div className="text-2xl font-bold mt-1 text-success">Rs. {totalVolume.toLocaleString('en-IN')}</div>
        </div>
        <div className="admin-summary-item">
          <div className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-muted'}`}>Paid transactions (live)</div>
          <div className="text-2xl font-mono font-bold mt-1">{settledPayments.length}</div>
        </div>
      </div>

      </section>

      {/* Filter Bar */}
      <div className={`admin-toolbar flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-paper border-rule shadow-none' : 'bg-paper-2 border-rule'
      }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <input
              type="text"
              placeholder="Search transaction, customer or reference"
              aria-label="Search payments"
              value={paySearch}
              onChange={(e) => setPaySearch(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm border focus:outline-none ${
                isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-ink/30 border-rule text-accent-ink'
              }`}
            />
          </div>

          <select
            aria-label="Payment method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`w-full sm:w-auto border text-sm rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <option value="all">{t.allPaymentMethods}</option>
            <option value="upi">UPI (GPay / PhonePe)</option>
            <option value="qr_code">QR code</option>
            <option value="card">Debit / Credit Card</option>
            <option value="netbanking">Net banking</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>

        <select aria-label="Payment environment" value={modeFilter} onChange={event => setModeFilter(event.target.value)} className="border border-rule rounded-lg p-2 bg-paper"><option value="all">All payments</option><option value="live">Live payments</option><option value="test">Test payments</option></select>
        {getAuthHeaders && <button type="button" disabled={syncing} onClick={() => void syncRazorpay()} className="border border-rule rounded-lg px-3 py-2">{syncing ? 'Syncing…' : 'Sync recent Razorpay payments'}</button>}
        <AdminRefreshButton onRefresh={onRefresh} loading={paymentsLoading || syncing} label={t.refresh} />
      </div>
      {syncMessage && <p role="status" className="text-sm">{syncMessage}</p>}

      {/* Payments Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                {heading('id', 'Transaction')}
                {heading('createdAt', 'Date (IST)')}
                {heading('customerName', 'Customer')}
                {heading('operator', 'Operator', 'hidden md:table-cell')}
                {heading('paymentMethod', 'Method', 'hidden sm:table-cell')}
                {heading('amount', 'Amount', 'text-right')}
                {heading('status', 'Payment status')}
                <th scope="col" className="payment-details-heading p-3.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {paymentsLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted" role="status">Loading payments...</td></tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted ">
                    {t.noPaymentsFound}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-paper-2 transition-colors">
                    <td data-label="Transaction" className="payment-transaction p-3.5 font-mono font-bold">{p.id}{p.testMode && <span className="block text-xs text-muted mt-1">TEST · No real money</span>}</td>
                    <td data-label="Date (IST)" className="p-3.5 text-xs"><div>{dateLabel(p.createdAt)}</div><div className="text-muted mt-1">{dateLabel(p.createdAt, true)}</div></td>
                    <td data-label="Customer" className="payment-customer p-3.5 font-medium">{p.customerName}</td>
                    <td data-label={t.operatorLabel} className="hidden md:table-cell p-3.5 capitalize"><span className="compact-plan-pill compact-plan-operator" data-operator={p.operator}>{operators[p.operator] || p.operator}</span></td>
                    <td data-label="Payment method" className="hidden sm:table-cell p-3.5 text-sm font-medium text-ink ">{methods[p.paymentMethod] || p.paymentMethod}</td>
                    <td data-label={t.amount} className="payment-amount p-3.5 font-medium text-sm text-right tabular-nums"><span className="compact-plan-pill payment-amount-pill">Rs. {p.amount.toLocaleString('en-IN')}</span></td>
                    <td data-label="Payment status" className="p-3.5">
                      <span className={`payment-status-pill payment-status-${p.status}`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td data-label="View details" className="payment-details-cell p-3.5"><button type="button" className="history-view-action rounded-lg hover:bg-paper-2" title="View details" aria-label={`View payment details for ${p.id}`} onClick={() => setSelectedPayment(p)}><Eye className="w-4 h-4" /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-scrim/70 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setSelectedPayment(null); }}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="payment-details-title" tabIndex={-1} className="history-details-dialog bg-paper text-ink border border-rule">
            <div className="history-details-header">
              <div><h3 id="payment-details-title">Payment details</h3><p className="history-details-order">{selectedPayment.id}</p></div>
              <button type="button" className="history-details-close" aria-label="Close payment details" onClick={() => setSelectedPayment(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="history-details-hero">
              <div className="history-details-connection">
                <span className="compact-plan-pill compact-plan-operator" data-operator={selectedPayment.operator}>{operators[selectedPayment.operator] || selectedPayment.operator}</span>
                <strong>{selectedPayment.customerName || 'Customer'}</strong>
              </div>
              <div className="history-details-total"><span className="history-details-label">Payment amount</span><strong>Rs. {selectedPayment.amount.toLocaleString('en-IN')}</strong><span className={`payment-status-pill payment-status-${selectedPayment.status}`}>{selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}</span></div>
            </div>
            <section className="history-details-section" aria-label="Payment information">
              <dl className="history-details-fields">
                <div><dt>Environment</dt><dd>{selectedPayment.testMode ? 'Test payment · No real money' : 'Live'}</dd></div>
                <div><dt>Razorpay order</dt><dd>{selectedPayment.orderId || 'Not provided'}</dd></div>
                <div><dt>Subscriber ID</dt><dd>{selectedPayment.smartCardNumber || 'Not recorded for this payment'}</dd></div>
                <div><dt>Plan</dt><dd>{selectedPayment.packName || 'Not recorded for this payment'}</dd></div>
                <div><dt>Provider status</dt><dd>{selectedPayment.providerStatus || selectedPayment.status}</dd></div>
                <div><dt>Payment method</dt><dd>{methods[selectedPayment.paymentMethod] || selectedPayment.paymentMethod}</dd></div>
                <div><dt>Date (IST)</dt><dd>{dateLabel(selectedPayment.createdAt)}<br />{dateLabel(selectedPayment.createdAt, true)}</dd></div>
              </dl>
            </section>
            <div className="history-details-reference"><span>Operator reference</span><span className="font-mono">{selectedPayment.operatorRefId || 'Not provided'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
