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
} from '../lib/icons';
import { PlanCatalogItem, DthOperatorId, UserProfile, Language, isSameDthOperatorGroup } from '../types';
import { OperatorTheme } from '../lib/theme';
import {
  exportPlansToExcel,
  downloadPlanTemplateExcel,
  parseAndValidatePlanExcel,
  applyImportedPlans,
  PlanImportRow,
  PlanValidationSummary,
  OPERATOR_DISPLAY_NAMES,
  MAX_FILE_SIZE_BYTES
} from '../lib/excelPlanService';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface ExcelPlanImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: PlanCatalogItem[];
  currentTheme: OperatorTheme;
  currentLang?: Language;
  user: UserProfile | null;
  onPlansUpdated: (newPlans: PlanCatalogItem[]) => void;
  defaultTab?: 'import' | 'export';
}

export const ExcelPlanImportExportModal: React.FC<ExcelPlanImportExportModalProps> = ({
  isOpen,
  onClose,
  plans,
  currentTheme,
  currentLang = 'en',
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

  const { modalRef } = useAccessibleModal({ isOpen, onClose });

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

    // Enforce 10MB limit strictly
    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (uploadedFile.size / (1024 * 1024)).toFixed(1);
      setGeneralError(`File size (${sizeMb} MB) exceeds maximum permitted limit of 10 MB.`);
      setFile(null);
      setParseSummary(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
  const handleTriggerExport = async () => {
    try {
      const filename = exportOp === 'all'
        ? `dth_tamizhan_all_packs_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `dth_tamizhan_${exportOp}_packs_${new Date().toISOString().slice(0, 10)}.xlsx`;

      await exportPlansToExcel(plans, filename, exportOp);
      setExportSuccessMsg(`Successfully exported ${exportOp === 'all' ? 'all' : OPERATOR_DISPLAY_NAMES[exportOp]} packs to "${filename}".`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      setGeneralError(err.message || 'Export failed.');
    }
  };

  // Handle Download Blank Template
  const handleDownloadTemplate = async () => {
    try {
      await downloadPlanTemplateExcel();
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
    <div
      className="dialog-backdrop fixed inset-0 z-50 bg-paper-2 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="excel-modal-title"
        className={`hm-dialog w-full max-w-5xl rounded-xl border shadow-lg my-auto overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] ${
          isLight ? 'bg-paper border-rule text-ink' : 'bg-paper-2 border-rule text-ink'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
          isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule'
        }`}>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm border"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--color-accent) 10%, transparent)',
                borderColor: 'color-mix(in oklab, var(--color-accent) 25%, transparent)',
                color: currentTheme.primaryColor,
              }}
            >
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="excel-modal-title" className="font-serif-royal font-bold text-lg sm:text-xl">
                  Excel Pack Synchronization & Management
                </h2>
                <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-input text-sm font-medium tabular-nums bg-success/10 text-success border border-rule">
                  .xlsx / .csv
                </span>
              </div>
              <p className={`text-sm mt-0.5 ${currentTheme.subText}`}>
                Export current live pack records to Excel for template reference, edit prices/names, and re-upload to update in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            aria-label={currentLang === 'ta' ? 'மூடு' : 'Close'}
            className={`p-2 rounded-xl transition-colors border ${
              isLight ? 'bg-paper hover:bg-paper-2 text-muted border-rule' : 'bg-paper hover:bg-paper text-muted border-rule'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-6 pt-3 border-b flex items-center justify-between gap-2 overflow-x-auto ${
          isLight ? 'bg-paper-2 border-rule' : 'bg-paper-2 border-rule'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={activeTab === 'import'}
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import packs</span>
            </button>

            <button
              type="button"
              aria-pressed={activeTab === 'export'}
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export records</span>
            </button>

            <button
              type="button"
              aria-pressed={activeTab === 'guide'}
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'guide'
                  ? 'border-accent text-accent bg-accent-soft'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Format guide</span>
            </button>
          </div>

          <span className={`text-sm tabular-nums hidden md:inline ${currentTheme.subText}`}>
            {plans.length} Live Catalog Packs Active
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Global Notifications */}
          {exportSuccessMsg && (
            <div className="p-3.5 rounded-lg bg-success/10 border border-rule text-success text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {importSuccessResult && (
            <div className="p-4 rounded-lg bg-success/10 border border-rule text-success space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Successfully Applied {importSuccessResult.count} Pack Updates!</span>
              </div>
              <p className="text-sm opacity-90">
                The updated packs, pricing, durations, and channels are now live in the Firestore catalog and immediately visible in the customer recharge flow and admin panels.
              </p>
              <div className="pt-1 flex gap-2">
                <button
                  onClick={() => setImportSuccessResult(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-success text-ink font-bold text-sm hover:bg-success"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="dialog-primary px-3.5 py-1.5 rounded-lg border border-rule font-bold text-sm hover:bg-success/10"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}

          {generalError && (
            <div className="p-3.5 rounded-lg bg-error/10 border border-rule text-error text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
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
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                  isLight
                    ? 'border-rule bg-paper-2 hover:bg-paper-2 hover:border-rule'
                    : 'border-rule bg-paper-2 hover:bg-paper-2 hover:border-rule'
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
                    className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto border"
                    style={{
                      backgroundColor: 'color-mix(in oklab, var(--color-accent) 8%, transparent)',
                      borderColor: 'color-mix(in oklab, var(--color-accent) 20%, transparent)',
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
                    <p className={`text-sm mt-1 ${currentTheme.subText}`}>
                      Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv). Max 10MB.
                    </p>
                  </div>

                  {file && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent text-sm tabular-nums font-medium">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>{(file.size / 1024).toFixed(1)} KB Loaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsing Validation Summary & Interactive Preview */}
              {parseSummary && (
                <div className="space-y-4">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className={`p-3 rounded-lg border ${isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule'}`}>
                      <span className="text-sm font-bold text-muted block">Total In Sheet</span>
                      <span className="text-lg font-bold">{parseSummary.totalRows}</span>
                    </div>

                    <div className="p-3 rounded-lg border bg-success/10 border-rule text-success">
                      <span className="text-sm font-bold opacity-90 block">Valid Rows</span>
                      <span className="text-lg font-bold">{parseSummary.validRows}</span>
                    </div>

                    <div className="p-3 rounded-lg border bg-accent-soft border-rule text-accent">
                      <span className="text-sm font-bold opacity-90 block">Price/Data Updates</span>
                      <span className="text-lg font-bold">{parseSummary.updatesCount}</span>
                    </div>

                    <div className="p-3 rounded-lg border bg-accent-soft border-rule text-accent">
                      <span className="text-sm font-bold opacity-90 block">New Packs</span>
                      <span className="text-lg font-bold">{parseSummary.createsCount}</span>
                    </div>

                    <div className={`p-3 rounded-lg border ${
                      parseSummary.invalidRows > 0
                        ? 'bg-error/10 border-rule text-error '
                        : isLight ? 'bg-paper-2 border-rule text-muted' : 'bg-paper border-rule text-muted'
                    }`}>
                      <span className="text-sm font-bold opacity-90 block">Errors Found</span>
                      <span className="text-lg font-bold">{parseSummary.invalidRows}</span>
                    </div>
                  </div>

                  {/* Filter Toolbar & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium mr-1">Filter View:</span>
                      {(['all', 'valid', 'update', 'create', 'invalid'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setPreviewFilter(filter)}
                          className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-colors border ${
                            previewFilter === filter
                              ? 'bg-paper-2 text-ink   border-transparent shadow-xs'
                              : isLight
                              ? 'bg-paper-2 hover:bg-paper-2 text-muted border-rule'
                              : 'bg-paper hover:bg-paper text-muted border-rule'
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
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                          isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper hover:bg-paper text-ink'
                        }`}
                      >
                        Select All Valid ({parseSummary.validRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(false)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${
                          isLight ? 'bg-paper-2 hover:bg-paper-2 text-ink' : 'bg-paper hover:bg-paper text-ink'
                        }`}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className={`border rounded-lg overflow-hidden shadow-sm ${
                    isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
                  }`}>
                    <div className="overflow-x-auto max-h-[360px]">
                      <table className="w-full text-left text-sm">
                        <thead className={`font-medium border-b sticky top-0 z-10 ${
                          isLight ? 'bg-paper-2 text-muted border-rule' : 'bg-paper-2 text-muted border-rule'
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
                        <tbody className={`divide-y ${isLight ? 'divide-rule' : 'divide-rule'}`}>
                          {displayRows.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-sm opacity-60">
                                No rows matching the selected filter ({previewFilter}).
                              </td>
                            </tr>
                          ) : (
                            displayRows.map((row) => (
                              <tr
                                key={`${row.rowNumber}-${row.id}`}
                                className={`transition-colors ${
                                  !row.isValid
                                    ? isLight ? 'bg-error/10' : 'bg-error/10'
                                    : row.selected
                                    ? isLight ? 'bg-success/10' : 'bg-success'
                                    : isLight ? 'hover:bg-paper-2' : 'hover:bg-paper'
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
                                    className="w-4 h-4 rounded text-success focus:ring-0 disabled:opacity-30 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 tabular-nums font-bold opacity-75">
                                  #{row.rowNumber}
                                </td>
                                <td className="p-3">
                                  {!row.isValid ? (
                                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-error/10 text-error border border-rule">
                                      ERROR
                                    </span>
                                  ) : row.action === 'update' ? (
                                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-accent-soft text-accent border border-rule">
                                      UPDATE
                                    </span>
                                  ) : row.action === 'create' ? (
                                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-accent-soft text-accent border border-rule">
                                      NEW
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-paper-2 text-muted border border-rule">
                                      NO CHANGE
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-medium" style={{ color: currentTheme.primaryColor }}>
                                  {row.operatorName}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-sm font-bold  ${
                                    row.pack_type === 'HD' ? 'bg-accent-soft text-accent' : 'bg-accent-soft text-accent'
                                  }`}>
                                    {row.pack_type}
                                  </span>
                                </td>
                                <td className="p-3 font-medium">
                                  {row.duration_months}M
                                </td>
                                <td className="p-3">
                                  <p className="font-bold">{row.plan_name}</p>
                                  <span className="text-sm tabular-nums opacity-60">{row.id}</span>
                                </td>
                                <td className="p-3">
                                  {row.diffs.some((d) => d.field === 'amount') ? (
                                    <div className="flex items-center gap-1 tabular-nums text-sm">
                                      <span className="line-through opacity-60 text-error">
                                        {row.diffs.find((d) => d.field === 'amount')?.oldVal}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-success" />
                                      <span className="font-bold text-success">
                                        Rs. {row.amount}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="tabular-nums font-bold">Rs. {row.amount}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className="font-medium">{row.channel_list.length} channels</span>
                                </td>
                                <td className="p-3">
                                  {row.errors.length > 0 ? (
                                    <div className="space-y-0.5 text-error font-medium text-sm">
                                      {row.errors.map((err, i) => (
                                        <p key={i}>• {err}</p>
                                      ))}
                                    </div>
                                  ) : row.diffs.length > 0 ? (
                                    <div className="text-sm text-accent">
                                      {row.diffs.map((d, i) => (
                                        <span key={i} className="inline-block mr-2">
                                          {d.label}: {d.oldVal} → {d.newVal}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-success font-medium flex items-center gap-1">
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
                  <div className={`p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    isLight ? 'bg-success/10 border-rule' : 'bg-success border-rule'
                  }`}>
                    <div className="space-y-0.5 text-center sm:text-left">
                      <h4 className="font-bold text-sm text-success">
                        {selectedValidCount} of {parseSummary.validRows} Valid Plans Ready to Synchronize
                      </h4>
                      <p className="text-sm opacity-80">
                        Clicking confirm will write records to Firestore and update all customer-facing recharge cards.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={importing || selectedValidCount === 0}
                      aria-busy={importing}
                      onClick={handleApplyImport}
                      className="dialog-primary whitespace-nowrap w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-ink shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-colors disabled:opacity-40"
                      style={{ backgroundColor: currentTheme.primaryColor }}
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Applying…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Apply packs ({selectedValidCount})</span>
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
                <div className={`p-6 rounded-xl border space-y-4 shadow-sm ${
                  isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent-soft text-accent">
                      <FileDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Export Active Pack Records</h3>
                      <p className={`text-sm ${currentTheme.subText}`}>
                        Download live packages from your catalog with IDs & prices.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label htmlFor="excelplanimportexportmodal-field-1" className="text-sm font-medium block mb-1">
                        Select Operator Scope
                      </label>
                      <select id="excelplanimportexportmodal-field-1"
                        value={exportOp}
                        onChange={(e) => setExportOp(e.target.value as any)}
                        className={`w-full px-3 py-2 rounded-xl text-sm border font-medium focus:outline-none ${
                          isLight ? 'bg-paper-2 border-rule' : 'bg-paper-2 border-rule'
                        }`}
                      >
                        <option value="all">All Operators ({plans.length} total packs)</option>
                        <option value="sun_direct">Sun Direct ({plans.filter(p => p.operator === 'sun_direct').length} packs)</option>
                        <option value="tata_play">Tata Play ({plans.filter(p => p.operator === 'tata_play').length} packs)</option>
                        <option value="airtel_dth">Airtel Digital TV ({plans.filter(p => p.operator === 'airtel_dth').length} packs)</option>
                        <option value="dish_tv">Dish TV &amp; D2H ({plans.filter(p => isSameDthOperatorGroup(p.operator, 'dish_tv')).length} packs)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTriggerExport}
                      className="dialog-primary w-full py-3 rounded-xl text-sm font-bold bg-accent hover:bg-accent text-ink shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download spreadsheet</span>
                    </button>
                  </div>
                </div>

                {/* 2. Download Clean Blank Template */}
                <div className={`p-6 rounded-xl border space-y-4 shadow-sm ${
                  isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-accent-soft text-accent">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Download Blank Excel Template</h3>
                      <p className={`text-sm ${currentTheme.subText}`}>
                        Pre-formatted template with standard headers & example rows.
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed opacity-85">
                    Ideal if you want to prepare a fresh price sheet or bulk add new packs without overwriting existing data. Contains field validation rules and instruction sheets.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="dialog-primary w-full py-3 rounded-xl text-sm font-bold bg-accent hover:bg-accent text-ink shadow-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download blank template</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Workflow Banner */}
              <div className={`p-5 rounded-xl border space-y-3 ${
                isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule'
              }`}>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                  <span>3-Step Excel Update Workflow</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg border bg-paper-2 space-y-1">
                    <span className="font-bold text-accent">Step 1: Export</span>
                    <p className="opacity-80 text-sm">
                      Download current pack records or the template spreadsheet.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-paper-2 space-y-1">
                    <span className="font-bold text-accent">Step 2: Edit & Review</span>
                    <p className="opacity-80 text-sm">
                      Update prices (e.g. Rs. 299 to Rs. 319) or add new packs in Excel / Numbers / Sheets.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-paper-2 space-y-1">
                    <span className="font-bold text-success">Step 3: Re-upload</span>
                    <p className="opacity-80 text-sm">
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
            <div className="space-y-4 text-sm">
              <div className={`p-5 rounded-xl border space-y-3 ${
                isLight ? 'bg-paper border-rule' : 'bg-paper-2 border-rule'
              }`}>
                <h3 className="font-bold text-sm">Supported Excel Headers and Rules</h3>
                <p className="opacity-80 leading-relaxed">
                  The spreadsheet parser is case-insensitive and tolerant of slight header differences. Below is the standard schema:
                </p>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-sm">
                    <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted' : 'bg-paper-2 text-muted'}`}>
                      <tr>
                        <th className="p-2.5">Header Name</th>
                        <th className="p-2.5">Accepted Aliases</th>
                        <th className="p-2.5">Allowed Values / Example</th>
                        <th className="p-2.5">Required?</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-rule' : 'divide-rule'}`}>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Plan ID</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">id, plan_id, pack_id</td>
                        <td className="p-2.5 tabular-nums text-sm">sun_hd_1m_rec</td>
                        <td className="p-2.5 text-muted">Optional (Auto-generated if blank)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Operator Code</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">operator, operator_name</td>
                        <td className="p-2.5 tabular-nums text-sm text-success">
                          sun_direct, tata_play, airtel_dth, dish_tv, d2h
                        </td>
                        <td className="p-2.5 text-success font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Pack Quality</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">pack_type, quality, type</td>
                        <td className="p-2.5 tabular-nums text-sm">HD or SD</td>
                        <td className="p-2.5 text-success font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Duration (Months)</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">duration, months</td>
                        <td className="p-2.5 tabular-nums text-sm">1, 3, 6, or 12</td>
                        <td className="p-2.5 text-success font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Plan Name</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">name, pack_name</td>
                        <td className="p-2.5">Sun Direct Prime HD</td>
                        <td className="p-2.5 text-success font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Price (Rs.)</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">amount, price, cost</td>
                        <td className="p-2.5 tabular-nums text-sm">299, 1650, 3100</td>
                        <td className="p-2.5 text-success font-bold">Mandatory</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Is Recommended</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">recommended, is_featured</td>
                        <td className="p-2.5 tabular-nums text-sm">TRUE or FALSE</td>
                        <td className="p-2.5 text-muted">Optional (Defaults to FALSE)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 tabular-nums font-bold">Channels List</td>
                        <td className="p-2.5 tabular-nums text-sm opacity-75">channels, channel_list</td>
                        <td className="p-2.5">Sun TV HD, KTV HD, Sun Music HD</td>
                        <td className="p-2.5 text-muted">Optional (Comma separated)</td>
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
          isLight ? 'bg-paper-2 border-rule' : 'bg-paper-2 border-rule'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border flex items-center gap-1.5 transition-colors ${
                isLight ? 'bg-paper hover:bg-paper-2 text-muted border-rule' : 'bg-paper hover:bg-paper text-muted border-rule'
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
              className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                isLight ? 'bg-paper-2 hover:bg-paper-2 text-muted border-rule' : 'bg-paper hover:bg-paper text-ink border-rule'
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
