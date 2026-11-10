import React from 'react';
import {
  BarChart3,
  History,
  TrendingUp,
  Users,
  Radio,
  ShieldCheck,
  RefreshCw
} from '../../../lib/icons';
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
    <div className="admin-tab space-y-6">
      {/* Overview Analytics Cards */}
      <div className="admin-summary admin-summary-four">
        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.totalRevenue}</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="text-xl font-mono font-bold mt-1 text-success ">₹{totalVolume.toLocaleString()}</div>
          <div className="text-sm text-ink  mt-1">Settled payments</div>
        </div>

        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.totalSubscribers}</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{customers.length}</div>
          <div className="text-sm text-ink  mt-1">Customer accounts</div>
        </div>

        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.processedRecharges}</span>
            <BarChart3 className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{completedCount}</div>
          <div className="text-sm text-ink  mt-1">Completed orders</div>
        </div>

        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.auditLogEvents}</span>
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{auditLogs.length}</div>
          <div className="text-sm text-ink  mt-1">Catalog changes</div>
        </div>
      </div>

      {/* Audit Log Trail */}
      <div className="admin-ledger space-y-4">
        <div className="flex items-center justify-between border-b pb-4 border-rule">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-base">{t.planCatalogAuditTrail}</h3>
          </div>
          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl border transition-colors ${
              isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper-2 hover:bg-paper-2 text-accent-ink'
            }`}
            title={t.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${reportsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">{t.noAuditEvents}</div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="admin-audit-event"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold  text-sm ${
                      log.action === 'create'
                        ? 'bg-success/10 text-success'
                        : log.action === 'delete'
                        ? 'bg-error/10 text-error'
                        : 'bg-accent-soft text-accent'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-bold">{log.plan_name}</span>
                    <span className="text-muted  capitalize">({log.operator.replace('_', ' ')})</span>
                  </div>
                  {log.details && <p className="text-muted  text-sm">{log.details}</p>}
                </div>

                <div className="text-right text-sm text-muted">
                  <div>{new Date(log.updated_at).toLocaleString()}</div>
                  <div className="text-sm">by {log.updated_by}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
