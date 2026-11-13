import { forwardAsyncErrors } from '../asyncRoutes';
import { Router } from 'express';
import { ordersController } from '../controllers/ordersController';
import {
  SubscriberSchema,
  UpdateOrderStatusSchema,
  validateBody,
} from '../middleware/validation';

export const ordersRouter = Router();

ordersRouter.get('/api/orders', ordersController.list);
ordersRouter.get('/api/admin/orders', ordersController.listAdmin);
ordersRouter.post('/api/verify-subscriber', validateBody(SubscriberSchema), ordersController.verifySubscriber);
ordersRouter.post('/api/admin/orders/update', validateBody(UpdateOrderStatusSchema), ordersController.updateStatus);

forwardAsyncErrors(ordersRouter);
