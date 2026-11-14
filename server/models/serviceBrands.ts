import { getAdminFirestore } from '../middleware/auth';
import { defaultServiceBrands, serviceBrandsSchema } from '../../src/lib/serviceBrands';
export async function readServiceBrands() {
  const snapshot = await getAdminFirestore().collection('server_service_config').doc('brands').get();
  // Only missing config falls back; database or malformed-config errors fail closed.
  if (!snapshot.exists) return defaultServiceBrands;
  const values = snapshot.data()?.brands;
  return serviceBrandsSchema.parse(Array.isArray(values) ? values.map(value => ({ ...value, customerCarePhone: value.customerCarePhone ?? defaultServiceBrands.find(brand => brand.id === value.id)?.customerCarePhone ?? '' })) : values);
}
export async function saveServiceBrands(input: unknown, uid: string) {
  const brands = serviceBrandsSchema.parse(input);
  await getAdminFirestore().collection('server_service_config').doc('brands').set({ brands, updatedBy: uid, updatedAt: new Date().toISOString() });
  return brands;
}
