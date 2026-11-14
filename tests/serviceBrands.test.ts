import { expect, it, vi } from 'vitest';
import { defaultServiceBrands, serviceBrandsSchema, validateServiceSubscriber } from '../src/lib/serviceBrands';
const f = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({ collection: () => ({ doc: () => ({ get: f.get, set: f.set }) }) }) }));
import { readServiceBrands, saveServiceBrands } from '../server/models/serviceBrands';
it('provides the five initial brands and configurable digits-only validation', () => {
  expect(defaultServiceBrands.map(brand => brand.id)).toEqual(['tata_play', 'airtel_dth', 'dish_tv', 'd2h', 'sun_direct']);
  expect(validateServiceSubscriber(defaultServiceBrands[0], '1234567890')).toBe(true);
  expect(validateServiceSubscriber(defaultServiceBrands[0], '12abc')).toBe(false);
  expect(validateServiceSubscriber({ ...defaultServiceBrands[0], enabled: false }, '1234567890')).toBe(false);
  expect(serviceBrandsSchema.safeParse([defaultServiceBrands[0], defaultServiceBrands[0]]).success).toBe(false);
});
it('falls back only for a missing config, and uses current persisted settings without caching', async () => {
  f.get.mockResolvedValueOnce({ exists: false }); expect(await readServiceBrands()).toEqual(defaultServiceBrands);
  const brands = [{ ...defaultServiceBrands[0], minLength: 10, maxLength: 10 }];
  f.get.mockResolvedValueOnce({ exists: true, data: () => ({ brands }) }); expect(await readServiceBrands()).toEqual(brands);
  f.get.mockRejectedValueOnce(new Error('offline')); await expect(readServiceBrands()).rejects.toThrow('offline');
  await saveServiceBrands(brands, 'admin'); expect(f.set).toHaveBeenCalledWith(expect.objectContaining({ brands, updatedBy: 'admin' }));
});
