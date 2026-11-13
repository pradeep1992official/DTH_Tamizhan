import { AdminRefreshButton } from '../AdminRefreshButton';
import { BrokenLinksPanel } from '../BrokenLinksPanel';
import React, { useState } from 'react';
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
  summary?: { totalCustomers: number; completedOrders: number; settledVolume: number } | null;
  getAuthHeaders?: () => Promise<Record<string, string>>;
  auditLogs: PlanAuditLog[];
  customers: CustomerRecord[];
  orders: RechargeOrder[];
  reportsLoading: boolean;
  onRefresh: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  summary,
  auditLogs,
  customers,
  orders,
  reportsLoading,
  onRefresh,
  currentTheme,
  currentLang,
  getAuthHeaders,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const settledOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const totalVolume = summary?.settledVolume ?? settledOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const completedCount = summary?.completedOrders ?? orders.filter((o) => o.rechargeStatus === 'completed').length;

  const [search, setSearch] = useState('');
  const [operator, setOperator] = useState('all');
  const [action, setAction] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const operators: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV & D2H', d2h: 'Dish TV & D2H' };
  const actionNames = { create: 'Created', update: 'Updated', delete: 'Deleted' };
  const formatDate = (value: string, withTime = false) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Unavailable';
    const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    return withTime ? `${day}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST` : day;
  };
  const orderDates = orders.map((order) => order.createdAt).filter((date) => Number.isFinite(Date.parse(date))).sort((a, b) => Date.parse(a) - Date.parse(b));
  const firstDate = orderDates.length ? formatDate(orderDates[0]) : '';
  const lastDate = orderDates.length ? formatDate(orderDates[orderDates.length - 1]) : '';
  const period = orderDates.length ? (firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`) : 'No recharge records loaded';
  const filteredLogs = auditLogs.filter((log) =>
    (operator === 'all' || log.operator === operator || operator === 'dish_tv' && log.operator === 'd2h') &&
    (action === 'all' || log.action === action) &&
    `${log.plan_name} ${operators[log.operator] || log.operator} ${log.updated_by} ${log.details || ''}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const auditDetails = (log: PlanAuditLog) => {
    const details = log.details || '';
    const match = details.match(/Saved\s+(HD|SD)\s+pack\s+for\s+(\d+)M\s+\([^\d]*(\d[\d,]*(?:\.\d+)?)\)/i);
    if (match) return `${match[1]} \u00b7 ${match[2]} ${Number(match[2]) === 1 ? 'month' : 'months'} \u00b7 Rs. ${Number(match[3].replace(/,/g, '')).toLocaleString('en-IN')}`;
    return details.replace(/\s+in Firestore\.?/gi, '');
  };

  return (
    <div className="admin-tab reports-tab space-y-4">
      {getAuthHeaders && <BrokenLinksPanel getAuthHeaders={getAuthHeaders} currentLang={currentLang} />}
      <div className="text-xs text-muted space-y-1">
        <p>Recharge records: {period} ({orders.length} loaded)</p>
        <p>Paid recharge total includes paid orders in these records. Payments shows paid payment records and applies its own search and method filters.</p>
      </div>
      {/* Overview Analytics Cards */}
      <div className="admin-summary admin-summary-four">
        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Paid recharge total</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="text-xl font-bold mt-1 text-success">Rs. {totalVolume.toLocaleString('en-IN')}</div>
          <div className="text-sm text-ink  mt-1">Paid orders only</div>
        </div>

        <div className="admin-summary-item">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.totalSubscribers}</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xl font-mono font-bold mt-1">{summary?.totalCustomers ?? customers.length}</div>
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
          <AdminRefreshButton onRefresh={onRefresh} loading={reportsLoading} label={t.refresh} />
        </div>

        <div className="report-audit-filters flex flex-wrap gap-3">
          <input type="search" aria-label="Search audit entries" placeholder="Search plan, operator or editor" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(10); }} className="flex-1 min-w-0 rounded-xl border border-rule bg-paper px-3 py-2 text-sm" />
          <select aria-label="Filter audit operator" value={operator} onChange={(e) => { setOperator(e.target.value); setVisibleCount(10); }} className="rounded-xl border border-rule bg-paper px-3 py-2 text-sm">
            <option value="all">All operators</option>
            {Object.entries(operators).filter(([id]) => id !== 'd2h').map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select aria-label="Filter audit action" value={action} onChange={(e) => { setAction(e.target.value); setVisibleCount(10); }} className="rounded-xl border border-rule bg-paper px-3 py-2 text-sm">
            <option value="all">All actions</option>
            {Object.entries(actionNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted" aria-live="polite">{Math.min(visibleCount, filteredLogs.length)} of {filteredLogs.length} matching loaded events</p>
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">{t.noAuditEvents}</div>
          ) : (
            filteredLogs.slice(0, visibleCount).map((log) => (
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
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {actionNames[log.action]}
                    </span>
                    <span className="font-bold">{log.plan_name}</span>
                    <span className="compact-plan-pill compact-plan-operator" data-operator={log.operator}>{operators[log.operator] || log.operator}</span>
                  </div>
                  {log.details && <p className="text-muted  text-sm">{auditDetails(log)}</p>}
                </div>

                <div className="text-right text-sm text-muted">
                  <div>{formatDate(log.updated_at, true)}</div>
                  <div className="text-sm">by {log.updated_by}</div>
                </div>
              </div>
            ))
          )}
        </div>
        {visibleCount < filteredLogs.length && <button type="button" className="rounded-xl border border-rule px-4 py-2 text-sm font-medium" onClick={() => setVisibleCount((count) => count + 10)}>Load more</button>}
      </div>
    </div>
  );
};
