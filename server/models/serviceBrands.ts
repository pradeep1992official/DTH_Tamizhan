import { getAdminFirestore } from '../middleware/auth';
import { defaultServiceBrands, serviceBrandsSchema } from '../../src/lib/serviceBrands';
export async function readServiceBrands() {
  const snapshot = await getAdminFirestore().collection('server_service_config').doc('brands').get();
  // Only missing config falls back; database or malformed-config errors fail closed.
  return snapshot.exists ? serviceBrandsSchema.parse(snapshot.data()?.brands) : defaultServiceBrands;
}
export async function saveServiceBrands(input: unknown, uid: string) {
  const brands = serviceBrandsSchema.parse(input);
  await getAdminFirestore().collection('server_service_config').doc('brands').set({ brands, updatedBy: uid, updatedAt: new Date().toISOString() });
  return brands;
}
