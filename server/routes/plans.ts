import { Router } from 'express';
import { plansController } from '../controllers/plansController';
import { adminLimiter } from '../middleware/rateLimiter';
import { validateBody, SavePlanSchema, DeletePlanSchema, SyncPlansSchema } from '../middleware/validation';

export const plansRouter = Router();

plansRouter.get('/api/catalog', plansController.listCatalog);
plansRouter.get('/api/plans', plansController.list);
plansRouter.get('/api/admin/plans', plansController.listAdmin);
plansRouter.get('/api/admin/plans/deleted', plansController.listDeleted);
plansRouter.post('/api/admin/plans/save', adminLimiter, validateBody(SavePlanSchema), plansController.save);
plansRouter.post('/api/admin/plans/delete', adminLimiter, validateBody(DeletePlanSchema), plansController.delete);
plansRouter.post('/api/admin/plans/sync-seed', validateBody(SyncPlansSchema), plansController.syncSeed);
