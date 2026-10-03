import ExcelJS from 'exceljs';
import { PlanCatalogItem, DthOperatorId } from '../types';
import { PlanCatalogService } from './planCatalogService';
import { db, auth, isFirebaseLive, sanitizePayload } from './firebase';
import { doc, writeBatch } from 'firebase/firestore';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export interface PlanImportRow {
  rowNumber: number;
  id: string;
  operator: DthOperatorId;
  operatorName: string;
  pack_type: 'HD' | 'SD';
  duration_months: 1 | 3 | 6 | 12;
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
 * Safely extracts textual value from an ExcelJS Cell
 */
function extractCellValue(cell: ExcelJS.Cell): any {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object') {
    if ('result' in val) return String(val.result ?? '');
    if ('text' in val) return String(val.text ?? '');
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((t: any) => t.text).join('');
    }
  }
  return String(val).trim();
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
export function normalizeDuration(raw: any): 1 | 3 | 6 | 12 | null {
  if (typeof raw === 'number') {
    if (raw === 1 || raw === 3 || raw === 6 || raw === 12) return raw;
  }
  if (!raw) return null;
  const match = String(raw).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num === 1 || num === 3 || num === 6 || num === 12) return num as 1 | 3 | 6 | 12;
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
 * Export current plans to an Excel file (.xlsx) using ExcelJS
 */
