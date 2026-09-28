import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Radio, 
  RefreshCw, 
  Search, 
  Filter, 
  Send, 
  ShieldCheck,
  UserCheck,
  FileText
} from 'lucide-react';
import { RechargeOrder, Language, UserProfile } from '../types';
import { translations } from '../lib/translations';
import { OperatorTheme } from '../lib/theme';

interface WorkerDashboardProps {
  currentLang: Language;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onTriggerRefresh: (operator: any, card: string) => void;
  currentTheme: OperatorTheme;
  integrated?: boolean;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  currentLang,
  user,
  onOpenAuth,
  onTriggerRefresh,
  currentTheme,
  integrated = false,
}) => {
  const isLight = currentTheme.isLightMode;
  const t = translations[currentLang];

  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RechargeOrder | null>(null);
  const [operatorRefInput, setOperatorRefInput] = useState('');
  const [dealerNotesInput, setDealerNotesInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders?isWorker=true');
      const data = await response.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load dealer orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/worker/update-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rechargeStatus: newStatus,
          operatorRefId: operatorRefInput || undefined,
          workerNotes: dealerNotesInput || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchOrders();
        setSelectedOrder(null);
        setOperatorRefInput('');
        setDealerNotesInput('');
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filterStatus === 'all' || o.rechargeStatus === filterStatus;
    const matchesSearch = 
      o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.smartCardNumber.includes(searchQuery) ||
      o.operatorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className={integrated ? "p-5 sm:p-7 space-y-6 text-left animate-in fade-in duration-300" : "space-y-6 text-left animate-in fade-in duration-300"}>
      {/* Standalone RBAC Header Badge (Only shown when not integrated) */}
      {!integrated && (
        <div 
          className={`border rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="p-1.5 rounded-lg border"
                style={{
                  backgroundColor: `${currentTheme.primaryColor}15`,
                  color: currentTheme.primaryColor,
                  borderColor: `${currentTheme.primaryColor}30`,
                }}
              >
                <Briefcase className="w-5 h-5" />
              </span>
              <h2 className={`text-xl font-serif-royal font-bold ${currentTheme.headingText}`}>
                {t.workerQueueTitle}
              </h2>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase"
                style={{
                  backgroundColor: `${currentTheme.primaryColor}20`,
                  color: currentTheme.primaryColor,
                  borderColor: `${currentTheme.primaryColor}30`,
                }}
              >
                Dealer Queue
              </span>
            </div>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${currentTheme.subText}`}>
              {t.workerQueueDesc}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                isLight 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      )}

      {/* Standalone Filter and Search Bar (Only shown when not integrated) */}
      {!integrated && (
        <div 
          className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
            isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div 
            className={`flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-lg border ${
              isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/40 border-white/15'
            }`}
          >
            <Search className={`w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Smart Card, Operator..."
              className={`w-full bg-transparent focus:outline-none font-mono ${
                isLight ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`font-semibold mr-1 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Status:</span>
            {['all', 'pending', 'processing', 'completed'].map((status) => {
              const isActive = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] transition-all border ${
                    isActive
                      ? 'text-white border-transparent shadow'
                      : isLight
                      ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: isActive ? currentTheme.primaryColor : undefined,
                  }}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified Orders Table Container */}
      <div 
        className={`border rounded-2xl overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
        }`}
      >
        {/* Integrated Toolbar when in Console Mode */}
        {integrated && (
          <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
            <div 
              className={`flex items-center gap-2 flex-1 max-w-sm px-3 py-1.5 rounded-lg border ${
                isLight ? 'bg-white border-gray-300' : 'bg-black/40 border-white/15'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${isLight ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order ID, Smart Card, Operator..."
                className={`w-full bg-transparent focus:outline-none font-mono text-xs ${
                  isLight ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-500'
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {['all', 'pending', 'processing', 'completed'].map((status) => {
                  const isActive = filterStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] transition-all border ${
                        isActive
                          ? 'text-white border-transparent shadow-xs'
                          : isLight
                          ? 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}
                      style={{
                        backgroundColor: isActive ? currentTheme.primaryColor : undefined,
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={fetchOrders}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  isLight 
                    ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' 
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Refresh Queue"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead 
              className={`uppercase tracking-wider text-[10px] font-bold border-b ${
                isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-black/50 text-gray-300 border-white/10'
              }`}
            >
              <tr>
                <th className="px-5 py-3">Order ID / Date</th>
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3">Smart Card No</th>
                <th className="px-5 py-3">Plan / Amount</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => (
                  <tr 
                    key={ord.orderId} 
                    className={`transition-colors ${
                      isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <span className={`font-mono font-bold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {ord.orderId}
                      </span>
                      <span className={`text-[10px] ${currentTheme.subText}`}>
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {ord.operatorName}
                      </span>
                      <span className={`text-[10px] font-mono ${currentTheme.subText}`}>
                        Ref: {ord.operatorRefId}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
                      {ord.smartCardNumber}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-medium block ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                        {ord.packName}
                      </span>
                      <span className={`font-mono font-bold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        ₹{ord.amount}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                        {ord.paymentStatus} ({ord.paymentMethod})
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          ord.rechargeStatus === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : ord.rechargeStatus === 'processing'
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {ord.rechargeStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-colors shadow-sm text-white"
                        style={{ backgroundColor: currentTheme.primaryColor, borderColor: 'transparent' }}
                      >
                        Process
                      </button>
                      <button
                        onClick={() => onTriggerRefresh(ord.operator, ord.smartCardNumber)}
                        className={`p-1 rounded-lg border transition-colors ${
                          isLight 
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' 
                            : 'bg-white/10 hover:bg-white/20 text-gray-300 border-white/20'
                        }`}
                        title="Send Signal Refresh"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={`px-5 py-8 text-center ${currentTheme.subText}`}>
                    No orders match your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dealer Processing Action Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={`border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative space-y-4 ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#180530] border-white/20 text-white'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <div>
                <h3 className={`font-serif-royal font-bold text-base ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Process Order: {selectedOrder.orderId}
                </h3>
                <p className={`text-xs ${currentTheme.subText}`}>
                  {selectedOrder.operatorName} • {selectedOrder.smartCardNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className={`p-1 rounded-lg ${
                  isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-gray-400'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  Operator Reference Number
                </label>
                <input
                  type="text"
                  value={operatorRefInput || selectedOrder.operatorRefId}
                  onChange={(e) => setOperatorRefInput(e.target.value)}
                  placeholder="e.g. SUN-REF-99214"
                  className={`w-full rounded-lg px-3 py-2 font-mono border focus:outline-none ${
                    isLight 
                      ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400' 
                      : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  Dealer Confirmation Notes
                </label>
                <textarea
                  value={dealerNotesInput || selectedOrder.workerNotes || ''}
                  onChange={(e) => setDealerNotesInput(e.target.value)}
                  placeholder="e.g. Manually verified on dealer portal"
                  className={`w-full rounded-lg px-3 py-2 resize-none h-16 border focus:outline-none ${
                    isLight 
                      ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400' 
                      : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                  }`}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.orderId, 'completed')}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Fulfilled</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedOrder.orderId, 'processing')}
                  disabled={isUpdating}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <Clock className="w-4 h-4" />
                  <span>Mark Processing</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
