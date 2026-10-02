import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { PaymentReportItem } from '../hooks/useAdminData';
import { Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';

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

  const totalVolume = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="text-xs opacity-60 font-semibold uppercase">Total Settled Volume</div>
          <div className="text-2xl font-mono font-bold mt-1 text-emerald-500">₹{totalVolume.toLocaleString()}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="text-xs opacity-60 font-semibold uppercase">Settled Transactions</div>
          <div className="text-2xl font-mono font-bold mt-1">{filteredPayments.length}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="text-xs opacity-60 font-semibold uppercase">Gateway Success Rate</div>
          <div className="text-2xl font-mono font-bold mt-1 text-indigo-400">99.8%</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID, reference, or name..."
              value={paySearch}
              onChange={(e) => setPaySearch(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border focus:outline-none ${
                isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-black/30 border-white/20 text-white'
              }`}
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`border text-xs rounded-xl px-3 py-2 focus:outline-none ${
              isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#140029] border-white/20 text-white'
            }`}
          >
            <option value="all">All Payment Methods</option>
            <option value="upi">UPI (GPay / PhonePe)</option>
            <option value="qr_code">Dynamic QR Code</option>
            <option value="card">Debit / Credit Card</option>
            <option value="netbanking">Net Banking</option>
          </select>
        </div>

        <button
          onClick={onRefresh}
          className={`p-2.5 rounded-xl border transition-colors ${
            isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title="Refresh payments"
        >
          <RefreshCw className={`w-4 h-4 ${paymentsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Payments Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-gray-50/80 text-gray-600 border-gray-200' : 'bg-white/[0.03] text-gray-400 border-white/10'}`}>
              <tr>
                <th className="p-3.5 font-bold uppercase tracking-wider">Transaction ID</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Customer</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Operator</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Method</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Amount</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-right">Gateway Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-bold">{p.id}</td>
                    <td className="p-3.5 font-medium">{p.customerName}</td>
                    <td className="p-3.5 capitalize">{p.operator.replace('_', ' ')}</td>
                    <td className="p-3.5 uppercase text-[11px] font-semibold opacity-75">{p.paymentMethod}</td>
                    <td className="p-3.5 font-mono font-bold text-sm text-emerald-500">₹{p.amount}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold uppercase border border-emerald-500/30">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-[11px] opacity-75">{p.operatorRefId}</td>
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
