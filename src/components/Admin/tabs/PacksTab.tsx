import { formatPrice, formatMonthlyEquivalent, formatDuration, validateCatalogPack } from '../../../lib/catalog';
import { AdminRefreshButton } from '../AdminRefreshButton';
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
  RefreshCw,
  AlertCircle
} from '../../../lib/icons';
import { PlanCatalogItem, DthOperatorId, Language, UserProfile, canonicalizeDthOperatorId, isSameDthOperatorGroup } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { PlanCatalogService } from '../../../lib/planCatalogService';
import { ExcelPlanImportExportModal } from '../../ExcelPlanImportExportModal';
import { translations } from '../../../lib/translations';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';

type CatalogSortKey = 'plan_name' | 'operator' | 'pack_type' | 'duration_months' | 'amount' | 'is_recommended';

interface PacksTabProps {
  plans: PlanCatalogItem[];
  plansLoading: boolean;
  plansError?: string | null;
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
  plansError,
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
  const [catalogSort, setCatalogSort] = useState<{ key: CatalogSortKey; direction: 'asc' | 'desc' } | null>(null);
  const toggleCatalogSort = (key: CatalogSortKey) => {
    setCatalogSort((previous) => ({ key, direction: previous?.key === key && previous.direction === 'asc' ? 'desc' : 'asc' }));
  };
  const sortHeading = (key: CatalogSortKey, label: string) => (
    <button type="button" className="catalog-sort-heading" onClick={() => toggleCatalogSort(key)}
      aria-label={`${label}: sort ${catalogSort?.key === key && catalogSort.direction === 'asc' ? 'descending' : 'ascending'}`}>
      {label}<span aria-hidden="true">{catalogSort?.key === key ? (catalogSort.direction === 'asc' ? '\u2191' : '\u2193') : '\u2195'}</span>
    </button>
  );
  const sortDirection = (key: CatalogSortKey): 'ascending' | 'descending' | undefined => catalogSort?.key === key ? (catalogSort.direction === 'asc' ? 'ascending' : 'descending') : undefined;
  const [selectedPackOp, setSelectedPackOp] = useState<DthOperatorId | 'all'>('all');
  const [editingPack, setEditingPack] = useState<PlanCatalogItem | null>(null);
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [packToDelete, setPackToDelete] = useState<PlanCatalogItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'import' | 'export'>('import');

  // Accessible Modal Hooks for Focus Trapping & Escape-to-close
  const { modalRef: packModalRef } = useAccessibleModal({
    isOpen: isPackModalOpen,
    onClose: () => setIsPackModalOpen(false),
  });

  const { modalRef: deleteModalRef } = useAccessibleModal({
    isOpen: Boolean(packToDelete),
    onClose: () => setPackToDelete(null),
  });

  const [formData, setFormData] = useState<{
    id?: string;
    operator: DthOperatorId;
    pack_type: 'HD' | 'SD';
    duration_months: 1 | 3 | 6 | 12;
    plan_name: string;
    amount: number | string;
    is_recommended: boolean;
    channel_list: string[];
    channel_count: number | string;
    hd_channel_count: number | string;
    channel_counts_unavailable?: boolean;
  }>({
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: '',
    amount: '',
    channel_count: '',
    hd_channel_count: '',
    is_recommended: true,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD'],
  });

  const [channelInput, setChannelInput] = useState('');

  const operatorNames: Record<string, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV & D2H', d2h: 'Dish TV & D2H' };

  const filteredPlans = plans.filter((p) => {
    const matchOp = selectedPackOp === 'all' || isSameDthOperatorGroup(p.operator, selectedPackOp);
    const matchSearch =
      p.plan_name.toLowerCase().includes(packSearch.toLowerCase()) ||
      p.operator.toLowerCase().includes(packSearch.toLowerCase());
    return matchOp && matchSearch;
  }).sort((a, b) => {
    if (catalogSort) {
      const { key, direction } = catalogSort;
      let comparison: number;
      if (key === 'amount' || key === 'duration_months') comparison = Number(a[key]) - Number(b[key]);
      else if (key === 'is_recommended') comparison = (a.is_recommended ? 'Recommended' : 'Standard').localeCompare(b.is_recommended ? 'Recommended' : 'Standard');
      else if (key === 'operator') comparison = (operatorNames[a.operator] || a.operator).localeCompare(operatorNames[b.operator] || b.operator);
      else comparison = a[key].localeCompare(b[key], undefined, { numeric: true, sensitivity: 'base' });
      return (direction === 'asc' ? comparison : -comparison) || a.plan_name.localeCompare(b.plan_name) || a.duration_months - b.duration_months;
    }
    return a.operator.localeCompare(b.operator) || Number(b.is_recommended) - Number(a.is_recommended) || a.plan_name.localeCompare(b.plan_name) || a.duration_months - b.duration_months;
  });

