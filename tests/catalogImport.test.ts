import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
vi.mock('../src/lib/firebase', () => ({ db: null, auth: null, isFirebaseConfigured: false, sanitizePayload: (value: unknown) => value }));
import { parseAndValidatePlanExcel, applyImportedPlans } from '../src/lib/excelPlanService';

async function workbook(total?: number, hd?: number, name = 'Tamil Pack (29 HD)') {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Packs');
  sheet.addRow(['Plan ID', 'Operator Code', 'Pack Quality (HD/SD)', 'Duration (Months)', 'Plan Name', 'Price (INR)', 'Channels List (Comma Separated)', 'Channels Count', 'HD Channels Count']);
  sheet.addRow(['fixture', 'airtel_dth', 'HD', 12, name, 3091, 'Sun TV HD, KTV HD', total, hd]);
  return await book.xlsx.writeBuffer() as ArrayBuffer;
}
describe('catalog import metadata validation', () => {
  it('requires explicit counts for new rows instead of manufacturing 210/32', async () => {
    const result = await parseAndValidatePlanExcel(await workbook(), []);
    expect(result.invalidRows).toBe(1);
    expect(result.rows[0].errors.join(' ')).toContain('Total channels');
  });
  it('rejects a name/count mismatch even when HD is within the total', async () => {
    const result = await parseAndValidatePlanExcel(await workbook(140, 32), []);
    expect(result.invalidRows).toBe(1);
    expect(result.rows[0].errors.join(' ')).toContain('Name claims 29');
  });
  it('preserves declared totals and blocks a forged preview flag before any write', async () => {
    const result = await parseAndValidatePlanExcel(await workbook(140, 29), []);
    expect(result.validRows).toBe(1);
    expect(result.rows[0].channel_count).toBe(140);
    expect(result.rows[0].hd_channel_count).toBe(29);
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    try {
      await expect(applyImportedPlans([{ ...result.rows[0], selected: true, isValid: true, hd_channel_count: 150 }], 'fixture-admin')).rejects.toThrow('exceed total');
      expect(fetcher).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
