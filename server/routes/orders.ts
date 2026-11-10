import { Router } from 'express';
import { ordersController } from '../controllers/ordersController';
import { orderCreateLimiter } from '../middleware/rateLimiter';
import {
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  validateBody,
} from '../middleware/validation';

export const ordersRouter = Router();

ordersRouter.get('/api/orders', ordersController.list);
ordersRouter.get('/api/admin/orders', ordersController.listAdmin);
ordersRouter.post('/api/recharge/create', orderCreateLimiter, validateBody(CreateOrderSchema), ordersController.create);
ordersRouter.post('/api/verify-subscriber', ordersController.verifySubscriber);
ordersRouter.post('/api/admin/orders/update', validateBody(UpdateOrderStatusSchema), ordersController.updateStatus);
ordersRouter.post('/api/orders/sync', ordersController.sync);
