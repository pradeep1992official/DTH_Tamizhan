import { validateCatalogPack } from '../../src/lib/catalog';
import { subscriberError, normalizeSubscriberId } from '../../src/lib/subscriberValidation';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

const validateSubscriber = (payload: { operator: string; smartCardNumber: string }, context: z.RefinementCtx) => {
  const error = subscriberError(payload.operator, payload.smartCardNumber);
  if (error) context.addIssue({ code: 'custom', path: ['smartCardNumber'], message: error });
};
export const SubscriberSchema = z.object({
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  smartCardNumber: z.string().transform(normalizeSubscriberId),
}).superRefine(validateSubscriber);

export const CreateOrderSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  operatorName: z.string().min(1),
  smartCardNumber: z.string().transform(normalizeSubscriberId),
  customerName: z.string().optional(),
  registeredMobile: z.string().min(10).max(15).optional(),
  amount: z.number().positive('Amount must be positive'),
  packId: z.string().min(1),
  packName: z.string().min(1),
  packValidity: z.string().min(1),
  paymentMethod: z.enum(['upi', 'qr_code', 'card', 'netbanking', 'wallet']),
  signalRefreshRequested: z.boolean().optional(),
}).superRefine(validateSubscriber);

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rechargeStatus: z.enum(['pending', 'completed', 'failed']),
  workerNotes: z.string().max(500).optional(),
});

export const CatalogPackSchema = z.object({
    id: z.string().min(1),
    operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
    pack_type: z.enum(['HD', 'SD']),
    duration_months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
    plan_name: z.string().min(1),
    tamilName: z.string().optional(),
    channel_list_url: z.string().optional(),
    amount: z.number().positive(),
    price: z.number().optional(),
    is_recommended: z.boolean().optional(),
    channel_count: z.number().int().positive().optional(),
    hd_channel_count: z.number().int().nonnegative().optional(),
    channel_counts_unavailable: z.boolean().optional(),
    channel_list: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    genre_tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }).superRefine((pack, context) => {
    for (const issue of validateCatalogPack(pack)) context.addIssue({ code: 'custom', path: [issue.field], message: issue.message });
  });
export const SavePlanSchema = z.object({ plan: CatalogPackSchema });
export const SyncPlansSchema = z.object({ plans: z.array(CatalogPackSchema).min(1) });

export const DeletePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

export const CreateCustomerSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  registeredMobile: z.string().min(10).max(15),
  smartCardNumber: z.string().transform(normalizeSubscriberId),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  operatorName: z.string().min(1),
  activePackName: z.string().min(1),
  currentBalance: z.number().nonnegative(),
  expiryDate: z.string().min(1),
}).superRefine(validateSubscriber);

export const RequestAccessSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(300),
  userPhone: z.string().max(20).optional(),
});

export const ApproveUserSchema = z.object({
  userEmail: z.string().trim().toLowerCase().email('Valid email is required'),
  name: z.string().trim().min(1).max(100).optional(),
});

export const RevokeUserSchema = z.object({
    userEmail: z.string().trim().toLowerCase().email('Valid email is required'),
    uid: z.string().min(1).max(128).regex(/^[^/]+$/, 'Invalid user ID').optional(),
});

export const ToggleOperatorSchema = z.object({
  operatorId: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  isEnabled: z.boolean(),
  condition: z.enum([
    'scheduled_maintenance', 
    'gateway_down', 
    'transponder_outage', 
    'high_failure_rate', 
    'commercial_hold', 
    'custom'
  ]).optional(),
  conditionLabel: z.string().trim().min(1).max(100).optional(),
  maintenanceMessage: z.string().trim().max(300).optional(),
  expectedRestoration: z.string().trim().max(50).optional(),
}).superRefine((payload, context) => {
  if (!payload.isEnabled && !payload.conditionLabel) {
    context.addIssue({
      code: 'custom',
      path: ['conditionLabel'],
      message: 'A reason is required when suspending an operator.',
    });
  }
});

export const InstallationRequestSchema = z.object({
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth']),
  name: z.string().trim().min(2).max(100),
  mobile: z.string().regex(/^[0-9]{10}$/, 'A 10-digit mobile number is required'),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(300),
});

/**
 * Middleware factory for validating incoming request bodies against a Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({
        success: false,
        error: `Input validation failed: ${errorMsg}`,
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
