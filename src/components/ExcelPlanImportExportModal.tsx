import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  HelpCircle, 
  FileDown, 
  Check, 
  Info,
  Sparkles,
  ArrowUpRight,
  Database
} from 'lucide-react';
import { PlanCatalogItem, DthOperatorId, UserProfile } from '../types';
import { OperatorTheme } from '../lib/theme';
import { 
  exportPlansToExcel, 
  downloadPlanTemplateExcel, 
  parseAndValidatePlanExcel, 
  applyImportedPlans,
  PlanImportRow,
  PlanValidationSummary,
  OPERATOR_DISPLAY_NAMES
} from '../lib/excelPlanService';

interface ExcelPlanImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanCatalogItem[];
  currentTheme: OperatorTheme;
  user: UserProfile | null;
  onPlansUpdated: (newPlans: PlanCatalogItem[]) => void;
  defaultTab?: 'import' | 'export';
}

export const ExcelPlanImportExportModal: React.FC<ExcelPlanImportExportModalProps> = ({
  isOpen,
  onClose,
  plans,
  currentTheme,
  user,
  onPlansUpdated,
  defaultTab = 'import',
}) => {
  const isLight = currentTheme.isLightMode;
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'guide'>(defaultTab);
  
  // Export states
  const [exportOp, setExportOp] = useState<DthOperatorId | 'all'>('all');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Import states
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseSummary, setParseSummary] = useState<PlanValidationSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'update' | 'create' | 'invalid'>('all');
  const [importSuccessResult, setImportSuccessResult] = useState<{ count: number } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  const processSelectedFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setGeneralError(null);
    setImportSuccessResult(null);
    setParsing(true);

    try {
      const summary = await parseAndValidatePlanExcel(uploadedFile, plans);
      setParseSummary(summary);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setGeneralError(err.message || 'Failed to parse Excel file. Please ensure it has valid columns.');
      setParseSummary(null);
    } finally {
      setParsing(false);
    }
  };

  // Toggle Row Selection
  const handleToggleRow = (index: number) => {
    if (!parseSummary) return;
    const newRows = [...parseSummary.rows];
    newRows[index] = {
      ...newRows[index],
      selected: !newRows[index].selected,
    };
    setParseSummary({
      ...parseSummary,
      rows: newRows,
    });
  };

  // Toggle Select All
  const handleToggleSelectAll = (select: boolean) => {
    if (!parseSummary) return;
    const newRows = parseSummary.rows.map((r) => ({
      ...r,
      selected: r.isValid ? select : false,
    }));
    setParseSummary({
      ...parseSummary,
      rows: newRows,
    });
  };

  // Apply Import
  const handleApplyImport = async () => {
    if (!parseSummary) return;
    const selectedRows = parseSummary.rows.filter((r) => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      setGeneralError('No valid rows selected to import.');
      return;
    }

    setImporting(true);
    setGeneralError(null);

    try {
      const adminIdentity = user?.email || user?.uid || 'super_admin_portal';
      const result = await applyImportedPlans(selectedRows, adminIdentity);
      onPlansUpdated(result.updatedPlans);
      setImportSuccessResult({ count: result.count });
      setParseSummary(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Import apply error:', err);
      setGeneralError(err.message || 'An error occurred while writing updates to the plan catalog.');
    } finally {
      setImporting(false);
    }
  };

  // Handle Export
  const handleTriggerExport = () => {
    try {
      const filename = exportOp === 'all' 
        ? `dth_tamizhan_all_packs_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `dth_tamizhan_${exportOp}_packs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      exportPlansToExcel(plans, filename, exportOp);
      setExportSuccessMsg(`Successfully exported ${exportOp === 'all' ? 'all' : OPERATOR_DISPLAY_NAMES[exportOp]} packs to "${filename}".`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      setGeneralError(err.message || 'Export failed.');
    }
  };

  // Handle Download Blank Template
  const handleDownloadTemplate = () => {
    try {
      downloadPlanTemplateExcel();
      setExportSuccessMsg('Template downloaded! Open in Excel, fill your rows, and upload here.');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      setGeneralError(err.message || 'Template download failed.');
    }
  };

  // Filtered rows for preview
  const displayRows = parseSummary?.rows.filter((r) => {
    if (previewFilter === 'valid') return r.isValid;
    if (previewFilter === 'update') return r.isValid && r.action === 'update';
    if (previewFilter === 'create') return r.isValid && r.action === 'create';
    if (previewFilter === 'invalid') return !r.isValid;
    return true;
  }) || [];

  const selectedValidCount = parseSummary?.rows.filter((r) => r.selected && r.isValid).length || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div 
        className={`w-full max-w-5xl rounded-3xl border shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0f0724] border-white/15 text-white'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
          isLight ? 'bg-gray-50/90 border-gray-200' : 'bg-white/[0.03] border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md border"
              style={{
                backgroundColor: `${currentTheme.primaryColor}18`,
                borderColor: `${currentTheme.primaryColor}40`,
                color: currentTheme.primaryColor,
              }}
            >
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-royal font-bold text-lg sm:text-xl">
                  Excel Pack Synchronization & Management
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  .xlsx / .csv
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
                Export current live pack records to Excel for template reference, edit prices/names, and re-upload to update in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors border ${
              isLight ? 'bg-white hover:bg-gray-100 text-gray-500 border-gray-200' : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-6 pt-3 border-b flex items-center justify-between gap-2 overflow-x-auto ${
          isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-black/20 border-white/10'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'import'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>1. Re-upload & Update Packs</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>2. Export Current Records & Template</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'guide'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-500/10'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>3. Format Guide & Instructions</span>
            </button>
          </div>

          <span className={`text-[11px] font-mono hidden md:inline ${currentTheme.subText}`}>
            {plans.length} Live Catalog Packs Active
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Global Notifications */}
          {exportSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {importSuccessResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-200 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Successfully Applied {importSuccessResult.count} Pack Updates!</span>
              </div>
              <p className="text-xs opacity-90">
                The updated packs, pricing, durations, and channels are now live in the Firestore catalog and immediately visible in the customer recharge flow and admin panels.
              </p>
              <div className="pt-1 flex gap-2">
                <button
                  onClick={() => setImportSuccessResult(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-lg border border-emerald-500/40 font-bold text-xs hover:bg-emerald-500/20"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {generalError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{generalError}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: IMPORT & REUPLOAD */}
          {/* ======================================================== */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* File Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isLight
                    ? 'border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400'
                    : 'border-white/20 bg-black/20 hover:bg-black/30 hover:border-white/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="max-w-md mx-auto space-y-3">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-inner border"
                    style={{
                      backgroundColor: `${currentTheme.primaryColor}15`,
                      borderColor: `${currentTheme.primaryColor}30`,
                      color: currentTheme.primaryColor,
                    }}
                  >
                    {parsing ? (
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      {file ? file.name : 'Click to Browse or Drag & Drop Excel Spreadsheet'}
                    </h3>
                    <p className={`text-xs mt-1 ${currentTheme.subText}`}>
                      Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv). Max 10MB.
                    </p>
                  </div>

                  {file && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-mono font-semibold">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>{(file.size / 1024).toFixed(1)} KB Loaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsing Validation Summary & Interactive Preview */}
              {parseSummary && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className={`p-3 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                      <span className="text-[10px] uppercase font-bold opacity-60 block">Total In Sheet</span>
                      <span className="text-lg font-black">{parseSummary.totalRows}</span>
                    </div>

                    <div className="p-3 rounded-2xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      <span className="text-[10px] uppercase font-bold opacity-80 block">Valid Rows</span>
                      <span className="text-lg font-black">{parseSummary.validRows}</span>
                    </div>

                    <div className="p-3 rounded-2xl border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                      <span className="text-[10px] uppercase font-bold opacity-80 block">Price/Data Updates</span>
                      <span className="text-lg font-black">{parseSummary.updatesCount}</span>
                    </div>

                    <div className="p-3 rounded-2xl border bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400">
                      <span className="text-[10px] uppercase font-bold opacity-80 block">New Packs</span>
                      <span className="text-lg font-black">{parseSummary.createsCount}</span>
                    </div>

                    <div className={`p-3 rounded-2xl border ${
                      parseSummary.invalidRows > 0
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        : isLight ? 'bg-gray-50 border-gray-200 text-gray-500' : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      <span className="text-[10px] uppercase font-bold opacity-80 block">Errors Found</span>
                      <span className="text-lg font-black">{parseSummary.invalidRows}</span>
                    </div>
                  </div>

                  {/* Filter Toolbar & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold mr-1">Filter View:</span>
                      {(['all', 'valid', 'update', 'create', 'invalid'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setPreviewFilter(filter)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            previewFilter === filter
                              ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                              : isLight
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                          }`}
                        >
                          {filter.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        Select All Valid ({parseSummary.validRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                          isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className={`border rounded-2xl overflow-hidden shadow-sm ${
                    isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
                  }`}>
                    <div className="overflow-x-auto max-h-[360px]">
                      <table className="w-full text-left text-xs">
                        <thead className={`font-semibold border-b sticky top-0 z-10 ${
                          isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-black text-gray-300 border-white/10'
                        }`}>
                          <tr>
                            <th className="p-3 w-10 text-center">
                              <span className="sr-only">Select</span>
                            </th>
                            <th className="p-3">Row #</th>
                            <th className="p-3">Action</th>
                            <th className="p-3">Operator</th>
                            <th className="p-3">Quality</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3">Plan Name</th>
                            <th className="p-3">Price & Changes</th>
                            <th className="p-3">Channels</th>
                            <th className="p-3">Validation Status</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
                          {displayRows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-xs opacity-60">
                                No rows matching the selected filter ({previewFilter}).
                              </td>
                            </tr>
                          ) : (
                            displayRows.map((row) => (
                              <tr 
                                key={`${row.rowNumber}-${row.id}`} 
                                className={`transition-colors ${
                                  !row.isValid 
                                    ? isLight ? 'bg-rose-50/50' : 'bg-rose-950/20'
                                    : row.selected 
                                    ? isLight ? 'bg-emerald-50/40' : 'bg-emerald-950/20'
                                    : isLight ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                                }`}
                              >
                                <td className="p-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={row.selected}
                                    disabled={!row.isValid}
                                    onChange={() => {
                                      const fullIdx = parseSummary.rows.findIndex((r) => r.rowNumber === row.rowNumber);
                                      if (fullIdx >= 0) handleToggleRow(fullIdx);
                                    }}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-0 disabled:opacity-30 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 font-mono font-bold opacity-75">
                                  #{row.rowNumber}
                                </td>
                                <td className="p-3">
                                  {!row.isValid ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                      ERROR
                                    </span>
                                  ) : row.action === 'update' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                      UPDATE
                                    </span>
                                  ) : row.action === 'create' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                      NEW
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30">
                                      NO CHANGE
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-semibold" style={{ color: currentTheme.primaryColor }}>
                                  {row.operatorName}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    row.pack_type === 'HD' ? 'bg-amber-500/15 text-amber-600' : 'bg-blue-500/15 text-blue-600'
                                  }`}>
                                    {row.pack_type}
                                  </span>
                                </td>
                                <td className="p-3 font-medium">
                                  {row.duration_months}M
                                </td>
                                <td className="p-3">
                                  <p className="font-bold">{row.plan_name}</p>
                                  <span className="text-[10px] font-mono opacity-60">{row.id}</span>
                                </td>
                                <td className="p-3">
                                  {row.diffs.some((d) => d.field === 'amount') ? (
                                    <div className="flex items-center gap-1 font-mono text-xs">
                                      <span className="line-through opacity-60 text-rose-500">
                                        {row.diffs.find((d) => d.field === 'amount')?.oldVal}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        ₹{row.amount}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-mono font-bold">₹{row.amount}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className="font-medium">{row.channel_list.length} channels</span>
                                </td>
                                <td className="p-3">
                                  {row.errors.length > 0 ? (
                                    <div className="space-y-0.5 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                                      {row.errors.map((err, i) => (
                                        <p key={i}>• {err}</p>
                                      ))}
                                    </div>
                                  ) : row.diffs.length > 0 ? (
                                    <div className="text-[11px] text-blue-600 dark:text-blue-300">
                                      {row.diffs.map((d, i) => (
                                        <span key={i} className="inline-block mr-2">
                                          {d.label}: {d.oldVal} → {d.newVal}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Ready
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Apply Action Bar */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'
                  }`}>
                    <div className="space-y-0.5 text-center sm:text-left">
                      <h4 className="font-bold text-xs text-emerald-700 dark:text-emerald-300">
                        {selectedValidCount} of {parseSummary.validRows} Valid Plans Ready to Synchronize
                      </h4>
                      <p className="text-[11px] opacity-80">
                        Clicking confirm will write records to Firestore and update all customer-facing recharge cards.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={importing || selectedValidCount === 0}
                      onClick={handleApplyImport}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all disabled:opacity-40"
                      style={{ backgroundColor: currentTheme.primaryColor }}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Applying Updates to Database...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Import & Apply {selectedValidCount} Selected Plans</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: EXPORT & TEMPLATES */}
          {/* ======================================================== */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Export Current Live Records */}
                <div className={`p-6 rounded-3xl border space-y-4 shadow-sm ${
                  isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                      <FileDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Export Active Pack Records</h3>
                      <p className={`text-xs ${currentTheme.subText}`}>
                        Download live packages from your catalog with IDs & prices.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Select Operator Scope
                      </label>
                      <select
                        value={exportOp}
                        onChange={(e) => setExportOp(e.target.value as any)}
                        className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                          isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/40 border-white/20'
                        }`}
                      >
                        <option value="all">All Operators ({plans.length} total packs)</option>
                        <option value="sun_direct">Sun Direct ({plans.filter(p => p.operator === 'sun_direct').length} packs)</option>
                        <option value="tata_play">Tata Play ({plans.filter(p => p.operator === 'tata_play').length} packs)</option>
                        <option value="airtel_dth">Airtel Digital TV ({plans.filter(p => p.operator === 'airtel_dth').length} packs)</option>
                        <option value="dish_tv">Dish TV ({plans.filter(p => p.operator === 'dish_tv').length} packs)</option>
                        <option value="d2h">D2H Videocon ({plans.filter(p => p.operator === 'd2h').length} packs)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTriggerExport}
                      className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .xlsx Spreadsheet with Current Packs</span>
                    </button>
                  </div>
                </div>

                {/* 2. Download Clean Blank Template */}
                <div className={`p-6 rounded-3xl border space-y-4 shadow-sm ${
                  isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Download Blank Excel Template</h3>
                      <p className={`text-xs ${currentTheme.subText}`}>
                        Pre-formatted template with standard headers & example rows.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed opacity-85">
                    Ideal if you want to prepare a fresh price sheet or bulk add new packs without overwriting existing data. Contains field validation rules and instruction sheets.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="w-full py-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Blank Template (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Workflow Banner */}
              <div className={`p-5 rounded-3xl border space-y-3 ${
                isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.02] border-white/10'
              }`}>
                <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                  <span>3-Step Excel Update Workflow</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-2xl border bg-black/5 dark:bg-white/5 space-y-1">
                    <span className="font-bold text-blue-500">Step 1: Export</span>
                    <p className="opacity-80 text-[11px]">
                      Download current pack records or the template spreadsheet.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl border bg-black/5 dark:bg-white/5 space-y-1">
                    <span className="font-bold text-purple-500">Step 2: Edit & Review</span>
                    <p className="opacity-80 text-[11px]">
                      Update prices (e.g. ₹299 to ₹319) or add new packs in Excel / Numbers / Sheets.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl border bg-black/5 dark:bg-white/5 space-y-1">
                    <span className="font-bold text-emerald-500">Step 3: Re-upload</span>
                    <p className="opacity-80 text-[11px]">
                      Upload the modified file to preview diffs and apply changes with 1-click.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FORMAT & INSTRUCTIONS */}
          {/* ======================================================== */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className={`p-5 rounded-3xl border space-y-3 ${
                isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'
              }`}>
                <h3 className="font-bold text-sm">Supported Excel Headers and Rules</h3>
                <p className="opacity-80 leading-relaxed">
                  The spreadsheet parser is case-insensitive and tolerant of slight header differences. Below is the standard schema:
                </p>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-700' : 'bg-black/40 text-gray-300'}`}>
                      <tr>
                        <th className="p-2.5">Header Name</th>
                        <th className="p-2.5">Accepted Aliases</th>
                        <th className="p-2.5">Allowed Values / Example</th>
                        <th className="p-2.5">Required?</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Plan ID</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">id, plan_id, pack_id</td>
                        <td className="p-2.5 font-mono text-[11px]">sun_hd_1m_rec</td>
                        <td className="p-2.5 text-gray-500">Optional (Auto-generated if blank)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Operator Code</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">operator, operator_name</td>
                        <td className="p-2.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          sun_direct, tata_play, airtel_dth, dish_tv, d2h
                        </td>
                        <td className="p-2.5 text-emerald-600 font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Pack Quality</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">pack_type, quality, type</td>
                        <td className="p-2.5 font-mono text-[11px]">HD or SD</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Duration (Months)</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">duration, months</td>
                        <td className="p-2.5 font-mono text-[11px]">1, 6, or 12</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Plan Name</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">name, pack_name</td>
                        <td className="p-2.5">Sun Direct Prime HD</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Price (INR)</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">amount, price, cost</td>
                        <td className="p-2.5 font-mono text-[11px]">299, 1650, 3100</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Is Recommended</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">recommended, is_featured</td>
                        <td className="p-2.5 font-mono text-[11px]">TRUE or FALSE</td>
                        <td className="p-2.5 text-gray-500">Optional (Defaults to FALSE)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono font-bold">Channels List</td>
                        <td className="p-2.5 font-mono text-[11px] opacity-75">channels, channel_list</td>
                        <td className="p-2.5">Sun TV HD, KTV HD, Sun Music HD</td>
                        <td className="p-2.5 text-gray-500">Optional (Comma separated)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 sm:p-5 border-t flex items-center justify-between gap-3 ${
          isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/40 border-white/10'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Get Blank Template</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
