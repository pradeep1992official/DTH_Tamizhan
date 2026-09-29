import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Filter, 
  Clock, 
  UserCheck, 
  Tv, 
  Sparkles, 
  Layers, 
  Calendar, 
  Tag, 
  AlertCircle,
  RefreshCw,
  Crown,
  FileSpreadsheet,
  Download,
  Upload
} from 'lucide-react';
import { PlanCatalogItem, PlanAuditLog, UserProfile, DthOperatorId, Language } from '../types';
import { PlanCatalogService } from '../lib/planCatalogService';
import { OperatorTheme } from '../lib/theme';
import { ExcelPlanImportExportModal } from './ExcelPlanImportExportModal';

interface AdminPlansViewProps {
  user: UserProfile | null;
  onGrantPlanAdmin?: () => void;
  onUpdateUserRole?: (updated: UserProfile) => void;
  currentLang: Language;
  onOpenAuth?: () => void;
  onBackToCustomerFlow?: () => void;
  currentTheme: OperatorTheme;
  integrated?: boolean;
  viewMode?: 'plans' | 'audit';
}

const OPERATOR_NAMES: Record<DthOperatorId, string> = {
  sun_direct: 'Sun Direct',
  tata_play: 'Tata Play',
  airtel_dth: 'Airtel Digital TV',
  dish_tv: 'Dish TV',
  d2h: 'D2H',
};

const SUGGESTED_CHANNELS = [
  'Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 
  'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports 1 HD',
  'Discovery HD Tamil', 'National Geographic HD', 'Chutti TV', 'Sun News', 
  'Polimer News', 'Thanthi TV', 'Kalaignar TV', 'Vijay Super HD', 'Raj TV'
];

