import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  normalizeOperator,
  normalizeBoolean,
  normalizeDuration,
  normalizePackType,
  parseAndValidatePlanExcel,
  MAX_FILE_SIZE_BYTES,
} from '../src/lib/excelPlanService';
import { PlanCatalogItem } from '../src/types';

describe('Excel Parser & Normalizers', () => {
  describe('normalizeOperator', () => {
    it('normalizes standard operator codes', () => {
      expect(normalizeOperator('sun_direct')).toBe('sun_direct');
      expect(normalizeOperator('tata_play')).toBe('tata_play');
      expect(normalizeOperator('airtel_dth')).toBe('airtel_dth');
      expect(normalizeOperator('dish_tv')).toBe('dish_tv');
      expect(normalizeOperator('d2h')).toBe('d2h');
    });

    it('normalizes operator nicknames and aliases with varying casing and spaces', () => {
      expect(normalizeOperator('Sun Direct')).toBe('sun_direct');
      expect(normalizeOperator('sundirect')).toBe('sun_direct');
      expect(normalizeOperator('SUN')).toBe('sun_direct');
      expect(normalizeOperator('Tata Play')).toBe('tata_play');
      expect(normalizeOperator('tataplay')).toBe('tata_play');
      expect(normalizeOperator('Tata Sky')).toBe('tata_play');
      expect(normalizeOperator('Airtel')).toBe('airtel_dth');
      expect(normalizeOperator('Airtel Digital TV')).toBe('airtel_dth');
      expect(normalizeOperator('Dish TV')).toBe('dish_tv');
      expect(normalizeOperator('dishtv')).toBe('dish_tv');
      expect(normalizeOperator('videocon d2h')).toBe('d2h');
    });

    it('returns null for unrecognized or empty operator', () => {
      expect(normalizeOperator('netflix')).toBeNull();
      expect(normalizeOperator('')).toBeNull();
      expect(normalizeOperator(null)).toBeNull();
      expect(normalizeOperator(undefined)).toBeNull();
    });
  });

  describe('normalizeBoolean', () => {
    it('handles boolean primitives directly', () => {
      expect(normalizeBoolean(true)).toBe(true);
      expect(normalizeBoolean(false)).toBe(false);
    });

    it('handles numeric 1 and 0', () => {
      expect(normalizeBoolean(1)).toBe(true);
      expect(normalizeBoolean(0)).toBe(false);
    });

    it('interprets truthy strings', () => {
      expect(normalizeBoolean('true')).toBe(true);
      expect(normalizeBoolean('TRUE')).toBe(true);
      expect(normalizeBoolean('yes')).toBe(true);
      expect(normalizeBoolean('Y')).toBe(true);
      expect(normalizeBoolean('1')).toBe(true);
      expect(normalizeBoolean('recommended')).toBe(true);
      expect(normalizeBoolean('featured')).toBe(true);
    });

    it('interprets falsy strings or empty values', () => {
      expect(normalizeBoolean('false')).toBe(false);
      expect(normalizeBoolean('no')).toBe(false);
      expect(normalizeBoolean('')).toBe(false);
      expect(normalizeBoolean(null)).toBe(false);
      expect(normalizeBoolean(undefined)).toBe(false);
    });
  });

  describe('normalizeDuration', () => {
    it('accepts exact numbers: 1, 3, 6, 12', () => {
      expect(normalizeDuration(1)).toBe(1);
      expect(normalizeDuration(3)).toBe(3);
      expect(normalizeDuration(6)).toBe(6);
      expect(normalizeDuration(12)).toBe(12);
    });

    it('extracts numbers from string representations', () => {
      expect(normalizeDuration('1 Month')).toBe(1);
      expect(normalizeDuration('3 Months')).toBe(3);
      expect(normalizeDuration('6m')).toBe(6);
      expect(normalizeDuration('12 months saver')).toBe(12);
    });

    it('returns null for unsupported durations or invalid input', () => {
      expect(normalizeDuration(2)).toBeNull();
      expect(normalizeDuration(5)).toBeNull();
      expect(normalizeDuration(24)).toBeNull();
      expect(normalizeDuration('lifetime')).toBeNull();
      expect(normalizeDuration('')).toBeNull();
      expect(normalizeDuration(null)).toBeNull();
    });
  });

  describe('normalizePackType', () => {
    it('identifies HD and SD values', () => {
      expect(normalizePackType('HD')).toBe('HD');
      expect(normalizePackType('hd')).toBe('HD');
      expect(normalizePackType('High Definition (HD)')).toBe('HD');
      expect(normalizePackType('SD')).toBe('SD');
      expect(normalizePackType('sd')).toBe('SD');
      expect(normalizePackType('Standard Definition SD')).toBe('SD');
    });

    it('returns null for unknown quality', () => {
      expect(normalizePackType('4K')).toBeNull();
      expect(normalizePackType('')).toBeNull();
      expect(normalizePackType(null)).toBeNull();
    });
  });

  describe('parseAndValidatePlanExcel', () => {
    const existingCatalog: PlanCatalogItem[] = [
      {
        id: 'sun_hd_1m_rec',
        operator: 'sun_direct',
        pack_type: 'HD',
        duration_months: 1,
        plan_name: 'Sun Direct Prime HD',
        amount: 299,
        price: 299,
        is_recommended: true,
        channel_count: 210,
        hd_channel_count: 32,
        channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD'],
        genre_tags: ['tamil'],
      },
    ];

    async function createTestWorkbookBuffer(rows: any[], headers?: string[]): Promise<ArrayBuffer> {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Packs');
      const headerRow = headers || [
        'Plan ID',
        'Operator Code',
        'Pack Quality (HD/SD)',
        'Duration (Months)',
        'Plan Name',
        'Price (INR)',
        'Is Recommended (TRUE/FALSE)',
        'Channels List (Comma Separated)',
      ];
      sheet.addRow(headerRow);
      rows.forEach((r) => sheet.addRow(r));
      return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    }

    it('parses valid new rows as action="create"', async () => {
      const buffer = await createTestWorkbookBuffer([
        ['', 'tata_play', 'HD', 1, 'Tata Mega Tamil HD', 350, 'TRUE', 'Star Vijay HD, Sun TV HD'],
      ]);

      const summary = await parseAndValidatePlanExcel(buffer, existingCatalog);
      expect(summary.totalRows).toBe(1);
      expect(summary.validRows).toBe(1);
      expect(summary.invalidRows).toBe(0);
      expect(summary.createsCount).toBe(1);

      const parsed = summary.rows[0];
      expect(parsed.action).toBe('create');
      expect(parsed.operator).toBe('tata_play');
      expect(parsed.pack_type).toBe('HD');
      expect(parsed.duration_months).toBe(1);
      expect(parsed.plan_name).toBe('Tata Mega Tamil HD');
      expect(parsed.amount).toBe(350);
      expect(parsed.is_recommended).toBe(true);
      expect(parsed.channel_list).toEqual(['Star Vijay HD', 'Sun TV HD']);
      expect(parsed.id).toBeTruthy(); // auto-generated
    });

    it('detects updates and diffs for existing plans by ID', async () => {
      const buffer = await createTestWorkbookBuffer([
        [
          'sun_hd_1m_rec',
          'sun_direct',
          'HD',
          1,
          'Sun Direct Prime HD Updated',
          319, // price increased from 299 to 319
          'FALSE', // recommended changed
          'Sun TV HD, KTV HD, Star Vijay HD, Zee Tamil HD', // added Zee Tamil HD
        ],
      ]);

      const summary = await parseAndValidatePlanExcel(buffer, existingCatalog);
      expect(summary.updatesCount).toBe(1);
      const parsed = summary.rows[0];
      expect(parsed.action).toBe('update');

      // Check diffs recorded
      const diffFields = parsed.diffs.map((d) => d.field);
      expect(diffFields).toContain('amount');
      expect(diffFields).toContain('plan_name');
      expect(diffFields).toContain('is_recommended');
      expect(diffFields).toContain('channel_list');
    });

    it('marks row as action="no_change" when all values match existing catalog', async () => {
      const buffer = await createTestWorkbookBuffer([
        [
          'sun_hd_1m_rec',
          'sun_direct',
          'HD',
          1,
          'Sun Direct Prime HD',
          299,
          'TRUE',
          'Sun TV HD, KTV HD, Star Vijay HD',
        ],
      ]);

      const summary = await parseAndValidatePlanExcel(buffer, existingCatalog);
      expect(summary.noChangeCount).toBe(1);
      expect(summary.rows[0].action).toBe('no_change');
      expect(summary.rows[0].diffs).toHaveLength(0);
    });

    it('flags validation errors for invalid operator, duration, quality, and price', async () => {
      const buffer = await createTestWorkbookBuffer([
        ['', 'invalid_op', '4K', 5, '', -50, 'TRUE', ''],
      ]);

      const summary = await parseAndValidatePlanExcel(buffer, existingCatalog);
      expect(summary.invalidRows).toBe(1);
      const row = summary.rows[0];
      expect(row.isValid).toBe(false);
      expect(row.errors.some((e) => e.includes('Invalid Operator'))).toBe(true);
      expect(row.errors.some((e) => e.includes('Invalid Pack Quality'))).toBe(true);
      expect(row.errors.some((e) => e.includes('Invalid Duration'))).toBe(true);
      expect(row.errors.some((e) => e.includes('Plan Name is required'))).toBe(true);
      expect(row.errors.some((e) => e.includes('Invalid Price Amount'))).toBe(true);
    });

    it('ignores completely blank rows in the sheet', async () => {
      const buffer = await createTestWorkbookBuffer([
        ['', '', '', '', '', '', '', ''],
        ['', 'sun_direct', 'SD', 1, 'Sun Basic SD', 199, 'FALSE', 'Sun TV'],
        ['', '', '', '', '', '', '', ''],
      ]);

      const summary = await parseAndValidatePlanExcel(buffer, existingCatalog);
      expect(summary.totalRows).toBe(1);
      expect(summary.validRows).toBe(1);
      expect(summary.rows[0].plan_name).toBe('Sun Basic SD');
    });

    it('throws error when file size exceeds 10MB limit', async () => {
      // Mock File object with size > MAX_FILE_SIZE_BYTES
      const oversizedFile = {
        name: 'huge_plans.xlsx',
        size: MAX_FILE_SIZE_BYTES + 1024,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as File;

      await expect(parseAndValidatePlanExcel(oversizedFile, existingCatalog)).rejects.toThrow(
        /exceeds maximum permitted limit of 10 MB/
      );
    });

    it('throws error when spreadsheet contains no recognized header columns', async () => {
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Blank');
      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;

      await expect(parseAndValidatePlanExcel(buffer, existingCatalog)).rejects.toThrow(
        /does not contain recognizable header columns/
      );
    });
  });
});
