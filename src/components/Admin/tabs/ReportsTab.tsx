import React from 'react';
import { 
  BarChart3, 
  History, 
  TrendingUp, 
  Users, 
  Radio, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { PlanAuditLog, CustomerRecord, RechargeOrder, Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface ReportsTabProps {
  auditLogs: PlanAuditLog[];
  customers: CustomerRecord[];
  orders: RechargeOrder[];
  reportsLoading: boolean;
  onRefresh: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  auditLogs,
  customers,
  orders,
  reportsLoading,
  onRefresh,
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const settledOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const totalVolume = settledOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const completedCount = orders.filter((o) => o.rechargeStatus === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{t.totalRevenue}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-mono font-bold mt-1 text-emerald-600 dark:text-emerald-400">₹{totalVolume.toLocaleString()}</div>
          <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Settled payments</div>
        </div>

        <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{t.totalSubscribers}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{customers.length}</div>
          <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Customer accounts</div>
        </div>

        <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{t.processedRecharges}</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{completedCount}</div>
          <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Completed orders</div>
        </div>

        <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{t.auditLogEvents}</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{auditLogs.length}</div>
          <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">Catalog changes</div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="flex items-center justify-between border-b pb-4 border-gray-500/20">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base">{t.planCatalogAuditTrail}</h3>
          </div>
          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl border transition-colors ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">{t.noAuditEvents}</div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                  isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-xs ${
                      log.action === 'create'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : log.action === 'delete'
                        ? 'bg-rose-500/20 text-rose-500'
                        : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-bold">{log.plan_name}</span>
                    <span className="text-gray-500 dark:text-gray-400 capitalize">({log.operator.replace('_', ' ')})</span>
                  </div>
                  {log.details && <p className="text-gray-600 dark:text-gray-300 text-xs">{log.details}</p>}
                </div>

                <div className="text-right text-xs text-gray-500 dark:text-gray-400 font-mono">
                  <div>{new Date(log.updated_at).toLocaleString()}</div>
                  <div className="text-xs">by {log.updated_by}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
