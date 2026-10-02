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
  const isLight = currentTheme.isLightMode;
  const totalVolume = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const completedCount = orders.filter((o) => o.rechargeStatus === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase">Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-bold mt-2 text-emerald-500">₹{totalVolume.toLocaleString()}</div>
          <div className="text-[11px] opacity-60 mt-1">Across all DTH operators</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase">Total Subscribers</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold mt-2">{customers.length}</div>
          <div className="text-[11px] opacity-60 mt-1">Active customer accounts</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase">Processed Recharges</span>
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold mt-2">{completedCount}</div>
          <div className="text-[11px] opacity-60 mt-1">Total completed orders</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs opacity-60 font-semibold uppercase">Audit Log Events</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold mt-2">{auditLogs.length}</div>
          <div className="text-[11px] opacity-60 mt-1">Recorded catalog changes</div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="flex items-center justify-between border-b pb-4 border-gray-500/20">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-base">Plan Catalog Audit Trail</h3>
          </div>
          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl border transition-colors ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No audit events recorded yet.</div>
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
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                      log.action === 'create'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : log.action === 'delete'
                        ? 'bg-rose-500/20 text-rose-500'
                        : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-bold">{log.plan_name}</span>
                    <span className="opacity-60 capitalize">({log.operator.replace('_', ' ')})</span>
                  </div>
                  {log.details && <p className="opacity-75 text-[11px]">{log.details}</p>}
                </div>

                <div className="text-right text-[11px] opacity-60 font-mono">
                  <div>{new Date(log.updated_at).toLocaleString()}</div>
                  <div className="text-[10px]">by {log.updated_by}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
