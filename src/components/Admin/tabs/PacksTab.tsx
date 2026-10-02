import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  Tv, 
  Check, 
  X, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { PlanCatalogItem, DthOperatorId, Language, UserProfile } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { PlanCatalogService } from '../../../lib/planCatalogService';
import { ExcelPlanImportExportModal } from '../../ExcelPlanImportExportModal';
import { translations } from '../../../lib/translations';

interface PacksTabProps {
  plans: PlanCatalogItem[];
  plansLoading: boolean;
  onRefresh: () => void;
  user: UserProfile | null;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
  onPlansUpdated: (newPlans: PlanCatalogItem[]) => void;
}

export const PacksTab: React.FC<PacksTabProps> = ({
  plans,
  plansLoading,
  onRefresh,
  user,
  currentTheme,
  currentLang,
  showToast,
  onPlansUpdated,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [packSearch, setPackSearch] = useState('');
  const [selectedPackOp, setSelectedPackOp] = useState<DthOperatorId | 'all'>('all');
  const [editingPack, setEditingPack] = useState<PlanCatalogItem | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<PlanCatalogItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'import' | 'export'>('import');

  const [formData, setFormData] = useState<{
    id?: string;
    operator: DthOperatorId;
    pack_type: 'HD' | 'SD';
    duration_months: 1 | 3 | 6 | 12;
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
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD'],
  });

  const [channelInput, setChannelInput] = useState('');

  const filteredPlans = plans.filter((p) => {
    const matchOp = selectedPackOp === 'all' || p.operator === selectedPackOp;
    const matchSearch =
      p.plan_name.toLowerCase().includes(packSearch.toLowerCase()) ||
      p.operator.toLowerCase().includes(packSearch.toLowerCase());
    return matchOp && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingPack(null);
    setFormData({
      operator: selectedPackOp === 'all' ? 'sun_direct' : selectedPackOp,
      pack_type: 'HD',
      duration_months: 1,
      plan_name: '',
      amount: '',
      is_recommended: true,
      channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD'],
    });
    setIsPackModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanCatalogItem) => {
    setEditingPack(plan);
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
    setIsPackModalOpen(true);
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plan_name.trim() || !formData.amount) {
      showToast('Please provide a pack name and amount.');
      return;
    }

    const planId = formData.id || `${formData.operator}_${formData.pack_type.toLowerCase()}_${formData.duration_months}m_${Date.now().toString().slice(-4)}`;
    const adminUid = user?.email || user?.uid || 'superadmin';

    try {
      const saved = await PlanCatalogService.savePlan({
        id: planId,
        operator: formData.operator,
        pack_type: formData.pack_type,
        duration_months: formData.duration_months,
        plan_name: formData.plan_name.trim(),
        amount: Number(formData.amount),
        price: Number(formData.amount),
        is_recommended: formData.is_recommended,
        channel_count: formData.channel_list.length || (formData.pack_type === 'HD' ? 210 : 145),
        hd_channel_count: formData.pack_type === 'HD' ? 32 : 0,
        channel_list: formData.channel_list,
        channels: formData.channel_list,
        genre_tags: ['tamil', 'entertainment'],
        description: `${formData.pack_type} pack for ${formData.duration_months} Month(s)`,
      }, adminUid);

      showToast(`Pack "${saved.plan_name}" saved to Firestore.`);
      setIsPackModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to save pack: ${err.message || err}`);
    }
  };

  const handleDeletePack = async (planId: string) => {
    const adminUid = user?.email || user?.uid || 'superadmin';
    try {
      await PlanCatalogService.deletePlan(planId, adminUid);
      showToast('Plan deleted permanently from catalog.');
      setPackToDelete(null);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed to delete plan: ${err.message || err}`);
    }
  };

  const handleAddChannel = () => {
    if (!channelInput.trim()) return;
    if (!formData.channel_list.includes(channelInput.trim())) {
      setFormData({
        ...formData,
        channel_list: [...formData.channel_list, channelInput.trim()],
      });
    }
    setChannelInput('');
  };

  const handleRemoveChannel = (channel: string) => {
    setFormData({
      ...formData,
      channel_list: formData.channel_list.filter((c) => c !== channel),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search packs in catalog..."
              value={packSearch}
              onChange={(e) => setPackSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-colors ${
                isLight ? 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white' : 'bg-[#140029] border-white/20 text-white'
              }`}
            />
          </div>

          <select
            value={selectedPackOp}
            onChange={(e) => setSelectedPackOp(e.target.value as any)}
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
            onClick={() => {
              setExcelModalTab('import');
              setIsExcelModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-colors bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/25"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Batch Tool</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className={`p-2.5 rounded-xl border transition-colors ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Refresh catalog"
          >
            <RefreshCw className={`w-4 h-4 ${plansLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 hover:opacity-95"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewPack}</span>
          </button>
        </div>
      </div>

      {/* Packs Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-sm ${
        isLight ? 'bg-white border-gray-200' : 'bg-white/[0.02] border-white/10'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-gray-50/80 text-gray-700 border-gray-200' : 'bg-white/[0.03] text-gray-300 border-white/10'}`}>
              <tr>
                <th className="p-3.5 font-bold uppercase tracking-wider">Pack Name</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Operator</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Quality</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Duration</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Price (INR)</th>
                <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10">
              {plansLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Loading real-time catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No packs found.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-semibold">
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{plan.plan_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {plan.id}</div>
                    </td>
                    <td className="p-3.5 capitalize font-medium text-gray-800 dark:text-gray-200">{plan.operator.replace('_', ' ')}</td>
                    <td className="p-3.5">
                      <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold uppercase ${
                        plan.pack_type === 'HD' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}>
                        {plan.pack_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-gray-800 dark:text-gray-200">{plan.duration_months} Month{plan.duration_months > 1 ? 's' : ''}</td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">₹{plan.amount}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">₹{Math.round(plan.amount / plan.duration_months)}/mo</div>
                    </td>
                    <td className="p-3.5">
                      {plan.is_recommended ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Recommended</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Standard</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(plan)}
                        className="p-1.5 rounded-lg border hover:bg-white/10 transition-colors"
                        title="Edit Pack"
                        aria-label={`Edit ${plan.plan_name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackToDelete(plan)}
                        className="p-1.5 rounded-lg border text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Pack"
                        aria-label={`Delete ${plan.plan_name}`}
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

      {/* Add / Edit Pack Modal */}
      {isPackModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPackModalOpen(false);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-editor-title"
            className={`border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#180530] border-white/20 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-gray-500/20">
              <h3 id="pack-editor-title" className="font-bold text-base">{editingPack ? 'Edit Pack in Catalog' : 'Add Pack to Catalog'}</h3>
              <button 
                type="button"
                onClick={() => setIsPackModalOpen(false)} 
                aria-label={t.close}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePack} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">DTH Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value as DthOperatorId })}
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
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Quality Type</label>
                  <select
                    value={formData.pack_type}
                    onChange={(e) => setFormData({ ...formData, pack_type: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                  >
                    <option value="HD">HD Pack</option>
                    <option value="SD">SD Pack</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Duration (Months)</label>
                <div className="grid grid-cols-4 gap-2">
                  {([1, 3, 6, 12] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_months: d })}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        formData.duration_months === d
                          ? 'text-white border-transparent shadow'
                          : 'bg-black/20 text-gray-300 border-white/10'
                      }`}
                      style={{
                        backgroundColor: formData.duration_months === d ? currentTheme.primaryColor : undefined,
                      }}
                    >
                      {d}M
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Pack Name</label>
                <input
                  type="text"
                  required
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g. Sun Direct Prime HD (6 Months Saver)"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Amount in INR (₹)</label>
                <input
                  type="number"
                  required
                  min={10}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="1650"
                  className="w-full rounded-xl px-3 py-2 border bg-black/20 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold py-1 text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <span>Mark as Recommended / Hero Card</span>
                </label>
              </div>

              {/* Channels List Editor */}
              <div className="space-y-2">
                <label className="font-semibold block text-gray-700 dark:text-gray-300">Channel Highlights</label>
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
                    placeholder="Add channel (e.g. Sun TV HD)"
                    className="flex-1 rounded-xl px-3 py-1.5 border bg-black/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddChannel}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-500/20 font-bold hover:bg-gray-500/30"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl border border-gray-500/20 bg-black/10">
                  {formData.channel_list.map((ch) => (
                    <span
                      key={ch}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{ch}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(ch)}
                        className="hover:text-rose-400"
                        aria-label={`Remove ${ch}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-500/20">
                <button
                  type="button"
                  onClick={() => setIsPackModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold bg-gray-500/20 hover:bg-gray-500/30"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white shadow"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Pack Confirmation */}
      {packToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPackToDelete(null);
          }}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pack-title"
            className={`border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-white border-rose-200 text-gray-900' : 'bg-[#180530] border-rose-500/30 text-white'
            }`}
          >
            <h3 id="delete-pack-title" className="font-bold text-base text-rose-500">Delete Plan from Catalog?</h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Are you sure you want to delete <strong>{packToDelete.plan_name}</strong> (₹{packToDelete.amount}) from Firestore?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPackToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-500/20"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePack(packToDelete.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Batch Import / Export Modal */}
      <ExcelPlanImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        plans={plans}
        currentTheme={currentTheme}
        user={user}
        onPlansUpdated={(newPlans) => {
          onPlansUpdated(newPlans);
          onRefresh();
        }}
        defaultTab={excelModalTab}
      />
    </div>
  );
};
