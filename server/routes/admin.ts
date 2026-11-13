import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { adminLimiter } from '../middleware/rateLimiter';
import {
  ApproveUserSchema,
  CreateCustomerSchema,
  RequestAccessSchema,
  RevokeUserSchema,
  ToggleOperatorSchema,
  validateBody,
} from '../middleware/validation';

export const adminRouter = Router();

adminRouter.get('/api/admin/verify-token', adminController.verifyToken);
adminRouter.get('/api/admin/customers', adminController.listCustomers);
adminRouter.post('/api/admin/customers/create', adminLimiter, validateBody(CreateCustomerSchema), adminController.createCustomer);
adminRouter.post('/api/admin/customers/delete', adminLimiter, adminController.deleteCustomer);
adminRouter.post('/api/admin/customers/sync', adminController.syncCustomers);
adminRouter.get('/api/admin/audit-logs', adminController.auditLogs);
adminRouter.get('/api/admin/reports', adminController.reports);
adminRouter.get('/api/admin/payments', adminController.payments);
adminRouter.post('/api/admin/payments/sync', adminLimiter, adminController.syncPayments);
adminRouter.get('/api/admin/access-list', adminController.accessList);
adminRouter.post('/api/admin/request-access', adminLimiter, validateBody(RequestAccessSchema), adminController.requestAccess);
adminRouter.post('/api/admin/approve-user', adminLimiter, validateBody(ApproveUserSchema), adminController.approveUser);
adminRouter.post('/api/admin/revoke-user', adminLimiter, validateBody(RevokeUserSchema), adminController.revokeUser);
adminRouter.get('/api/admin/operators', adminController.operators);
adminRouter.post('/api/admin/operators/toggle', adminLimiter, validateBody(ToggleOperatorSchema), adminController.toggleOperator);
