import { rechargeGuard } from '../rechargeFeature';
import { forwardAsyncErrors } from '../asyncRoutes';
import { Router } from 'express';
import { ordersController } from '../controllers/ordersController';
import {
  UpdateOrderStatusSchema,
  validateBody,
} from '../middleware/validation';

export const ordersRouter = Router();
ordersRouter.use(rechargeGuard);

ordersRouter.get('/api/orders', ordersController.list);
ordersRouter.get('/api/admin/orders', ordersController.listAdmin);
// Retired: subscriber details are available only through the authenticated lookup flow.
ordersRouter.post('/api/verify-subscriber', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(410).json({ success: false, error: 'This lookup endpoint has been retired.' });
});
ordersRouter.post('/api/admin/orders/update', validateBody(UpdateOrderStatusSchema), ordersController.updateStatus);

forwardAsyncErrors(ordersRouter);
