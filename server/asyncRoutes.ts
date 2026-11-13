import type { Router, RequestHandler } from 'express';

// Express 4 does not forward rejected async handlers automatically.
export function forwardAsyncErrors(router: Router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const handler of layer.route.stack) {
      const original = handler.handle as RequestHandler;
      handler.handle = ((req, res, next) => {
        try { Promise.resolve(original(req, res, next)).catch(next); } catch (error) { next(error); }
      }) as RequestHandler;
    }
  }
}
