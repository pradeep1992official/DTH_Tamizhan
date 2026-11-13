import { AdminRefreshButton } from '../AdminRefreshButton';
import React, { useState } from 'react';
import { Search, Phone, RefreshCw, Eye } from '../../../lib/icons';
import { useSearchParams } from 'react-router-dom';
import { CustomerDetailsPage } from '../CustomerDetailsPage';
import { CustomerRecord, DthOperatorId, Language, isSameDthOperatorGroup } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';

interface CustomersTabProps {
  customers: CustomerRecord[];
  custLoading: boolean;
  customersError: string | null;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  custLoading,
  customersError,
  onRefresh,
  currentTheme,
  currentLang,
  getAuthHeaders,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [custSearch, setCustSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const customerId = searchParams.get('customer');
  const [custOpFilter, setCustOpFilter] = useState<string>('all');
  type CustomerSortKey = 'customerName' | 'operator' | 'smartCardNumber' | 'activePackName';
  const [sort, setSort] = useState<{ key: CustomerSortKey; direction: 'asc' | 'desc' }>({ key: 'customerName', direction: 'asc' });
  const operatorNames: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV & D2H', d2h: 'Dish TV & D2H' };
  const heading = (key: CustomerSortKey, label: string, hidden = '') => <th scope="col" className={`p-3.5 font-medium ${hidden}`} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}><button type="button" className="catalog-sort-heading" onClick={() => setSort((prev) => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))}>{label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '\u2191' : '\u2193') : '\u2195'}</span></button></th>;
  const filteredCustomers = customers.filter((c) => {
    const matchSearch =
      c.customerName.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.smartCardNumber.includes(custSearch) ||
      c.registeredMobile.includes(custSearch);
    const matchOp = custOpFilter === 'all' || isSameDthOperatorGroup(c.operator, custOpFilter as DthOperatorId);
    return matchSearch && matchOp;
  }).sort((a, b) => {
    const key = sort.key;
    const value = (c: CustomerRecord) => key === 'operator' ? operatorNames[c.operator] || c.operator : String(c[key] ?? '');
    const comparison = value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? comparison : -comparison;
  });

  if (customerId) return <CustomerDetailsPage customerId={customerId} getAuthHeaders={getAuthHeaders} currentLang={currentLang} onBack={() => { const next = new URLSearchParams(searchParams); next.delete('customer'); setSearchParams(next); }} />;

  return (
    <div className="admin-tab customers-tab space-y-4">
      {/* Top Filter Bar */}
      <div className="admin-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:flex-1 sm:max-w-md min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name, subscriber ID, or phone" aria-label="Search customers"
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors ${
                isLight ? 'bg-paper-2 border-rule text-ink focus:bg-paper' : 'bg-paper border-rule text-accent-ink'
              }`}
            />
          </div>

          <select
            value={custOpFilter}
            onChange={(e) => setCustOpFilter(e.target.value)}
            className={`py-2.5 px-3 rounded-xl border text-sm font-medium focus:outline-none cursor-pointer ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <option value="all">All Operators</option>
            <option value="sun_direct">Sun Direct</option>
            <option value="tata_play">Tata Play</option>
            <option value="airtel_dth">Airtel DTH</option>
            <option value="dish_tv">Dish TV &amp; D2H</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <AdminRefreshButton onRefresh={onRefresh} loading={custLoading} label={t.refresh} />


        </div>
      </div>

      {/* Customers Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-ink border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                {heading('customerName', 'Customer')}
                {heading('operator', 'Operator', 'hidden md:table-cell')}
                {heading('smartCardNumber', 'Subscriber ID')}
                {heading('activePackName', 'Latest recharge pack', 'hidden md:table-cell')}
                <th scope="col" className="customer-actions-heading p-3.5 font-medium">Actions</th>
                
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {custLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted ">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-warning" />
                      <span>Loading subscribers from database…</span>
                    </div>
                  </td>
                </tr>
              ) : customersError ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-error ">{customersError}</p>
                    <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      Retry loading customers
                    </button>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink ">
                    {customers.length === 0 ? 'Customers will appear after their first captured recharge payment' : 'No matching customers'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-paper-2 transition-colors">
                    <td data-label="Customer" className="p-3.5 font-medium">
                      <div className="font-bold text-sm text-ink flex flex-wrap items-center gap-2">{cust.customerName}{(cust.boxCount || 1) > 1 && <span className="customer-box-count">{cust.boxCount} {currentLang === 'ta' ? 'பாக்ஸ்கள்' : 'boxes'}</span>}</div>
                      <div className="text-sm text-muted  flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{cust.registeredMobile || 'Phone not provided'}</span>
                      </div>
                      <div className="md:hidden text-sm text-ink  mt-1">
                        {cust.operatorName} · {cust.smartCardNumber}
                      </div>
                      <div className="md:hidden text-xs text-muted mt-1">{cust.activePackName}{cust.latestRechargeStatus !== 'completed' && ` · ${cust.latestRechargeStatus === 'failed' ? 'Failed' : 'Pending'}`}</div>
                    </td>
                    <td data-label="Operator" className="hidden md:table-cell p-3.5"><span className="compact-plan-pill compact-plan-operator" data-operator={cust.operator}>{operatorNames[cust.operator] || cust.operatorName}</span></td>
                    <td data-label="Subscriber ID" className="p-3.5 font-mono font-bold text-xs">{cust.smartCardNumber}</td>
                    <td data-label="Latest recharge pack" className="hidden md:table-cell p-3.5">
                      <div className="font-medium text-ink ">{cust.activePackName}</div>
                      {cust.latestRechargeStatus !== 'completed' && <span className="text-xs text-muted">{cust.latestRechargeStatus === 'failed' ? 'Recharge failed' : 'Paid · Recharge pending'}</span>}

                    </td>
                    <td data-label="Actions" className="customer-actions-cell p-3.5"><button type="button" className="history-view-action inline-flex items-center gap-2 rounded-lg px-3 py-2 border border-rule" aria-label={`View details for ${cust.customerName}, ${cust.smartCardNumber}`} onClick={() => { const next = new URLSearchParams(searchParams); next.set('customer', cust.id); setSearchParams(next); }}><Eye size={16} />View</button></td>
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
