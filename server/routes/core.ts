import { Router } from 'express';
import { health, listOperators } from '../controllers/coreController';
import { submitInstallationRequest } from '../controllers/installationController';
import { InstallationRequestSchema, validateBody } from '../middleware/validation';

export const coreRouter = Router();

coreRouter.get('/api/health', health);
coreRouter.get('/api/operators', listOperators);
coreRouter.post(
  '/api/installation-requests',
  validateBody(InstallationRequestSchema),
  submitInstallationRequest,
);
