import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const CreateOrderSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  operatorName: z.string().min(1),
  smartCardNumber: z.string().min(8).max(18),
  customerName: z.string().optional(),
  registeredMobile: z.string().min(10).max(15).optional(),
  amount: z.number().positive('Amount must be positive'),
  packId: z.string().min(1),
  packName: z.string().min(1),
  packValidity: z.string().min(1),
  paymentMethod: z.enum(['upi', 'qr_code', 'card', 'netbanking', 'wallet']),
  signalRefreshRequested: z.boolean().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  rechargeStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
  workerNotes: z.string().max(500).optional(),
});

export const SignalRefreshSchema = z.object({
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  smartCardNumber: z.string().min(8).max(18),
  customerMobile: z.string().optional(),
});

export const SavePlanSchema = z.object({
  plan: z.object({
    id: z.string().min(1),
    operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
    pack_type: z.enum(['HD', 'SD']),
    duration_months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
    plan_name: z.string().min(1),
    tamilName: z.string().optional(),
    amount: z.number().positive(),
    price: z.number().optional(),
    is_recommended: z.boolean().optional(),
    channel_count: z.number().optional(),
    hd_channel_count: z.number().optional(),
    channel_list: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    genre_tags: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const DeletePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

export const CreateCustomerSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  registeredMobile: z.string().min(10).max(15),
  smartCardNumber: z.string().min(8).max(18),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  operatorName: z.string().min(1),
  activePackName: z.string().min(1),
  currentBalance: z.number().nonnegative(),
  expiryDate: z.string().min(1),
});

export const RequestAccessSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(300),
  userPhone: z.string().max(20).optional(),
});

export const ApproveUserSchema = z.object({
  userEmail: z.string().email('Valid email is required'),
});

export const RevokeUserSchema = z.object({
  userEmail: z.string().email('Valid email is required'),
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
  conditionLabel: z.string().max(100).optional(),
  maintenanceMessage: z.string().max(300).optional(),
  expectedRestoration: z.string().max(50).optional(),
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
