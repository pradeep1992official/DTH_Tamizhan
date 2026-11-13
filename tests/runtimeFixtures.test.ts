import { expect, it, vi } from 'vitest';
const filesystem = vi.hoisted(() => ({ existsSync: vi.fn(() => false), mkdirSync: vi.fn(), readFileSync: vi.fn(), writeFileSync: vi.fn() }));
vi.mock('fs', () => ({ default: filesystem }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'professorpradeeps@gmail.com' }));
import { initStoreFromDisk, MEMORY_RECHARGE_ORDERS, MEMORY_CUSTOMERS, MEMORY_ADMINS, MEMORY_ADMIN_REQUESTS } from '../server/models/store';
import { planModel } from '../server/models/planModel';
import { createDemoAdminData } from './fixtures/demoAdminData';
it('a new installation starts empty and does not save fixture records or plans', async () => {
  initStoreFromDisk();
  for (const rows of [MEMORY_RECHARGE_ORDERS, MEMORY_CUSTOMERS, MEMORY_ADMINS, MEMORY_ADMIN_REQUESTS, await planModel.getAll()]) expect(rows).toEqual([]);
  expect(filesystem.writeFileSync).not.toHaveBeenCalled();
});
it('explicit fixture generation cannot produce a paid dispatchable order', async () => {
  expect(createDemoAdminData().orders.every(order => order.paymentStatus === 'initiated')).toBe(true);
});