export const AdminPlansView: React.FC<AdminPlansViewProps> = ({
  user,
  onGrantPlanAdmin,
  onUpdateUserRole,
  currentLang,
  onOpenAuth,
  onBackToCustomerFlow,
  currentTheme,
  integrated = false,
  viewMode = 'plans',
}) => {
  const isLight = currentTheme.isLightMode;
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOp, setFilterOp] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanCatalogItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'import' | 'export'>('import');

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    operator: DthOperatorId;
    pack_type: 'HD' | 'SD';
    duration_months: 1 | 6 | 12;
    plan_name: string;
    amount: number | string;
    is_recommended: boolean;
    channel_list: string[];
  }>({
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: '',
    amount: '',
    is_recommended: true,
    channel_list: [],
  });

  const [channelInput, setChannelInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const isPlanAdmin = user?.is_plan_admin === true || user?.role === 'admin' || user?.email === 'professorpradeeps@gmail.com';

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, logs] = await Promise.all([
        PlanCatalogService.getAllPlans(),
        PlanCatalogService.getRecentAuditLogs(),
      ]);
      setPlans(allPlans);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load plan catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormData({
      operator: 'sun_direct',
      pack_type: 'HD',
      duration_months: 6,
      plan_name: '',
      amount: '',
      is_recommended: true,
      channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Star Sports 1 Tamil HD'],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanCatalogItem) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      operator: plan.operator,
      pack_type: plan.pack_type,
      duration_months: plan.duration_months,
      plan_name: plan.plan_name,
      amount: plan.amount,
      is_recommended: plan.is_recommended,
      channel_list: [...plan.channel_list],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddChannel = (channelToAdd?: string) => {
    const val = (channelToAdd || channelInput).trim();
    if (!val) return;
    if (!formData.channel_list.includes(val)) {
      setFormData((prev) => ({
        ...prev,
        channel_list: [...prev.channel_list, val],
      }));
    }
    setChannelInput('');
  };

  const handleRemoveChannel = (channelToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      channel_list: prev.channel_list.filter((c) => c !== channelToRemove),
    }));
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.plan_name.trim()) {
      setFormError('Plan Name is required.');
      return;
    }

    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number greater than ₹0.');
      return;
    }

    const adminUid = user?.uid || 'admin_authorized';
    const planId = formData.id || `${formData.operator}_${formData.pack_type.toLowerCase()}_${formData.duration_months}m_${Date.now().toString().slice(-4)}`;

    try {
      await PlanCatalogService.savePlan(
        {
          id: planId,
          operator: formData.operator,
          pack_type: formData.pack_type,
          duration_months: formData.duration_months,
          plan_name: formData.plan_name.trim(),
          amount: numAmount,
          is_recommended: formData.is_recommended,
          channel_list: formData.channel_list,
          updated_by: adminUid,
        },
        adminUid
      );

      setSaveSuccess(`Plan "${formData.plan_name}" saved successfully.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving plan to catalog.');
    }
  };

  const handleDelete = async (planId: string) => {
    const adminUid = user?.uid || 'admin_authorized';
    try {
      await PlanCatalogService.deletePlan(planId, adminUid);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  // If not plan admin, show access notice
  if (!isPlanAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div 
          className={`border rounded-3xl p-8 shadow-2xl text-center space-y-6 ${
            isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
          }`}
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border"
            style={{ 
              backgroundColor: `${currentTheme.primaryColor}18`, 
              borderColor: `${currentTheme.primaryColor}40`,
              color: currentTheme.primaryColor 
            }}
          >
            <ShieldAlert className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <span 
              className="text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
              style={{
                backgroundColor: `${currentTheme.primaryColor}15`,
                borderColor: `${currentTheme.primaryColor}30`,
                color: currentTheme.primaryColor
              }}
            >
              Access Control: is_plan_admin Required
            </span>
            <h1 className={`text-2xl sm:text-3xl font-serif-royal font-bold ${currentTheme.headingText}`}>
              Plan Pricing Administration Restricted
            </h1>
            <p className={`text-sm max-w-xl mx-auto leading-relaxed ${currentTheme.subText}`}>
              In accordance with Security Directives and access boundaries, the <span className="font-mono font-bold">/admin/plans</span> catalog management module is strictly isolated from standard customers and fulfillment workers (<span className="font-mono">is_worker</span>).
            </p>
          </div>

          <div 
            className={`p-4 rounded-xl text-left max-w-lg mx-auto text-xs space-y-2 font-mono border ${
              isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black/40 border-white/10 text-gray-300'
            }`}
          >
            <div className={`flex justify-between border-b pb-1.5 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <span>Current User UID:</span>
              <span className="font-bold">{user?.uid || 'anonymous_guest'}</span>
            </div>
            <div className={`flex justify-between border-b pb-1.5 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <span>Role:</span>
              <span>{user?.role || 'guest'}</span>
            </div>
            <div className={`flex justify-between border-b pb-1.5 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <span>is_worker:</span>
              <span>{String(user?.is_worker ?? false)} (Fulfillment only)</span>
            </div>
            <div className="flex justify-between">
              <span>is_plan_admin:</span>
              <span className="text-rose-500 font-bold">false (Missing Permission)</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!user ? (
              <button
                id="admin-login-required-btn"
                onClick={onOpenAuth}
                className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <UserCheck className="w-4 h-4 text-white" />
                <span>Sign In with Google</span>
              </button>
            ) : (
              <button
                id="simulate-plan-admin-btn"
                onClick={() => {
                  if (onUpdateUserRole && user) {
                    onUpdateUserRole({ ...user, is_plan_admin: true });
                  } else if (onGrantPlanAdmin) {
                    onGrantPlanAdmin();
                  }
                }}
                className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <UserCheck className="w-4 h-4 text-white" />
                <span>Simulate / Enable Plan Admin Role</span>
              </button>
            )}

            {onBackToCustomerFlow && (
              <button
                id="back-to-customer-flow-btn"
                onClick={onBackToCustomerFlow}
                className={`px-5 py-3 rounded-xl font-bold text-sm border transition-colors ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <span>Back to Recharge Flow</span>
              </button>
            )}
          </div>
          <p className={`text-[11px] mt-2 ${currentTheme.mutedText}`}>
            For testing and demonstration, grants <code className="font-mono font-bold" style={{ color: currentTheme.primaryColor }}>is_plan_admin: true</code> on the user profile to unlock plan CRUD and audit trails.
          </p>
        </div>
      </div>
    );
  }

  // Filter plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = 
      plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      OPERATOR_NAMES[plan.operator]?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOp = filterOp === 'all' || plan.operator === filterOp;
    const matchesType = filterType === 'all' || plan.pack_type === filterType;
    return matchesSearch && matchesOp && matchesType;
  });

  if (viewMode === 'audit') {
    return (
      <div className="p-5 sm:p-7 space-y-6 animate-in fade-in duration-300">
        <div 
          className={`border rounded-2xl overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-900' : 'text-gray-200'}`}>
                Plan Pricing & Catalog Audit Logs (Last 20 Changes)
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-mono ${currentTheme.subText}`}>
                {auditLogs.length} Records Verified
              </span>
              <button
                onClick={loadData}
                disabled={loading}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Reload Audit Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className={`font-semibold border-b ${
                  isLight 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : 'bg-black/50 text-gray-300 border-white/10'
                }`}
              >
                <tr>
                  <th className="p-3.5">Timestamp (ISO)</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Plan Name</th>
                  <th className="p-3.5">Operator</th>
                  <th className="p-3.5">Updated By (Admin UID)</th>
                  <th className="p-3.5">Audit Details</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
                {auditLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`font-mono text-[11px] transition-colors ${
                      isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className={`p-3.5 ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                      {new Date(log.updated_at).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === 'create'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : log.action === 'delete'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className={`p-3.5 font-sans font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {log.plan_name}
                    </td>
                    <td className="p-3.5 font-sans font-semibold" style={{ color: currentTheme.primaryColor }}>
                      {OPERATOR_NAMES[log.operator] || log.operator}
                    </td>
                    <td className={`p-3.5 truncate max-w-[140px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {log.updated_by}
                    </td>
                    <td className={`p-3.5 font-sans ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      {log.details || 'Plan record mutation'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={integrated ? "p-5 sm:p-7 space-y-6 animate-in fade-in duration-300" : "max-w-7xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-300"}>
      {/* Standalone Admin Header (Only shown when not in integrated console) */}
      {!integrated && (
        <div 
          className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border rounded-2xl p-6 shadow-xl ${
            isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                /admin/plan
              </span>
              <span className={`text-xs ${currentTheme.subText}`}>
                Role: <strong style={{ color: currentTheme.primaryColor }}>is_plan_admin (Authorized)</strong>
              </span>
            </div>
            <h1 className={`text-2xl font-serif-royal font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span>DTH Plan Catalog Management</span>
              <span 
                className={`text-xs font-sans font-semibold px-2 py-0.5 rounded border ${
                  isLight ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-white/10 text-gray-300 border-white/20'
                }`}
              >
                Firestore: plan_catalog
              </span>
            </h1>
            <p className={`text-xs ${currentTheme.subText}`}>
              Configure live HD & SD packs, pricing, duration options, and recommended packages for Sun Direct, Tata Play, Airtel DTH, Dish TV, and D2H.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setExcelModalTab('export');
                setIsExcelModalOpen(true);
              }}
              className={`px-3.5 py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 ${
                isLight ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/30'
              }`}
              title="Export Current Catalog to Excel or Download Template"
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>Export / Template</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExcelModalTab('import');
                setIsExcelModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              title="Re-upload Excel to Update Packs"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className={`p-2.5 rounded-xl border transition-colors ${
                isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Reload from Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              id="admin-add-plan-btn"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:opacity-95"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Plan</span>
            </button>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Standalone Filter and Search Bar (Only shown when not integrated) */}
      {!integrated && (
        <div 
          className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border ${
            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-md">
              <Search className={`w-4 h-4 absolute left-3 top-3 ${isLight ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search plan name or operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs border focus:outline-none ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                }`}
              />
            </div>

            {/* Operator Filter */}
            <select
              value={filterOp}
              onChange={(e) => setFilterOp(e.target.value)}
              className={`border text-xs rounded-lg px-3 py-2 focus:outline-none ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-[#140029] border-white/20 text-white'
              }`}
            >
              <option value="all">All Operators</option>
              <option value="sun_direct">Sun Direct</option>
              <option value="tata_play">Tata Play</option>
              <option value="airtel_dth">Airtel Digital TV</option>
              <option value="dish_tv">Dish TV</option>
              <option value="d2h">D2H</option>
            </select>

            {/* Quality Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`border text-xs rounded-lg px-3 py-2 focus:outline-none ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-[#140029] border-white/20 text-white'
              }`}
            >
              <option value="all">All Types (HD & SD)</option>
              <option value="HD">HD Packs</option>
              <option value="SD">SD Packs</option>
            </select>
          </div>

          <div className={`text-xs ${currentTheme.subText}`}>
            Showing <span className="font-bold">{filteredPlans.length}</span> of {plans.length} plans
          </div>
        </div>
      )}

      {/* Unified Plans Table Container with Integrated Toolbar */}
      <div 
        className={`border rounded-2xl overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
        }`}
      >
        {/* Integrated Toolbar when in Console Mode (Eliminates separate floating islands) */}
        {integrated && (
          <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isLight ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search plan name or operator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs border focus:outline-none ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Operator Filter */}
              <select
                value={filterOp}
                onChange={(e) => setFilterOp(e.target.value)}
                className={`border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-[#140029] border-white/20 text-white'
                }`}
              >
                <option value="all">All Operators</option>
                <option value="sun_direct">Sun Direct</option>
                <option value="tata_play">Tata Play</option>
                <option value="airtel_dth">Airtel Digital TV</option>
                <option value="dish_tv">Dish TV</option>
                <option value="d2h">D2H</option>
              </select>

              {/* Quality Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900'
                    : 'bg-[#140029] border-white/20 text-white'
                }`}
              >
                <option value="all">All Types (HD & SD)</option>
                <option value="HD">HD Packs</option>
                <option value="SD">SD Packs</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs mr-2 hidden sm:inline ${currentTheme.subText}`}>
                <strong className={isLight ? 'text-gray-900' : 'text-white'}>{filteredPlans.length}</strong> / {plans.length} plans
              </span>
              <button
                type="button"
                onClick={() => {
                  setExcelModalTab('export');
                  setIsExcelModalOpen(true);
                }}
                className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                  isLight ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-900/50'
                }`}
                title="Export or Download Template"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExcelModalTab('import');
                  setIsExcelModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
                title="Import Excel Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className={`p-1.5 rounded-lg border transition-colors ${
                  isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Reload from Catalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                id="admin-add-plan-btn"
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 rounded-lg text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 hover:opacity-95"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Add Plan</span>
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead 
              className={`font-semibold border-b ${
                isLight 
                  ? 'bg-gray-100 text-gray-700 border-gray-200' 
                  : 'bg-black/50 text-gray-300 border-white/10'
              }`}
            >
              <tr>
                <th className="p-4">Plan Name & Operator</th>
                <th className="p-4">Type</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Price</th>
                <th className="p-4">Recommended</th>
                <th className="p-4">Channels Count</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
              {filteredPlans.map((plan) => (
                <tr 
                  key={plan.id} 
                  className={`transition-colors ${isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'}`}
                >
                  <td className="p-4">
                    <div className={`font-serif-royal font-bold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {plan.plan_name}
                    </div>
                    <div className="text-[11px] flex items-center gap-1.5 mt-0.5 opacity-80">
                      <span className="font-medium" style={{ color: currentTheme.primaryColor }}>
                        {OPERATOR_NAMES[plan.operator] || plan.operator}
                      </span>
                      <span>•</span>
                      <span className="font-mono opacity-70">{plan.id}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border`}
                      style={{
                        backgroundColor: `${currentTheme.primaryColor}15`,
                        borderColor: `${currentTheme.primaryColor}30`,
                        color: currentTheme.primaryColor,
                      }}
                    >
                      {plan.pack_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                      {plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-sm" style={{ color: currentTheme.primaryColor }}>
                      ₹{plan.amount}
                    </span>
                    <span className="text-[10px] opacity-70 block">
                      (₹{Math.round(plan.amount / plan.duration_months)}/mo)
                    </span>
                  </td>
                  <td className="p-4">
                    {plan.is_recommended ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <Crown className="w-3 h-3 text-emerald-500" />
                        Recommended
                      </span>
                    ) : (
                      <span className="text-[11px] opacity-70">Regular Pack</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                      {plan.channel_list.length} channels
                    </span>
                  </td>
                  <td className="p-4">
                    <div className={isLight ? 'text-gray-800' : 'text-gray-200'}>
                      {new Date(plan.updated_at).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] opacity-60 font-mono truncate max-w-[120px]">
                      by {plan.updated_by}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(plan)}
                        className={`p-1.5 rounded-lg transition-colors border ${
                          isLight 
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' 
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        }`}
                        title="Edit Plan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(plan.id)}
                        className={`p-1.5 rounded-lg transition-colors border ${
                          isLight
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                            : 'bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border-rose-500/30'
                        }`}
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className={`border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl ${
              isLight ? 'bg-white border-rose-300' : 'bg-[#180530] border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <AlertCircle className="w-6 h-6" />
              <h3 className={`text-base font-serif-royal font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Confirm Plan Deletion
              </h3>
            </div>
            <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
              Are you sure you want to delete this plan from <code className="font-mono font-bold" style={{ color: currentTheme.primaryColor }}>plan_catalog</code>? This action will immediately remove it from customer recommendations and plan choices.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
              >
                Yes, Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className={`border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#180530] border-white/20 text-white'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              <div>
                <h3 className={`text-lg font-serif-royal font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {editingPlan ? 'Edit Plan in Catalog' : 'Add New Plan to Catalog'}
                </h3>
                <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
                  Collection: <span className="font-mono font-bold" style={{ color: currentTheme.primaryColor }}>plan_catalog</span> (Firestore)
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Operator */}
                <div>
                  <label className={`block font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    DTH Operator
                  </label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value as DthOperatorId })}
                    className={`w-full rounded-lg px-3 py-2 border focus:outline-none ${
                      isLight
                        ? 'bg-gray-50 border-gray-300 text-gray-900'
                        : 'bg-black/40 border-white/20 text-white'
                    }`}
                  >
                    <option value="sun_direct">Sun Direct (சன் டைரக்ட்)</option>
                    <option value="tata_play">Tata Play (டாடா பிளே)</option>
                    <option value="airtel_dth">Airtel Digital TV (ஏர்டெல்)</option>
                    <option value="dish_tv">Dish TV (டிஷ் டிவி)</option>
                    <option value="d2h">D2H (டி2எச்)</option>
                  </select>
                </div>

                {/* Pack Type */}
                <div>
                  <label className={`block font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Pack Quality Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pack_type: 'HD' })}
                      className={`py-2 rounded-lg font-bold border transition-all ${
                        formData.pack_type === 'HD'
                          ? 'text-white border-transparent shadow'
                          : isLight
                          ? 'bg-gray-100 text-gray-700 border-gray-300'
                          : 'bg-black/40 text-gray-300 border-white/10'
                      }`}
                      style={{
                        backgroundColor: formData.pack_type === 'HD' ? currentTheme.primaryColor : undefined,
                      }}
                    >
                      HD Pack
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, pack_type: 'SD' })}
                      className={`py-2 rounded-lg font-bold border transition-all ${
                        formData.pack_type === 'SD'
                          ? 'text-white border-transparent shadow'
                          : isLight
                          ? 'bg-gray-100 text-gray-700 border-gray-300'
                          : 'bg-black/40 text-gray-300 border-white/10'
                      }`}
                      style={{
                        backgroundColor: formData.pack_type === 'SD' ? currentTheme.primaryColor : undefined,
                      }}
                    >
                      SD Pack
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan Name */}
              <div>
                <label className={`block font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  Plan Name
                </label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g. Sun Direct Prime HD (6 Months Saver)"
                  className={`w-full rounded-lg px-3 py-2 border focus:outline-none ${
                    isLight
                      ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                      : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Duration Months */}
                <div>
                  <label className={`block font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Duration (Months)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 6, 12] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration_months: dur })}
                        className={`py-2 rounded-lg font-semibold border transition-all ${
                          formData.duration_months === dur
                            ? 'text-white font-bold border-transparent shadow'
                            : isLight
                            ? 'bg-gray-100 text-gray-700 border-gray-300'
                            : 'bg-black/40 text-gray-300 border-white/10'
                        }`}
                        style={{
                          backgroundColor: formData.duration_months === dur ? currentTheme.primaryColor : undefined,
                        }}
                      >
                        {dur}M
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount in INR */}
                <div>
                  <label className={`block font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Amount (₹ INR)
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3 top-2 font-bold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>₹</span>
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g. 1650"
                      className={`w-full rounded-lg pl-7 pr-3 py-2 font-mono font-bold border focus:outline-none ${
                        isLight
                          ? 'bg-gray-50 border-gray-300 text-gray-900'
                          : 'bg-black/40 border-white/20 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* is_recommended toggle */}
              <div 
                className={`p-3 rounded-xl flex items-center justify-between border ${
                  isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                }`}
              >
                <div>
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Featured as Recommended Pack
                  </span>
                  <span className={`text-[11px] ${currentTheme.subText}`}>
                    If enabled, this plan is showcased directly on the customer's 2-card default view.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_recommended: !formData.is_recommended })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1`}
                  style={{
                    backgroundColor: formData.is_recommended ? currentTheme.primaryColor : (isLight ? '#d1d5db' : '#374151')
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.is_recommended ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Channel List Editor */}
              <div className="space-y-2">
                <label className={`block font-semibold ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  Channel List ({formData.channel_list.length} channels added)
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChannel();
                      }
                    }}
                    placeholder="Type channel name and press Enter (e.g. Sun TV HD)..."
                    className={`flex-1 rounded-lg px-3 py-2 border focus:outline-none ${
                      isLight
                        ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                        : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddChannel()}
                    className="px-4 py-2 text-white font-semibold rounded-lg shadow-sm"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    Add
                  </button>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`text-[10px] mr-1 self-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Quick Add:</span>
                  {SUGGESTED_CHANNELS.slice(0, 8).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleAddChannel(ch)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        isLight
                          ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'
                          : 'bg-black/30 hover:bg-white/10 border-white/10 text-gray-300'
                      }`}
                    >
                      + {ch}
                    </button>
                  ))}
                </div>

                {/* Active Channels Chips */}
                <div 
                  className={`flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border ${
                    isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/10'
                  }`}
                >
                  {formData.channel_list.map((ch) => (
                    <span
                      key={ch}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${
                        isLight
                          ? 'bg-white border-gray-200 text-gray-800'
                          : 'bg-white/10 border-white/10 text-gray-200'
                      }`}
                    >
                      {ch}
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(ch)}
                        className="hover:text-rose-500 ml-1 text-gray-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className={`flex items-center justify-between pt-4 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                <span className={`text-[11px] font-mono ${currentTheme.subText}`}>
                  Timestamp: {new Date().toISOString().slice(0, 19)}Z
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 rounded-xl font-semibold border ${
                      isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl text-white font-bold shadow-md hover:opacity-95"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    Save to Catalog
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recent Audit Log Section (Requirement 4 - only shown in standalone mode) */}
      {!integrated && (
        <div 
          className={`border rounded-2xl p-6 shadow-xl space-y-4 ${
            isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: currentTheme.primaryColor }} />
              <h2 className={`text-base font-serif-royal font-bold ${currentTheme.headingText}`}>
                Plan Pricing Audit Log (Last 20 Changes)
              </h2>
            </div>
            <span className={`text-xs font-mono ${currentTheme.subText}`}>
              Directly synced from updated_at & updated_by
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead 
                className={`font-semibold border-b ${
                  isLight 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : 'bg-black/50 text-gray-300 border-white/10'
                }`}
              >
                <tr>
                  <th className="p-3">Timestamp (ISO)</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Plan Name</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Updated By (Admin UID)</th>
                  <th className="p-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
                {auditLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    className={`font-mono text-[11px] transition-colors ${
                      isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                    }`}
                  >
                    <td className={`p-3 ${isLight ? 'text-gray-800' : 'text-gray-300'}`}>
                      {new Date(log.updated_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === 'create'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : log.action === 'delete'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className={`p-3 font-sans font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {log.plan_name}
                    </td>
                    <td className="p-3 font-sans font-semibold" style={{ color: currentTheme.primaryColor }}>
                      {OPERATOR_NAMES[log.operator] || log.operator}
                    </td>
                    <td className={`p-3 truncate max-w-[140px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {log.updated_by}
                    </td>
                    <td className={`p-3 font-sans ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      {log.details || 'Plan record mutation'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Excel Import / Export Modal */}
      <ExcelPlanImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        plans={plans}
        currentTheme={currentTheme}
        user={user}
        defaultTab={excelModalTab}
        onPlansUpdated={async (newPlans) => {
          setPlans(newPlans);
          setSaveSuccess('Packs updated successfully from Excel import.');
          setTimeout(() => setSaveSuccess(null), 4000);
          await loadData();
        }}
      />
    </div>
  );
};
