import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  Tv, 
  Calendar, 
  Phone, 
  MapPin, 
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { CustomerRecord, DthOperatorId, Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { db, isFirebaseLive, sanitizePayload } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { translations } from '../../../lib/translations';

interface CustomersTabProps {
  customers: CustomerRecord[];
  custLoading: boolean;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  custLoading,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [custSearch, setCustSearch] = useState('');
  const [custOpFilter, setCustOpFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRecord | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    registeredMobile: '',
    smartCardNumber: '',
    operator: 'sun_direct' as DthOperatorId,
    operatorName: 'Sun Direct',
    activePackName: 'Sun Direct Prime HD (6M Saver)',
    currentBalance: '150',
    expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    registeredCity: 'Madurai, TN',
    registeredPincode: '625001',
    planQuality: 'HD' as 'HD' | 'SD',
  });

  const filteredCustomers = customers.filter((c) => {
    const matchSearch =
      c.customerName.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.smartCardNumber.includes(custSearch) ||
      c.registeredMobile.includes(custSearch);
    const matchOp = custOpFilter === 'all' || c.operator === custOpFilter;
    return matchSearch && matchOp;
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.smartCardNumber || !formData.registeredMobile) {
      showToast('Please fill all required customer fields');
      return;
    }

    const newId = `cust_${Date.now().toString().slice(-6)}`;
    const opNames: Record<DthOperatorId, string> = {
      sun_direct: 'Sun Direct',
      tata_play: 'Tata Play',
      airtel_dth: 'Airtel Digital TV',
      dish_tv: 'Dish TV',
      d2h: 'D2H',
    };

    const newCust: CustomerRecord = {
      id: newId,
      customerName: formData.customerName,
      registeredMobile: formData.registeredMobile,
      smartCardNumber: formData.smartCardNumber,
      operator: formData.operator,
      operatorName: opNames[formData.operator],
      activePackName: formData.activePackName,
      currentBalance: Number(formData.currentBalance) || 0,
      expiryDate: formData.expiryDate,
      status: 'active',
      accountStatus: 'Active',
      registeredCity: formData.registeredCity,
      registeredPincode: formData.registeredPincode,
      planQuality: formData.planQuality,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isFirebaseLive && db) {
        await setDoc(doc(db, 'customers', newId), sanitizePayload(newCust));
      }

      const headers = await getAuthHeaders();
      await fetch('/api/admin/customers', {
        method: 'POST',
        headers,
        body: JSON.stringify(newCust),
      });

      showToast(`Customer ${newCust.customerName} registered successfully.`);
      setIsAddModalOpen(false);
      setFormData({
        customerName: '',
        registeredMobile: '',
        smartCardNumber: '',
        operator: 'sun_direct',
        operatorName: 'Sun Direct',
        activePackName: 'Sun Direct Prime HD (6M Saver)',
        currentBalance: '150',
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
        registeredCity: 'Madurai, TN',
        registeredPincode: '625001',
        planQuality: 'HD',
      });
      onRefresh();
    } catch (err: any) {
      showToast(`Error creating customer: ${err.message || err}`);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      if (isFirebaseLive && db) {
        await deleteDoc(doc(db, 'customers', id));
      }

      const headers = await getAuthHeaders();
      await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE',
        headers,
      });

      showToast('Customer record removed.');
      setCustomerToDelete(null);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to delete customer: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, smart card, or phone..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                isLight ? 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white' : 'bg-[#140029] border-white/20 text-white'
              }`}
            />
          </div>

          <select
            value={custOpFilter}
            onChange={(e) => setCustOpFilter(e.target.value)}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold focus:outline-none cursor-pointer ${
              isLight ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-[#140029] border-white/20 text-white'
            }`}
          >
            <option value="all">All Operators</option>
            <option value="sun_direct">Sun Direct</option>
            <option value="tata_play">Tata Play</option>
            <option value="airtel_dth">Airtel DTH</option>
            <option value="dish_tv">Dish TV</option>
            <option value="d2h">D2H</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className={`p-2.5 rounded-xl border transition-colors ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Refresh list"
            aria-label="Refresh customer list"
          >
            <RefreshCw className={`w-4 h-4 ${custLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:opacity-95"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-gray-50/80 text-gray-700 border-gray-200' : 'bg-white/[0.03] text-gray-300 border-white/10'}`}>
              <tr>
                <th className="p-3.5 font-bold uppercase tracking-wider">Customer Name</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Operator & Smart Card</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Active Pack</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Balance & Expiry</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Location</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {custLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Loading subscribers from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-medium">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{cust.customerName}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{cust.registeredMobile}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900 dark:text-white">{cust.operatorName}</div>
                      <div className="font-mono text-xs text-gray-600 dark:text-gray-400">{cust.smartCardNumber}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{cust.activePackName}</div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase mt-1 inline-block ${
                        cust.planQuality === 'HD' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}>
                        {cust.planQuality || 'HD'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">₹{cust.currentBalance.toFixed(2)}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expires: {cust.expiryDate}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        <span>{cust.registeredCity || 'Madurai, TN'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                        aria-label={`Delete ${cust.customerName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subscriber-title"
            className={`border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#180530] border-white/20 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-500/20">
              <h3 id="add-subscriber-title" className="font-bold text-base">Register New Subscriber</h3>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                aria-label={t.close}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. S. Murugan"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Registered Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={formData.registeredMobile}
                  onChange={(e) => setFormData({ ...formData, registeredMobile: e.target.value })}
                  placeholder="9842100000"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">DTH Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => {
                      const op = e.target.value as DthOperatorId;
                      const opNames: Record<DthOperatorId, string> = {
                        sun_direct: 'Sun Direct',
                        tata_play: 'Tata Play',
                        airtel_dth: 'Airtel Digital TV',
                        dish_tv: 'Dish TV',
                        d2h: 'D2H',
                      };
                      setFormData({ ...formData, operator: op, operatorName: opNames[op] });
                    }}
                    className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                  >
                    <option value="sun_direct">Sun Direct</option>
                    <option value="tata_play">Tata Play</option>
                    <option value="airtel_dth">Airtel DTH</option>
                    <option value="dish_tv">Dish TV</option>
                    <option value="d2h">D2H</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Quality</label>
                  <select
                    value={formData.planQuality}
                    onChange={(e) => setFormData({ ...formData, planQuality: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                  >
                    <option value="HD">HD</option>
                    <option value="SD">SD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Smart Card / CDSN / Subscriber ID</label>
                <input
                  type="text"
                  required
                  value={formData.smartCardNumber}
                  onChange={(e) => setFormData({ ...formData, smartCardNumber: e.target.value })}
                  placeholder="e.g. 41289456123"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Active Bouquet / Pack</label>
                <input
                  type="text"
                  required
                  value={formData.activePackName}
                  onChange={(e) => setFormData({ ...formData, activePackName: e.target.value })}
                  placeholder="e.g. Sun Direct Prime HD (6 Months Saver)"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Initial Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-500/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-gray-500/20 hover:bg-gray-500/30"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white shadow"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  Create Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomerToDelete(null);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className={`border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-white border-rose-200 text-gray-900' : 'bg-[#180530] border-rose-500/30 text-white'
            }`}
          >
            <h3 id="delete-customer-title" className="font-bold text-base text-rose-500">Delete Subscriber Record?</h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>{customerToDelete.customerName}</strong> ({customerToDelete.smartCardNumber})?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-500/20"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomer(customerToDelete.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
