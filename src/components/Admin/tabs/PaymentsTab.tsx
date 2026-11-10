import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileSpreadsheet
} from '../../../lib/icons';
import { PaymentReportItem } from '../hooks/useAdminData';
import { Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface PaymentsTabProps {
  payments: PaymentReportItem[];
  paymentsLoading: boolean;
  onRefresh: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  paymentsLoading,
  onRefresh,
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [paySearch, setPaySearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      p.id.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.customerName.toLowerCase().includes(paySearch.toLowerCase()) ||
      p.operatorRefId.toLowerCase().includes(paySearch.toLowerCase());
    const matchMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchSearch && matchMethod;
  });

  const settledPayments = filteredPayments.filter((payment) => payment.status === 'paid');
  const totalVolume = settledPayments.reduce((acc, payment) => acc + payment.amount, 0);

  return (
    <div className="admin-tab space-y-6">
      {/* Metrics Banner */}
      <div className="admin-summary">
        <div className="admin-summary-item">
          <div className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-muted'}`}>{t.totalSettledVolume} / Current filters</div>
          <div className="text-2xl font-mono font-bold mt-1 text-success">₹{totalVolume.toLocaleString()}</div>
        </div>
        <div className="admin-summary-item">
          <div className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-muted'}`}>{t.settledTransactions} / Current filters</div>
          <div className="text-2xl font-mono font-bold mt-1">{settledPayments.length}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`admin-toolbar flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-paper border-rule shadow-none' : 'bg-paper-2 border-rule'
      }`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
            <input
              type="text"
              placeholder={t.searchPayments}
              value={paySearch}
              onChange={(e) => setPaySearch(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-sm border focus:outline-none ${
                isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-ink/30 border-rule text-accent-ink'
              }`}
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`w-full sm:w-auto border text-sm rounded-xl px-3 py-2 focus-visible:outline focus-visible:outline-2 ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <option value="all">{t.allPaymentMethods}</option>
            <option value="upi">UPI (GPay / PhonePe)</option>
            <option value="qr_code">Dynamic QR Code</option>
            <option value="card">Debit / Credit Card</option>
            <option value="netbanking">Net Banking</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className={`p-2.5 rounded-xl border transition-colors ${
            isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper-2 hover:bg-paper-2 text-accent-ink'
          }`}
          title={t.refresh}
        >
          <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Payments Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                <th className="p-3.5 font-medium">{t.transactionId}</th>
                <th className="p-3.5 font-medium">{t.customer}</th>
                <th className="hidden md:table-cell p-3.5 font-medium">{t.operatorLabel}</th>
                <th className="hidden sm:table-cell p-3.5 font-medium">{t.paymentMethod}</th>
                <th className="p-3.5 font-medium">{t.amount}</th>
                <th className="p-3.5 font-medium">{t.status}</th>
                <th className="hidden lg:table-cell p-3.5 font-medium text-right">Gateway Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted ">
                    {t.noPaymentsFound}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-paper-2 transition-colors">
                    <td data-label={t.transactionId} className="p-3.5 font-mono font-bold">{p.id}</td>
                    <td data-label={t.customer} className="p-3.5 font-medium">{p.customerName}</td>
                    <td data-label={t.operatorLabel} className="hidden md:table-cell p-3.5 capitalize">{p.operator.replace('_', ' ')}</td>
                    <td data-label={t.paymentMethod} className="hidden sm:table-cell p-3.5 text-sm font-medium text-ink ">{p.paymentMethod}</td>
                    <td data-label={t.amount} className="p-3.5 font-mono font-medium text-sm text-success">₹{p.amount}</td>
                    <td data-label={t.status} className="p-3.5">
                      <span className="text-sm px-2 py-0.5 rounded-full bg-success/10 text-success font-bold  border border-rule">
                        {p.status}
                      </span>
                    </td>
                    <td data-label="Gateway Ref" className="hidden lg:table-cell p-3.5 text-right font-mono text-sm text-ink ">{p.operatorRefId}</td>
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
