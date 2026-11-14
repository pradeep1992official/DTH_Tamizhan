import { z } from 'zod';
export const serviceBrandSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/), displayName: z.string().trim().min(1).max(80), enabled: z.boolean(),
  subscriberIdLabel: z.string().trim().min(1).max(80), minLength: z.number().int().min(1).max(25),
  maxLength: z.number().int().min(1).max(25), placeholder: z.string().regex(/^\d{1,25}$/), helpText: z.string().max(300).default(''),
}).strict().refine(brand => brand.minLength <= brand.maxLength && brand.placeholder.length >= brand.minLength && brand.placeholder.length <= brand.maxLength, 'Check subscriber ID lengths and example.');
export const serviceBrandsSchema = z.array(serviceBrandSchema).min(1).max(50).refine(brands => new Set(brands.map(brand => brand.id)).size === brands.length, 'Brand IDs must be unique.');
export type ServiceBrand = z.infer<typeof serviceBrandSchema>;
export const defaultServiceBrands: ServiceBrand[] = [
  ['tata_play', 'Tata Play'], ['airtel_dth', 'Airtel Digital TV'], ['dish_tv', 'Dish TV'], ['d2h', 'd2h'], ['sun_direct', 'Sun Direct'],
].map(([id, displayName]) => ({ id, displayName, enabled: true, subscriberIdLabel: 'Subscriber / Customer ID', minLength: 6, maxLength: 16, placeholder: '1234567890', helpText: 'Enter the digits shown in your DTH account.' }));
export function validateServiceSubscriber(brand: ServiceBrand | undefined, value: string) {
  return !!brand?.enabled && /^\d+$/.test(value) && value.length >= brand.minLength && value.length <= brand.maxLength;
}
