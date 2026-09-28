import * as XLSX from 'xlsx';
import { PlanCatalogItem, DthOperatorId } from '../types';
import { PlanCatalogService } from './planCatalogService';

export interface PlanImportRow {
  rowNumber: number;
  id: string;
  operator: DthOperatorId;
  operatorName: string;
  pack_type: 'HD' | 'SD';
  duration_months: 1 | 6 | 12;
  plan_name: string;
  amount: number;
  is_recommended: boolean;
  channel_list: string[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
  action: 'create' | 'update' | 'no_change';
  originalPlan?: PlanCatalogItem;
  diffs: {
    field: string;
    label: string;
    oldVal: any;
    newVal: any;
  }[];
  selected: boolean;
}

export interface PlanValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createsCount: number;
  updatesCount: number;
  noChangeCount: number;
  rows: PlanImportRow[];
}

export const VALID_OPERATORS: Record<string, DthOperatorId> = {
  sun_direct: 'sun_direct',
  sundirect: 'sun_direct',
  'sun direct': 'sun_direct',
  'sun': 'sun_direct',
  tata_play: 'tata_play',
  tataplay: 'tata_play',
  'tata play': 'tata_play',
  'tata sky': 'tata_play',
  'tata': 'tata_play',
  airtel_dth: 'airtel_dth',
  airteldth: 'airtel_dth',
  'airtel digital tv': 'airtel_dth',
  'airtel': 'airtel_dth',
  dish_tv: 'dish_tv',
  dishtv: 'dish_tv',
  'dish tv': 'dish_tv',
  'dish': 'dish_tv',
  d2h: 'd2h',
  videocon_d2h: 'd2h',
  'videocon d2h': 'd2h',
};

export const OPERATOR_DISPLAY_NAMES: Record<DthOperatorId, string> = {
  sun_direct: 'Sun Direct',
  tata_play: 'Tata Play',
  airtel_dth: 'Airtel Digital TV',
  dish_tv: 'Dish TV',
  d2h: 'D2H',
};

/**
 * Clean and normalize column key
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Normalizes operator input
 */
export function normalizeOperator(raw: any): DthOperatorId | null {
  if (!raw) return null;
  const str = String(raw).trim().toLowerCase();
  if (VALID_OPERATORS[str]) return VALID_OPERATORS[str];
  const cleaned = str.replace(/[^a-z0-9]/g, '');
  if (VALID_OPERATORS[cleaned]) return VALID_OPERATORS[cleaned];
  return null;
}

/**
 * Parses boolean string or value
 */
export function normalizeBoolean(raw: any): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (!raw) return false;
  const str = String(raw).trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'recommended', 'featured'].includes(str);
}

/**
 * Parses duration
 */
export function normalizeDuration(raw: any): 1 | 6 | 12 | null {
  if (typeof raw === 'number') {
    if (raw === 1 || raw === 6 || raw === 12) return raw;
  }
  if (!raw) return null;
  const match = String(raw).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num === 1 || num === 6 || num === 12) return num as 1 | 6 | 12;
  }
  return null;
}

/**
 * Parses pack quality
 */
export function normalizePackType(raw: any): 'HD' | 'SD' | null {
  if (!raw) return null;
  const str = String(raw).trim().toUpperCase();
  if (str.includes('HD')) return 'HD';
  if (str.includes('SD')) return 'SD';
  return null;
}

/**
 * Export current plans to an Excel file (.xlsx)
 */
