import { Router } from 'express';
import { health, listOperators } from '../controllers/coreController';

export const coreRouter = Router();

coreRouter.get('/api/health', health);
coreRouter.get('/api/operators', listOperators);
