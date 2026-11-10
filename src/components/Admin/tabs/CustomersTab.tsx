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
} from '../../../lib/icons';
import { CustomerRecord, DthOperatorId, Language, isSameDthOperatorGroup, resolveDishFamilyOperatorId } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { db, isFirebaseConfigured, sanitizePayload } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { translations } from '../../../lib/translations';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';

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

  // Accessible Modal Focus Trapping & Escape-to-close
  const { modalRef: addModalRef } = useAccessibleModal({
    isOpen: isAddModalOpen,
    onClose: () => setIsAddModalOpen(false),
  });

  const { modalRef: deleteModalRef } = useAccessibleModal({
    isOpen: Boolean(customerToDelete),
    onClose: () => setCustomerToDelete(null),
  });

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
    const matchOp = custOpFilter === 'all' || isSameDthOperatorGroup(c.operator, custOpFilter as DthOperatorId);
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
      operator: formData.operator === 'dish_tv' || formData.operator === 'd2h'
        ? resolveDishFamilyOperatorId(formData.smartCardNumber)
        : formData.operator,
      operatorName: opNames[formData.operator === 'dish_tv' || formData.operator === 'd2h'
        ? resolveDishFamilyOperatorId(formData.smartCardNumber)
        : formData.operator],
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
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'customers', newId), sanitizePayload(newCust));
      } else {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/customers/create', {
          method: 'POST',
          headers,
          body: JSON.stringify(newCust),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Unable to create customer (${response.status})`);
        }
      }

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
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'customers', id));
      } else {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/customers/delete', {
          method: 'POST',
          headers,
          body: JSON.stringify({ customerId: id }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Unable to delete customer (${response.status})`);
        }
      }

      showToast('Customer record removed.');
      setCustomerToDelete(null);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to delete customer: ${err.message || err}`);
    }
  };

  return (
    <div className="admin-tab space-y-6">
      {/* Top Filter Bar */}
      <div className="admin-toolbar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:flex-1 sm:max-w-md min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name, smart card, or phone" aria-label="Search customers"
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
          <button
            type="button"
            onClick={onRefresh}
            className={`p-2.5 rounded-xl border transition-colors ${
              isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper-2 hover:bg-paper-2 text-accent-ink'
            }`}
            title="Refresh list"
            aria-label="Refresh customer list"
          >
            <RefreshCw className={`w-4 h-4 ${custLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-accent-ink font-bold text-sm shadow-none transition-colors flex items-center gap-1.5 hover:opacity-95"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
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
                <th className="p-3.5 font-medium">Customer</th>
                <th className="hidden md:table-cell p-3.5 font-medium">Operator & smart card</th>
                <th className="hidden md:table-cell p-3.5 font-medium">Active pack</th>
                <th className="p-3.5 font-medium">Balance & expiry</th>
                <th className="hidden lg:table-cell p-3.5 font-medium">Location</th>
                <th className="p-3.5 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {custLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted ">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-warning" />
                      <span>Loading subscribers from database…</span>
                    </div>
                  </td>
                </tr>
              ) : customersError ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-error ">{customersError}</p>
                    <button type="button" onClick={onRefresh} className="mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      Retry loading customers
                    </button>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink ">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-paper-2 transition-colors">
                    <td data-label="Customer" className="p-3.5 font-medium">
                      <div className="font-bold text-sm text-ink ">{cust.customerName}</div>
                      <div className="text-sm text-muted  flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{cust.registeredMobile}</span>
                      </div>
                      <div className="md:hidden text-sm text-ink  mt-1">
                        {cust.operatorName} · {cust.smartCardNumber}
                      </div>
                    </td>
                    <td data-label="Operator & smart card" className="hidden md:table-cell p-3.5">
                      <div className="font-medium text-ink ">{cust.operatorName}</div>
                      <div className="font-mono text-sm text-muted ">{cust.smartCardNumber}</div>
                    </td>
                    <td data-label="Active pack" className="hidden md:table-cell p-3.5">
                      <div className="font-medium text-ink ">{cust.activePackName}</div>
                      <span className={`text-sm px-2.5 py-0.5 rounded-md font-bold  mt-1 inline-block ${
                        cust.planQuality === 'HD'
                          ? `bg-warning/10 ${isLight ? 'text-warning' : 'text-warning'} border border-rule`
                          : `bg-accent-soft ${isLight ? 'text-accent' : 'text-accent'} border border-rule`
                      }`}>
                        {cust.planQuality || 'HD'}
                      </span>
                    </td>
                    <td data-label="Balance & expiry" className="p-3.5">
                      <div className="font-mono font-medium text-sm text-ink ">₹{cust.currentBalance.toFixed(2)}</div>
                      <div className="text-sm text-muted  flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expires: {cust.expiryDate}</span>
                      </div>
                    </td>
                    <td data-label="Location" className="hidden lg:table-cell p-3.5">
                      <div className="text-sm flex items-center gap-1 text-ink ">
                        <MapPin className="w-3.5 h-3.5 text-error" />
                        <span>{cust.registeredCity || 'Madurai, TN'}</span>
                      </div>
                    </td>
                    <td data-label={t.actions} className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 rounded-lg border text-error hover:bg-error/10 transition-colors"
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
          className="fixed inset-0 z-50 bg-ink/70  flex items-center justify-center p-4  "
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            ref={addModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subscriber-title"
            className={`border rounded-xl max-h-[calc(100dvh-2rem)] overflow-y-auto max-w-md w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-rule">
              <h3 id="add-subscriber-title" className="font-bold text-base">{t.registerNewSubscriber}</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label={t.close}
                className="p-1.5 rounded-lg hover:bg-paper-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-sm">
              <div>
                <label className="font-medium block mb-1 text-ink ">{t.customerFullName}</label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. S. Murugan"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium block mb-1 text-ink ">{t.registeredMobile}</label>
                <input
                  type="tel"
                  required
                  value={formData.registeredMobile}
                  onChange={(e) => setFormData({ ...formData, registeredMobile: e.target.value })}
                  placeholder="9842100000"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium block mb-1 text-ink ">{t.dthOperatorLabel}</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => {
                      const op = e.target.value as DthOperatorId;
                      const opNames: Record<DthOperatorId, string> = {
                        sun_direct: 'Sun Direct',
                        tata_play: 'Tata Play',
                        airtel_dth: 'Airtel Digital TV',
                        dish_tv: 'Dish TV & D2H',
                        d2h: 'Dish TV & D2H',
                      };
                      setFormData({ ...formData, operator: op, operatorName: opNames[op] });
                    }}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                  >
                    <option value="sun_direct">Sun Direct</option>
                    <option value="tata_play">Tata Play</option>
                    <option value="airtel_dth">Airtel DTH</option>
                    <option value="dish_tv">Dish TV &amp; D2H</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium block mb-1 text-ink ">{t.qualityLabel}</label>
                  <select
                    value={formData.planQuality}
                    onChange={(e) => setFormData({ ...formData, planQuality: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                  >
                    <option value="HD">HD</option>
                    <option value="SD">SD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1 text-ink ">{t.smartCardNumberField}</label>
                <input
                  type="text"
                  required
                  value={formData.smartCardNumber}
                  onChange={(e) => setFormData({ ...formData, smartCardNumber: e.target.value })}
                  placeholder="e.g. 41289456123"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-medium block mb-1 text-ink ">{t.activeBouquetPack}</label>
                <input
                  type="text"
                  required
                  value={formData.activePackName}
                  onChange={(e) => setFormData({ ...formData, activePackName: e.target.value })}
                  placeholder="e.g. Sun Direct Prime HD (6 Months Saver)"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium block mb-1 text-ink ">{t.initialBalance}</label>
                  <input
                    type="number"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-medium block mb-1 text-ink ">{t.validityExpires}</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-paper-3 hover:bg-paper-3"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-accent-ink shadow"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="fixed inset-0 z-50 bg-ink/70  flex items-center justify-center p-4  "
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomerToDelete(null);
          }}
        >
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-customer-title"
            className={`border rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <h3 id="delete-customer-title" className="font-bold text-base text-error">{t.delete}</h3>
            <p className="text-sm text-ink  leading-relaxed">
              {currentLang === 'ta'
                ? `நீங்கள் நிச்சயமாக ${customerToDelete.customerName} (${customerToDelete.smartCardNumber}) வாடிக்கையாளர் பதிவை நீக்க விரும்புகிறீர்களா?`
                : `Are you sure you want to delete ${customerToDelete.customerName} (${customerToDelete.smartCardNumber})?`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium bg-paper-3"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomer(customerToDelete.id)}
                className="px-3.5 py-2 rounded-xl text-sm font-bold bg-accent hover:bg-error/10 text-accent-ink shadow-none"
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
