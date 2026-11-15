import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ rows: new Map<string, any>(), fail: false }));
vi.mock('../server/persistence', () => ({ usesFirestore: () => true, cleanData: (data: unknown) => data,
  collections: { plans: 'plan_catalog', deletedPlans: 'server_deleted_plans' }, readCollection: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'root@example.com', getAdminFirestore: () => ({
  collection: (name: string) => ({ doc: (id: string) => ({ path: `${name}/${id}` }) }),
  runTransaction: async (callback: any) => {
    const staged: [string, any][] = [];
    const result = await callback({ get: async (ref: any) => ({ exists: f.rows.has(ref.path), data: () => f.rows.get(ref.path) }),
      set: (ref: any, data: unknown) => staged.push([ref.path, data]), delete: (ref: any) => staged.push([ref.path, undefined]) });
    if (f.fail) throw new Error('commit failed');
    for (const [key, value] of staged) { if (value === undefined) f.rows.delete(key); else f.rows.set(key, value); }
    return result;
  },
}) }));
import { planModel } from '../server/models/planModel';
beforeEach(() => { f.rows.clear(); f.fail = false; f.rows.set('plan_catalog/tata', { id: 'tata', plan_name: 'Tamil pack', operator: 'tata_play', pack_type: 'HD', duration_months: 1, amount: 309 }); });
it('commits deletion, tombstone and actual operator/name audit together, with idempotent retries', async () => {
  const audit = await planModel.delete('tata', 'admin@example.com');
  expect(audit).toMatchObject({ operator: 'tata_play', plan_name: 'Tamil pack', updated_by: 'admin@example.com' });
  expect(f.rows.has('plan_catalog/tata')).toBe(false);
  expect(f.rows.get('server_deleted_plans/tata').audit).toEqual(audit);
  expect(f.rows.get(`plan_audit_logs/${audit!.id}`)).toEqual(audit);
  expect(await planModel.delete('tata', 'admin@example.com')).toEqual(audit);
  expect([...f.rows.keys()].filter(key => key.startsWith('plan_audit_logs/'))).toHaveLength(1);
});
it('leaves the plan, tombstone and audit unchanged when commit fails', async () => {
  f.fail = true;
  await expect(planModel.delete('tata', 'admin')).rejects.toThrow('commit failed');
  expect([...f.rows.keys()]).toEqual(['plan_catalog/tata']);
});