export async function exportPlansToExcel(
  plans: PlanCatalogItem[],
  filename = 'dth_tamizhan_packs_catalog.xlsx',
  operatorFilter?: DthOperatorId | 'all'
) {
  const filtered = (operatorFilter && operatorFilter !== 'all')
    ? plans.filter((p) => p.operator === operatorFilter)
    : plans;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DTH Tamizhan Admin Suite';
  workbook.lastModifiedBy = 'DTH Tamizhan Admin Suite';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Main Packs Sheet
  const wsPacks = workbook.addWorksheet('DTH Packs', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  wsPacks.columns = [
    { header: 'Plan ID', key: 'id', width: 24 },
    { header: 'Operator Code', key: 'operator', width: 18 },
    { header: 'Operator Name', key: 'operatorName', width: 22 },
    { header: 'Pack Quality (HD/SD)', key: 'pack_type', width: 20 },
    { header: 'Duration (Months)', key: 'duration_months', width: 18 },
    { header: 'Plan Name', key: 'plan_name', width: 38 },
    { header: 'Price (INR)', key: 'amount', width: 14 },
    { header: 'Is Recommended (TRUE/FALSE)', key: 'is_recommended', width: 24 },
    { header: 'Channels List (Comma Separated)', key: 'channel_list', width: 65 },
    { header: 'Channels Count', key: 'channel_count', width: 16 },
    { header: 'Last Updated (ISO)', key: 'updated_at', width: 24 },
    { header: 'Updated By', key: 'updated_by', width: 24 },
  ];

  const headerRow = wsPacks.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  headerRow.height = 24;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  filtered.forEach((p) => {
    wsPacks.addRow({
      id: p.id,
      operator: p.operator,
      operatorName: OPERATOR_DISPLAY_NAMES[p.operator] || p.operator,
      pack_type: p.pack_type,
      duration_months: p.duration_months,
      plan_name: p.plan_name,
      amount: p.amount,
      is_recommended: p.is_recommended ? 'TRUE' : 'FALSE',
      channel_list: (p.channel_list || []).join(', '),
      channel_count: p.channel_count || (p.channel_list || []).length,
      updated_at: p.updated_at,
      updated_by: p.updated_by,
    });
  });

  // 2. Instructions Sheet
  const wsInfo = workbook.addWorksheet('Instructions & Valid Values');
  wsInfo.columns = [
    { header: 'Section', key: 'section', width: 24 },
    { header: 'Guide', key: 'guide', width: 85 }
  ];
  const infoHeader = wsInfo.getRow(1);
  infoHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  infoHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  };
  infoHeader.height = 24;

  const instructions = [
    { section: 'Overview', guide: 'This Excel sheet allows you to batch update and create DTH recharge packs.' },
    { section: 'Re-uploading', guide: 'You can edit the rows directly in this file or delete/add rows, then re-upload via the "Import Excel" button.' },
    { section: 'Operator Code', guide: 'Must be one of: sun_direct, tata_play, airtel_dth, dish_tv, d2h' },
    { section: 'Pack Quality', guide: 'Must be HD or SD' },
    { section: 'Duration (Months)', guide: 'Must be 1, 3, 6, or 12' },
    { section: 'Price (INR)', guide: 'Must be a positive number (e.g. 299, 1650, 3100)' },
    { section: 'Is Recommended', guide: 'TRUE for featured 2-card homepage hero pack, FALSE for standard pack' },
    { section: 'Channels List', guide: 'Comma-separated channel names (e.g. "Sun TV HD, KTV HD, Star Vijay HD")' },
    { section: 'Plan ID', guide: 'Leave untouched to update existing plan. Leave blank or enter a new unique string to create a new plan.' },
  ];

  instructions.forEach((inst) => {
    wsInfo.addRow(inst);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a pristine template with sample rows for all operators using ExcelJS
 */
export async function downloadPlanTemplateExcel() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Packs Template', { views: [{ state: 'frozen', ySplit: 1 }] });
  
  ws.columns = [
    { header: 'Plan ID', key: 'id', width: 22 },
    { header: 'Operator Code', key: 'operator', width: 16 },
    { header: 'Operator Name', key: 'operatorName', width: 20 },
    { header: 'Pack Quality (HD/SD)', key: 'pack_type', width: 18 },
    { header: 'Duration (Months)', key: 'duration_months', width: 18 },
    { header: 'Plan Name', key: 'plan_name', width: 38 },
    { header: 'Price (INR)', key: 'amount', width: 14 },
    { header: 'Is Recommended (TRUE/FALSE)', key: 'is_recommended', width: 24 },
    { header: 'Channels List (Comma Separated)', key: 'channel_list', width: 70 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  headerRow.height = 24;

  const sampleRows = [
    {
      id: 'sun_hd_1m_rec',
      operator: 'sun_direct',
      operatorName: 'Sun Direct',
      pack_type: 'HD',
      duration_months: 1,
      plan_name: 'Sun Direct Prime HD',
      amount: 299,
      is_recommended: 'TRUE',
      channel_list: 'Sun TV HD, KTV HD, Sun Music HD, Star Vijay HD, Zee Tamil HD, Jaya TV HD, Colors Tamil HD, Star Sports 1 Tamil HD',
    },
    {
      id: 'sun_hd_6m_rec',
      operator: 'sun_direct',
      operatorName: 'Sun Direct',
      pack_type: 'HD',
      duration_months: 6,
      plan_name: 'Sun Direct Prime HD (6 Months Saver)',
      amount: 1650,
      is_recommended: 'TRUE',
      channel_list: 'Sun TV HD, KTV HD, Sun Music HD, Star Vijay HD, Zee Tamil HD, Jaya TV HD, Colors Tamil HD, Star Sports 1 Tamil HD',
    },
    {
      id: 'tata_hd_1m_rec',
      operator: 'tata_play',
      operatorName: 'Tata Play',
      pack_type: 'HD',
      duration_months: 1,
      plan_name: 'Tata Play Tamil Thalaiva HD',
      amount: 360,
      is_recommended: 'TRUE',
      channel_list: 'Star Vijay HD, Sun TV HD, KTV HD, Zee Tamil HD, Colors Tamil HD, Jaya TV HD, Star Sports 1 Tamil HD',
    },
    {
      id: 'airtel_sd_1m_rec',
      operator: 'airtel_dth',
      operatorName: 'Airtel Digital TV',
      pack_type: 'SD',
      duration_months: 1,
      plan_name: 'Airtel Tamil Value Pack',
      amount: 215,
      is_recommended: 'TRUE',
      channel_list: 'Sun TV, Star Vijay, KTV, Zee Tamil, Colors Tamil, Star Sports 1 Tamil, Discovery Tamil',
    },
    {
      id: '',
      operator: 'dish_tv',
      operatorName: 'Dish TV',
      pack_type: 'HD',
      duration_months: 12,
      plan_name: 'Dish TV Tamil Royal HD (Annual)',
      amount: 3150,
      is_recommended: 'TRUE',
      channel_list: 'Sun TV HD, Star Vijay HD, KTV HD, Zee Tamil HD, Star Sports 1 Tamil HD, Sun Music HD',
    },
  ];

  sampleRows.forEach((r) => ws.addRow(r));

  // Guide sheet
  const wsGuide = workbook.addWorksheet('Field Guidelines');
  wsGuide.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Required', key: 'required', width: 14 },
    { header: 'Description', key: 'desc', width: 80 }
  ];
  const guideHeader = wsGuide.getRow(1);
  guideHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  guideHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' }
  };

  const guidelines = [
    { field: 'Plan ID', required: 'Optional', desc: 'Leave blank to generate an automatic ID for a new pack, or enter existing ID to update it.' },
    { field: 'Operator Code', required: 'Mandatory', desc: 'Must be one of: sun_direct, tata_play, airtel_dth, dish_tv, d2h' },
    { field: 'Pack Quality', required: 'Mandatory', desc: 'Must be either HD or SD' },
    { field: 'Duration (Months)', required: 'Mandatory', desc: 'Must be 1, 3, 6, or 12' },
    { field: 'Plan Name', required: 'Mandatory', desc: 'Readable name of the recharge bouquet' },
    { field: 'Price (INR)', required: 'Mandatory', desc: 'Positive price amount in rupees (e.g. 299, 1650)' },
    { field: 'Is Recommended', required: 'Optional', desc: 'TRUE or FALSE. Recommended packs appear in high priority cards.' },
    { field: 'Channels List', required: 'Optional', desc: 'Comma-separated channel list e.g. "Sun TV HD, Star Vijay HD"' },
  ];
  guidelines.forEach((g) => wsGuide.addRow(g));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dth_packs_import_template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded Excel/CSV file and validate rows against existing catalog using ExcelJS
 */
export async function parseAndValidatePlanExcel(
  file: File | ArrayBuffer,
  currentPlans: PlanCatalogItem[]
): Promise<PlanValidationSummary> {
  // Strict File Size Limit Enforcement (10MB)
  if (typeof file === 'object' && file !== null && 'size' in file && typeof (file as any).size === 'number') {
    const size = (file as any).size;
    if (size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum permitted limit of 10 MB.`);
    }
  }

  let arrayBuffer: ArrayBuffer;
  if (typeof file === 'object' && file !== null && typeof (file as any).arrayBuffer === 'function') {
    arrayBuffer = await (file as any).arrayBuffer();
  } else {
    arrayBuffer = file as ArrayBuffer;
  }

  if (arrayBuffer && arrayBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds maximum permitted limit of 10 MB.`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The uploaded spreadsheet contains no worksheets.');
  }

  const headerRow = worksheet.getRow(1);
  const headers: { colNumber: number; key: string }[] = [];
  headerRow.eachCell((cell, colNumber) => {
    const rawVal = extractCellValue(cell);
    if (rawVal) {
      headers.push({ colNumber, key: normalizeKey(rawVal) });
    }
  });

  if (headers.length === 0) {
    throw new Error('The uploaded sheet does not contain recognizable header columns.');
  }

  const parsedRows: PlanImportRow[] = [];
  const existingPlansMap = new Map<string, PlanCatalogItem>();
  currentPlans.forEach((p) => existingPlansMap.set(p.id, p));

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const normalizedRow: Record<string, any> = {};
    headers.forEach(({ colNumber, key }) => {
      const cell = row.getCell(colNumber);
      normalizedRow[key] = extractCellValue(cell);
    });

    // Ignore completely empty rows
    const hasAnyValue = Object.values(normalizedRow).some((v) => Boolean(v && String(v).trim()));
    if (!hasAnyValue) return;

    const errors: string[] = [];
    const warnings: string[] = [];

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
      errors.push(`Invalid Duration "${rawDur}". Supported durations: 1, 3, 6, or 12 months`);
    }

    // 5. Plan Name
    const plan_name = String(normalizedRow['plan_name'] || normalizedRow['name'] || normalizedRow['pack_name'] || '').trim();
    if (!plan_name) {
      errors.push('Plan Name is required.');
    }

    // 6. Price / Amount
    const rawAmount = normalizedRow['price_inr'] || normalizedRow['price'] || normalizedRow['amount'] || normalizedRow['cost'] || '';
    let amount = NaN;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else {
      const trimmed = String(rawAmount).trim();
      if (trimmed.startsWith('-') || /-[0-9]/.test(trimmed)) {
        amount = -1; // Explicit negative value trigger
      } else {
        const cleanAmountStr = trimmed.replace(/^₹\s*/, '').replace(/,/g, '');
        amount = parseFloat(cleanAmountStr);
      }
    }
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

      // Comprehensive Deep Diff Detection on Channel Lists (not just count!)
      const origChannels = (originalPlan.channel_list || []).map((c) => c.trim()).filter(Boolean);
      const newChannels = channel_list.map((c) => c.trim()).filter(Boolean);

      const isChannelsEqual = origChannels.length === newChannels.length &&
        origChannels.every((ch, i) => ch.toLowerCase() === newChannels[i]?.toLowerCase());

      if (!isChannelsEqual) {
        hasChanges = true;
        const added = newChannels.filter((c) => !origChannels.some((o) => o.toLowerCase() === c.toLowerCase()));
        const removed = origChannels.filter((c) => !newChannels.some((n) => n.toLowerCase() === c.toLowerCase()));

        let diffSummary = `${newChannels.length} channels`;
        const diffParts: string[] = [];
        if (added.length > 0) {
          diffParts.push(`+${added.length} added (${added.slice(0, 2).join(', ')}${added.length > 2 ? '...' : ''})`);
        }
        if (removed.length > 0) {
          diffParts.push(`-${removed.length} removed (${removed.slice(0, 2).join(', ')}${removed.length > 2 ? '...' : ''})`);
        }
        if (diffParts.length > 0) {
          diffSummary = `${newChannels.length} channels [${diffParts.join(', ')}]`;
        }

        diffs.push({
          field: 'channel_list',
          label: 'Channel List',
          oldVal: `${origChannels.length} channels (${origChannels.slice(0, 2).join(', ')}...)`,
          newVal: diffSummary,
        });
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
      selected: isValid,
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
 * Apply selected imported rows into Cloud Firestore via a single Batched Write and single audit entry
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
  const finalItems: PlanCatalogItem[] = selectedValid.map((row) => {
    const isHd = row.pack_type === 'HD';
    const channelCount = row.channel_list.length > 20 ? row.channel_list.length : (isHd ? 210 : 145);
    return {
      id: row.id,
      operator: row.operator,
      pack_type: row.pack_type,
      duration_months: row.duration_months,
      plan_name: row.plan_name,
      amount: row.amount,
      price: row.amount,
      is_recommended: row.is_recommended,
      channel_count: channelCount,
      hd_channel_count: isHd ? 32 : 0,
      channel_list: row.channel_list,
      channels: row.channel_list,
      genre_tags: ['tamil', 'entertainment'],
      description: `${row.duration_months} Month${row.duration_months > 1 ? 's' : ''} ${row.pack_type} pack for ${row.operator}.`,
      updated_at: now,
      updated_by: adminEmailOrUid || 'excel_import_admin',
    };
  });

  // 1. Single Batched Write to Cloud Firestore
  if (isFirebaseLive && db) {
    try {
      const batch = writeBatch(db);
      for (const item of finalItems) {
        const cleanPayload = sanitizePayload(item);
        const planDocRef = doc(db, 'plan_catalog', item.id);
        batch.set(planDocRef, cleanPayload, { merge: true });
      }
      await batch.commit();
    } catch (batchErr) {
      console.error('[applyImportedPlans] Firestore batched write error:', batchErr);
    }
  }

  // 2. Record single consolidated audit log entry
  await PlanCatalogService.recordAuditLog({
    id: `audit-batch-excel-${Date.now()}`,
    plan_id: 'batch_import',
    plan_name: `Excel Batch Import (${finalItems.length} packs)`,
    operator: finalItems[0]?.operator || 'sun_direct',
    action: 'update',
    updated_at: now,
    updated_by: adminEmailOrUid || 'excel_import_admin',
    details: `Imported and updated ${finalItems.length} pack records in a single batch operation via Excel.`,
  });

  // 3. Sync all items to Backend Server in a single POST
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch {}
    }
    await fetch('/api/admin/plans/sync-seed', {
      method: 'POST',
      headers,
      body: JSON.stringify({ plans: finalItems }),
    });
  } catch (srvErr) {
    console.warn('[applyImportedPlans] Backend server sync error:', srvErr);
  }

  // 4. Dispatch single reactive update event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('plan_catalog_updated'));
  }

  const updatedPlans = await PlanCatalogService.getAllPlans();
  return {
    success: true,
    count: finalItems.length,
    updatedPlans,
  };
}
