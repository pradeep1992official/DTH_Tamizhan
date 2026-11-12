import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ write: vi.fn(), original: { id: 'existing', operator: 'sun_direct', pack_type: 'SD',
  duration_months: 1, plan_name: 'Existing', amount: 200, channel_count: 100, hd_channel_count: 0, channel_list: [], is_recommended: false } }));
vi.mock('fs', () => ({ default: {
  existsSync: () => true,
  readFileSync: (file: string) => file.endsWith('plan_catalog.json') ? JSON.stringify([state.original]) : '[]',
  writeFileSync: state.write,
} }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'professorpradeeps@gmail.com' }));
import { planModel } from '../server/models/planModel';
beforeEach(() => state.write.mockClear());
it('upserts selected imports without removing unrelated catalog records', () => {
  planModel.sync([{ ...state.original, operator: 'sun_direct', pack_type: 'SD', duration_months: 1, id: 'imported' }]);
  expect(planModel.getAll().map(pack => pack.id)).toEqual(['existing', 'imported']);
  expect(state.write).toHaveBeenCalled();
});
it('rejects an entire invalid batch before any in-memory change or disk write', () => {
  const original = [...planModel.getAll()];
  expect(() => planModel.sync([{ ...original[0], id: 'bad', hd_channel_count: 101 }])).toThrow('exceed total');
  expect(planModel.getAll()).toEqual(original);
  expect(state.write).not.toHaveBeenCalled();
});