export function exportPlansToExcel(
  plans: PlanCatalogItem[],
  filename = 'dth_tamizhan_packs_catalog.xlsx',
  operatorFilter?: DthOperatorId | 'all'
) {
  const filtered = (operatorFilter && operatorFilter !== 'all')
    ? plans.filter((p) => p.operator === operatorFilter)
    : plans;

  const dataRows = filtered.map((p) => ({
    'Plan ID': p.id,
    'Operator Code': p.operator,
    'Operator Name': OPERATOR_DISPLAY_NAMES[p.operator] || p.operator,
    'Pack Quality (HD/SD)': p.pack_type,
    'Duration (Months)': p.duration_months,
    'Plan Name': p.plan_name,
    'Price (INR)': p.amount,
    'Is Recommended (TRUE/FALSE)': p.is_recommended ? 'TRUE' : 'FALSE',
    'Channels List (Comma Separated)': p.channel_list.join(', '),
    'Channels Count': p.channel_list.length,
    'Last Updated (ISO)': p.updated_at,
    'Updated By': p.updated_by,
  }));

  const wb = XLSX.utils.book_new();

  // 1. Main Packs Sheet
  const wsPacks = XLSX.utils.json_to_sheet(dataRows);
  // Set column widths
  wsPacks['!cols'] = [
    { wch: 22 }, // Plan ID
    { wch: 16 }, // Operator Code
    { wch: 20 }, // Operator Name
    { wch: 18 }, // Pack Quality
    { wch: 18 }, // Duration
    { wch: 38 }, // Plan Name
    { wch: 14 }, // Price
    { wch: 22 }, // Is Recommended
    { wch: 65 }, // Channels List
    { wch: 16 }, // Channels Count
    { wch: 24 }, // Last Updated
    { wch: 24 }, // Updated By
  ];
  XLSX.utils.book_append_sheet(wb, wsPacks, 'DTH Packs');

  // 2. Instructions Sheet
  const instructions = [
    { 'Section': 'Overview', 'Guide': 'This Excel sheet allows you to batch update and create DTH recharge packs.' },
    { 'Section': 'Re-uploading', 'Guide': 'You can edit the rows directly in this file or delete/add rows, then re-upload via the "Import Excel" button.' },
    { 'Section': 'Operator Code', 'Guide': 'Must be one of: sun_direct, tata_play, airtel_dth, dish_tv, d2h' },
    { 'Section': 'Pack Quality', 'Guide': 'Must be HD or SD' },
    { 'Section': 'Duration (Months)', 'Guide': 'Must be 1, 6, or 12' },
    { 'Section': 'Price (INR)', 'Guide': 'Must be a positive number (e.g. 299, 1650, 3100)' },
    { 'Section': 'Is Recommended', 'Guide': 'TRUE for featured 2-card homepage hero pack, FALSE for standard pack' },
    { 'Section': 'Channels List', 'Guide': 'Comma-separated channel names (e.g. "Sun TV HD, KTV HD, Star Vijay HD")' },
    { 'Section': 'Plan ID', 'Guide': 'Leave untouched to update existing plan. Leave blank or enter a new unique string to create a new plan.' },
  ];
  const wsInfo = XLSX.utils.json_to_sheet(instructions);
  wsInfo['!cols'] = [{ wch: 24 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions & Valid Values');

  XLSX.writeFile(wb, filename);
}

/**
 * Download a pristine template with sample rows for all operators
 */
export function downloadPlanTemplateExcel() {
  const sampleRows = [
    {
      'Plan ID': 'sun_hd_1m_rec',
      'Operator Code': 'sun_direct',
      'Operator Name': 'Sun Direct',
      'Pack Quality (HD/SD)': 'HD',
      'Duration (Months)': 1,
      'Plan Name': 'Sun Direct Prime HD',
      'Price (INR)': 299,
      'Is Recommended (TRUE/FALSE)': 'TRUE',
      'Channels List (Comma Separated)': 'Sun TV HD, KTV HD, Sun Music HD, Star Vijay HD, Zee Tamil HD, Jaya TV HD, Colors Tamil HD, Star Sports 1 Tamil HD',
    },
    {
      'Plan ID': 'sun_hd_6m_rec',
      'Operator Code': 'sun_direct',
      'Operator Name': 'Sun Direct',
      'Pack Quality (HD/SD)': 'HD',
      'Duration (Months)': 6,
      'Plan Name': 'Sun Direct Prime HD (6 Months Saver)',
      'Price (INR)': 1650,
      'Is Recommended (TRUE/FALSE)': 'TRUE',
      'Channels List (Comma Separated)': 'Sun TV HD, KTV HD, Sun Music HD, Star Vijay HD, Zee Tamil HD, Jaya TV HD, Colors Tamil HD, Star Sports 1 Tamil HD',
    },
    {
      'Plan ID': 'tata_hd_1m_rec',
      'Operator Code': 'tata_play',
      'Operator Name': 'Tata Play',
      'Pack Quality (HD/SD)': 'HD',
      'Duration (Months)': 1,
      'Plan Name': 'Tata Play Tamil Thalaiva HD',
      'Price (INR)': 360,
      'Is Recommended (TRUE/FALSE)': 'TRUE',
      'Channels List (Comma Separated)': 'Star Vijay HD, Sun TV HD, KTV HD, Zee Tamil HD, Colors Tamil HD, Jaya TV HD, Star Sports 1 Tamil HD',
    },
    {
      'Plan ID': 'airtel_sd_1m_rec',
      'Operator Code': 'airtel_dth',
      'Operator Name': 'Airtel Digital TV',
      'Pack Quality (HD/SD)': 'SD',
      'Duration (Months)': 1,
      'Plan Name': 'Airtel Tamil Value Pack',
      'Price (INR)': 215,
      'Is Recommended (TRUE/FALSE)': 'TRUE',
      'Channels List (Comma Separated)': 'Sun TV, Star Vijay, KTV, Zee Tamil, Colors Tamil, Star Sports 1 Tamil, Discovery Tamil',
    },
    {
      'Plan ID': '',
      'Operator Code': 'dish_tv',
      'Operator Name': 'Dish TV',
      'Pack Quality (HD/SD)': 'HD',
      'Duration (Months)': 12,
      'Plan Name': 'Dish TV Tamil Royal HD (Annual)',
      'Price (INR)': 3120,
      'Is Recommended (TRUE/FALSE)': 'TRUE',
      'Channels List (Comma Separated)': 'Sun TV HD, Star Vijay HD, KTV HD, Zee Tamil HD, Star Sports 1 Tamil HD, Sun Music HD',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 38 },
    { wch: 14 },
    { wch: 24 },
    { wch: 70 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Packs Template');

  const instructions = [
    { 'Field': 'Plan ID', 'Required': 'Optional', 'Description': 'Leave blank to generate an automatic ID for a new pack, or enter existing ID to update it.' },
    { 'Field': 'Operator Code', 'Required': 'Mandatory', 'Description': 'Must be one of: sun_direct, tata_play, airtel_dth, dish_tv, d2h' },
    { 'Field': 'Pack Quality', 'Required': 'Mandatory', 'Description': 'Must be either HD or SD' },
    { 'Field': 'Duration (Months)', 'Required': 'Mandatory', 'Description': 'Must be 1, 6, or 12' },
    { 'Field': 'Plan Name', 'Required': 'Mandatory', 'Description': 'Readable name of the recharge bouquet' },
    { 'Field': 'Price (INR)', 'Required': 'Mandatory', 'Description': 'Positive price amount in rupees (e.g. 299)' },
    { 'Field': 'Is Recommended', 'Required': 'Optional', 'Description': 'TRUE or FALSE. Recommended packs appear in high priority cards.' },
    { 'Field': 'Channels List', 'Required': 'Optional', 'Description': 'Comma-separated channel list e.g. "Sun TV HD, Star Vijay HD"' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(instructions);
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Field Guidelines');

  XLSX.writeFile(wb, 'dth_packs_import_template.xlsx');
}

/**
 * Parse an uploaded Excel/CSV file and validate rows against existing catalog
 */
export async function parseAndValidatePlanExcel(
  file: File | ArrayBuffer,
  currentPlans: PlanCatalogItem[]
): Promise<PlanValidationSummary> {
  let arrayBuffer: ArrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }

  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('The uploaded spreadsheet contains no sheets.');
  }

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded sheet contains no data rows.');
  }

  const parsedRows: PlanImportRow[] = [];
  const existingPlansMap = new Map<string, PlanCatalogItem>();
  currentPlans.forEach((p) => existingPlansMap.set(p.id, p));

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // 1-indexed plus header row
    const errors: string[] = [];
    const warnings: string[] = [];

    // Map keys dynamically
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalizedRow[normalizeKey(k)] = row[k];
    });

    // 1. ID resolution
    const rawId = normalizedRow['plan_id'] || normalizedRow['id'] || normalizedRow['pack_id'] || '';
    let planId = String(rawId).trim();

    // 2. Operator validation
    const rawOp = normalizedRow['operator_code'] || normalizedRow['operator'] || normalizedRow['operator_name'] || normalizedRow['dth_operator'] || '';
    const operator = normalizeOperator(rawOp);
    if (!operator) {
      errors.push(`Invalid Operator "${rawOp}". Valid codes: sun_direct, tata_play, airtel_dth, dish_tv, d2h`);
    }

    // 3. Quality (HD / SD)
    const rawQuality = normalizedRow['pack_quality_hd_sd'] || normalizedRow['pack_quality'] || normalizedRow['pack_type'] || normalizedRow['quality'] || normalizedRow['type'] || '';
    const pack_type = normalizePackType(rawQuality);
    if (!pack_type) {
      errors.push(`Invalid Pack Quality "${rawQuality}". Must be HD or SD`);
    }

    // 4. Duration
    const rawDur = normalizedRow['duration_months'] || normalizedRow['duration'] || normalizedRow['validity'] || normalizedRow['months'] || '';
    const duration_months = normalizeDuration(rawDur);
    if (!duration_months) {
      errors.push(`Invalid Duration "${rawDur}". Supported durations: 1, 6, or 12 months`);
    }

    // 5. Plan Name
    const plan_name = String(normalizedRow['plan_name'] || normalizedRow['name'] || normalizedRow['pack_name'] || '').trim();
    if (!plan_name) {
      errors.push('Plan Name is required.');
    }

    // 6. Price / Amount
    const rawAmount = normalizedRow['price_inr'] || normalizedRow['price'] || normalizedRow['amount'] || normalizedRow['cost'] || '';
    const cleanAmountStr = String(rawAmount).replace(/[^0-9.]/g, '');
    const amount = parseFloat(cleanAmountStr);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Invalid Price Amount "${rawAmount}". Must be a positive number greater than ₹0.`);
    }

    // 7. Is Recommended
    const rawRec = normalizedRow['is_recommended_true_false'] || normalizedRow['is_recommended'] || normalizedRow['recommended'] || normalizedRow['is_featured'] || '';
    const is_recommended = normalizeBoolean(rawRec);

    // 8. Channels List
    const rawChannels = normalizedRow['channels_list_comma_separated'] || normalizedRow['channels_list'] || normalizedRow['channel_list'] || normalizedRow['channels'] || '';
    let channel_list: string[] = [];
    if (Array.isArray(rawChannels)) {
      channel_list = rawChannels.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof rawChannels === 'string' && rawChannels.trim()) {
      channel_list = rawChannels.split(/[,;\n\r]+/).map((c) => c.trim()).filter(Boolean);
    }

    if (channel_list.length === 0) {
      warnings.push('No channels specified for this pack (default channels will be used if left empty).');
    }

    const opSafe = operator || 'sun_direct';
    const typeSafe = pack_type || 'HD';
    const durSafe = duration_months || 1;

    // Generate ID if empty
    if (!planId) {
      planId = `${opSafe}_${typeSafe.toLowerCase()}_${durSafe}m_${Math.random().toString(36).slice(2, 6)}`;
    }

    // Check if updating existing plan
    let originalPlan = existingPlansMap.get(planId);
    if (!originalPlan) {
      // Secondary lookup by matching operator, pack_type, duration_months, and plan_name
      originalPlan = currentPlans.find(
        (p) => p.operator === opSafe && p.pack_type === typeSafe && p.duration_months === durSafe && p.plan_name.toLowerCase() === plan_name.toLowerCase()
      );
    }

    let action: 'create' | 'update' | 'no_change' = 'create';
    const diffs: { field: string; label: string; oldVal: any; newVal: any }[] = [];

    if (originalPlan) {
      let hasChanges = false;
      if (originalPlan.amount !== amount) {
        hasChanges = true;
        diffs.push({ field: 'amount', label: 'Price (INR)', oldVal: `₹${originalPlan.amount}`, newVal: `₹${amount}` });
      }
      if (originalPlan.plan_name !== plan_name) {
        hasChanges = true;
        diffs.push({ field: 'plan_name', label: 'Plan Name', oldVal: originalPlan.plan_name, newVal: plan_name });
      }
      if (originalPlan.is_recommended !== is_recommended) {
        hasChanges = true;
        diffs.push({ field: 'is_recommended', label: 'Recommended', oldVal: String(originalPlan.is_recommended), newVal: String(is_recommended) });
      }
      if (originalPlan.channel_list.length !== channel_list.length) {
        hasChanges = true;
        diffs.push({ field: 'channel_list', label: 'Channels Count', oldVal: `${originalPlan.channel_list.length} channels`, newVal: `${channel_list.length} channels` });
      }
      action = hasChanges ? 'update' : 'no_change';
    }

    const isValid = errors.length === 0;

    parsedRows.push({
      rowNumber,
      id: planId,
      operator: opSafe,
      operatorName: OPERATOR_DISPLAY_NAMES[opSafe] || opSafe,
      pack_type: typeSafe,
      duration_months: durSafe,
      plan_name,
      amount,
      is_recommended,
      channel_list,
      isValid,
      errors,
      warnings,
      action,
      originalPlan,
      diffs,
      selected: isValid, // automatically check valid rows
    });
  });

  const validRows = parsedRows.filter((r) => r.isValid).length;
  const invalidRows = parsedRows.filter((r) => !r.isValid).length;
  const createsCount = parsedRows.filter((r) => r.isValid && r.action === 'create').length;
  const updatesCount = parsedRows.filter((r) => r.isValid && r.action === 'update').length;
  const noChangeCount = parsedRows.filter((r) => r.isValid && r.action === 'no_change').length;

  return {
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    createsCount,
    updatesCount,
    noChangeCount,
    rows: parsedRows,
  };
}

/**
 * Apply selected imported rows into the database and plan catalog
 */
export async function applyImportedPlans(
  rowsToApply: PlanImportRow[],
  adminEmailOrUid: string
): Promise<{ success: boolean; count: number; updatedPlans: PlanCatalogItem[] }> {
  const selectedValid = rowsToApply.filter((r) => r.selected && r.isValid);
  if (selectedValid.length === 0) {
    throw new Error('No valid plans selected for import.');
  }

  const now = new Date().toISOString();
  const allCurrent = await PlanCatalogService.getAllPlans();
  const currentMap = new Map<string, PlanCatalogItem>();
  allCurrent.forEach((p) => currentMap.set(p.id, p));

  for (const row of selectedValid) {
    const finalItem: PlanCatalogItem = {
      id: row.id,
      operator: row.operator,
      pack_type: row.pack_type,
      duration_months: row.duration_months,
      plan_name: row.plan_name,
      amount: row.amount,
      is_recommended: row.is_recommended,
      channel_list: row.channel_list,
      updated_at: now,
      updated_by: adminEmailOrUid || 'excel_import_admin',
    };

    await PlanCatalogService.savePlan(finalItem, adminEmailOrUid || 'excel_import_admin');
    currentMap.set(finalItem.id, finalItem);
  }

  // Record batch audit summary
  await PlanCatalogService.recordAuditLog({
    id: `audit-batch-excel-${Date.now()}`,
    plan_id: 'batch_import',
    plan_name: `Excel Batch Import (${selectedValid.length} packs)`,
    operator: selectedValid[0]?.operator || 'sun_direct',
    action: 'update',
    updated_at: now,
    updated_by: adminEmailOrUid || 'excel_import_admin',
    details: `Imported and updated ${selectedValid.length} pack records via Excel spreadsheet upload.`,
  });

  const updatedPlans = await PlanCatalogService.getAllPlans();
  return {
    success: true,
    count: selectedValid.length,
    updatedPlans,
  };
}