  const handleOpenAdd = () => {
    setEditingPack(null);
    setFormData({
      operator: selectedPackOp === 'all' ? 'sun_direct' : selectedPackOp,
      pack_type: 'HD',
      duration_months: 1,
      plan_name: '',
      amount: '',
    channel_count: '',
    hd_channel_count: '',
      is_recommended: true,
      channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD'],
    });
    setIsPackModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanCatalogItem) => {
    setEditingPack(plan);
    setFormData({
      id: plan.id,
      operator: canonicalizeDthOperatorId(plan.operator),
      pack_type: plan.pack_type,
      duration_months: plan.duration_months,
      plan_name: plan.plan_name,
      amount: plan.amount,
      channel_count: plan.channel_count ?? '',
      hd_channel_count: plan.hd_channel_count ?? '',
      channel_counts_unavailable: plan.channel_counts_unavailable,
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
        channel_counts_unavailable: formData.channel_counts_unavailable,
        channel_count: formData.channel_counts_unavailable ? undefined : formData.channel_count === '' ? NaN : Number(formData.channel_count),
        hd_channel_count: formData.channel_counts_unavailable ? undefined : formData.hd_channel_count === '' ? NaN : Number(formData.hd_channel_count),
        channel_list: formData.channel_list,
        channels: formData.channel_list,
        genre_tags: ['tamil', 'entertainment'],
        description: `${formData.pack_type} pack for ${formData.duration_months} Month(s)`,
      }, adminUid);

      showToast(`Pack "${saved.plan_name}" saved to the catalog.`);
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
    <div className="admin-tab plan-catalog-tab space-y-4">
      {/* Top Controls */}
      <div className="admin-toolbar flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:flex-1 min-w-0 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search packs in catalog" aria-label="Search packs"
              value={packSearch}
              onChange={(e) => setPackSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-colors ${
                isLight ? 'bg-paper-2 border-rule text-ink focus:bg-paper' : 'bg-paper border-rule text-accent-ink'
              }`}
            />
          </div>

          <select
            value={selectedPackOp}
            onChange={(e) => setSelectedPackOp(e.target.value as any)}
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
            onClick={() => {
              setExcelModalTab('import');
              setIsExcelModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl border font-medium text-sm flex items-center gap-1.5 transition-colors bg-success/10 border-rule text-success  hover:bg-success/10"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Batch Tool</span>
          </button>

          <AdminRefreshButton onRefresh={onRefresh} loading={plansLoading} label={t.refresh} />

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-accent-ink font-bold text-sm shadow-none transition-colors flex items-center gap-1.5 hover:opacity-95"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewPack}</span>
          </button>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {plansError && (
        <div role="alert" className="p-4 rounded-lg bg-error/10 border border-rule text-error  flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span className="font-medium">{plansError}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-accent hover:bg-error/10 text-accent-ink font-bold text-sm flex items-center gap-1 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.retryFetch}</span>
          </button>
        </div>
      )}

      {/* Packs Table */}
      <div className={`border rounded-lg overflow-hidden shadow-none ${
        isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
      }`}>
        <div className="plan-catalog-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Plan catalog table">
          <table className="admin-responsive-table plan-catalog-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-ink border-rule' : 'bg-paper-2 text-muted border-rule'}`}>
              <tr>
                <th scope="col" aria-sort={sortDirection('plan_name')} className="p-3.5 font-medium">{sortHeading('plan_name', t.packNameLabel)}</th>
                <th scope="col" aria-sort={sortDirection('operator')} className="hidden md:table-cell p-3.5 font-medium">{sortHeading('operator', t.operatorLabel)}</th>
                <th scope="col" aria-sort={sortDirection('pack_type')} className="p-3.5 font-medium">{sortHeading('pack_type', 'Quality')}</th>
                <th scope="col" aria-sort={sortDirection('duration_months')} className="hidden md:table-cell p-3.5 font-medium">{sortHeading('duration_months', 'Duration')}</th>
                <th scope="col" aria-sort={sortDirection('amount')} className="p-3.5 font-medium">{sortHeading('amount', 'Price (Rs.)')}</th>
                <th scope="col" aria-sort={sortDirection('is_recommended')} className="hidden sm:table-cell p-3.5 font-medium">{sortHeading('is_recommended', t.status)}</th>
                <th scope="col" className="catalog-actions-heading p-3.5 font-medium"><span>{t.actions}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {plansLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted ">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-warning" />
                      <span>{t.loadingLiveCatalog}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink ">
                    {t.noPlansMatch}
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-paper-2 transition-colors">
                    <td data-label={t.packNameLabel} className="p-3.5 font-medium">
                      <div className="font-bold text-sm text-ink ">{plan.plan_name}</div>
                      {validateCatalogPack(plan).length > 0 && <p className="text-error text-xs">{validateCatalogPack(plan).map(issue => issue.message).join(" ")}</p>}
                      
                      <div className="md:hidden text-sm text-ink ">
                        {operatorNames[plan.operator] || plan.operator} · {plan.duration_months}M
                      </div>
                    </td>
                    <td data-label={t.operatorLabel} className="hidden md:table-cell p-3.5"><span className="compact-plan-pill compact-plan-operator" data-operator={plan.operator}>{operatorNames[plan.operator] || plan.operator}</span></td>
                    <td data-label={t.qualityLabel} className="p-3.5">
                      <span className="compact-plan-pill compact-plan-quality" data-quality={plan.pack_type}>
                        {plan.pack_type}
                      </span>
                    </td>
                    <td data-label={t.durationMonthsLabel} className="hidden md:table-cell p-3.5">
                      <span className="compact-plan-pill compact-plan-duration" data-duration={plan.duration_months}>{formatDuration(plan.duration_months, currentLang)}</span>
                    </td>
                    <td data-label={t.priceInrLabel} className="p-3.5">
                      <div className="font-medium text-sm text-ink">{formatPrice(plan.amount, currentLang)}</div>
                      {plan.duration_months > 1 && <div className="text-xs text-muted">{formatMonthlyEquivalent(plan.amount, plan.duration_months, currentLang)}</div>}
                    </td>
                    <td data-label={t.status} className="hidden sm:table-cell p-3.5">
                      {plan.is_recommended ? (
                        <span className="catalog-recommended text-sm px-2.5 py-0.5 rounded-full bg-success/10 text-success  font-bold border border-rule inline-flex items-center gap-1 w-fit">
                          <span>Recommended</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted  font-medium">Standard</span>
                      )}
                    </td>
                    <td data-label={t.actions} className="admin-pack-actions p-3.5">
                      <div className="admin-pack-action-group">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(plan)}
                          className="admin-pack-action p-1.5 rounded-lg hover:bg-paper-2 transition-colors"
                          title="Edit Pack"
                          aria-label={`Edit ${plan.plan_name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPackToDelete(plan)}
                          className="admin-pack-action catalog-delete-action p-1.5 rounded-lg text-error hover:bg-error-soft transition-colors"
                          title="Delete Pack"
                          aria-label={`Delete ${plan.plan_name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          className="fixed inset-0 z-50 bg-ink/70  flex items-center justify-center p-4  "
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPackModalOpen(false);
          }}
        >
          <div
            ref={packModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-editor-title"
            className={`border rounded-xl max-h-[calc(100dvh-2rem)] overflow-y-auto max-w-lg w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-rule">
              <h3 id="pack-editor-title" className="font-bold text-base">{editingPack ? t.editPackTitle : t.addPackTitle}</h3>
              <button
                type="button"
                onClick={() => setIsPackModalOpen(false)}
                aria-label={t.close}
                className="p-1.5 rounded-lg hover:bg-paper-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePack} className="space-y-3 text-sm">
              {editingPack && <p className="text-xs text-muted break-all">ID: {editingPack.id}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium block mb-1 text-ink ">DTH Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value as DthOperatorId })}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                  >
                    <option value="sun_direct">Sun Direct</option>
                    <option value="tata_play">Tata Play</option>
                    <option value="airtel_dth">Airtel DTH</option>
                    <option value="dish_tv">Dish TV &amp; D2H</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium block mb-1 text-ink ">Quality Type</label>
                  <select
                    value={formData.pack_type}
                    onChange={(e) => setFormData({ ...formData, pack_type: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                  >
                    <option value="HD">HD Pack</option>
                    <option value="SD">SD Pack</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1 text-ink ">Duration (Months)</label>
                <div className="grid grid-cols-4 gap-2">
                  {([1, 3, 6, 12] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_months: d })}
                      className={`py-2 rounded-xl font-bold border transition-colors ${
                        formData.duration_months === d
                          ? 'text-accent-ink border-transparent shadow'
                          : 'bg-ink/20 text-muted border-rule'
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
                <label className="font-medium block mb-1 text-ink ">Pack Name</label>
                <input
                  type="text"
                  required
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  placeholder="e.g. Sun Direct Prime HD (6 Months Saver)"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium block mb-1 text-ink ">Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step={0.01}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="1650"
                  className="w-full rounded-xl px-3 py-2 border bg-ink/20 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-medium py-1 text-ink ">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
                    className="accent-purple-600 rounded"
                  />
                  <span>Mark as Recommended / Hero Card</span>
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!formData.channel_counts_unavailable} onChange={event => setFormData({ ...formData, channel_counts_unavailable: event.target.checked })} />
                {currentLang === 'ta' ? 'சேனல் எண்ணிக்கை வழங்கப்படவில்லை' : 'Channel counts not provided'}
              </label>
              {!formData.channel_counts_unavailable && <div className="grid grid-cols-2 gap-3">
                <label className="font-medium">Total channels<input type="number" min="1" required value={formData.channel_count} onChange={event => setFormData({ ...formData, channel_count: event.target.value })} className="w-full rounded-xl px-3 py-2 border bg-ink/20" /></label>
                <label className="font-medium">HD channels<input type="number" min="0" required value={formData.hd_channel_count} onChange={event => setFormData({ ...formData, hd_channel_count: event.target.value })} className="w-full rounded-xl px-3 py-2 border bg-ink/20" /></label>
              </div>
              }
              {/* Channels List Editor */}
              <div className="space-y-2">
                <label className="font-medium block text-ink ">Channel Highlights</label>
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
                    className="flex-1 rounded-xl px-3 py-1.5 border bg-ink/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddChannel}
                    className="px-3.5 py-1.5 rounded-xl bg-paper-3 font-bold hover:bg-paper-3"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl border border-rule bg-ink/10">
                  {formData.channel_list.map((ch) => (
                    <span
                      key={ch}
                      className="px-2.5 py-1 rounded-lg bg-paper-2 text-sm font-medium flex items-center gap-1.5"
                    >
                      <span>{ch}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(ch)}
                        className="hover:text-error"
                        aria-label={`Remove ${ch}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setIsPackModalOpen(false)}
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

      {/* Delete Pack Confirmation */}
      {packToDelete && (
        <div
          className="fixed inset-0 z-50 bg-ink/70  flex items-center justify-center p-4  "
          onClick={(e) => {
            if (e.target === e.currentTarget) setPackToDelete(null);
          }}
        >
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pack-title"
            className={`border rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-left ${
              isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <h3 id="delete-pack-title" className="font-bold text-base text-error">{t.confirmDeletePackTitle}</h3>
            <p className="text-sm text-ink  leading-relaxed">
              {t.confirmDeletePackDesc} <strong>{packToDelete.plan_name}</strong> (Rs. {packToDelete.amount})?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPackToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-sm font-medium bg-paper-3"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePack(packToDelete.id)}
                className="px-3.5 py-2 rounded-xl text-sm font-bold bg-accent hover:bg-error/10 text-accent-ink shadow-none"
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
          currentLang={currentLang}
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
