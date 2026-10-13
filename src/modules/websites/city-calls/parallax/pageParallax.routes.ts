import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as service from './pageParallax.service';
import { createPageParallaxSchema, publicPageParallaxQuerySchema, updatePageParallaxSchema } from './pageParallax.validation';

// Admin → Background Section → Add Parallax Image / Parallax List: the
// parallax banner of each website service page.
const router = Router();
const basePath = '/websites/city-calls/parallax';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};
const can = (action: 'view' | 'create' | 'edit'): RequestHandler[] => [authMiddleware, requirePermission('marketing', action)];

// Website: GET /public/websites/city-calls/parallax?path=/services/ac-service
router.get('/public/websites/city-calls/parallax', validate(publicPageParallaxQuerySchema, 'query'), handle(async (req, res) => {
  const { path } = req.query as { path: string };
  sendSuccess(res, await service.getPublicPageParallax(path), 'Parallax image fetched successfully');
}));

router.get(`${basePath}/pages`, ...can('view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listParallaxPageOptions(), 'Parallax pages fetched successfully');
}));
router.get(basePath, ...can('view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listPageParallax(), 'Parallax images fetched successfully');
}));
router.get(`${basePath}/:id`, ...can('view'), handle(async (req, res) => {
  sendSuccess(res, await service.getPageParallax(paramAsString(req.params.id)), 'Parallax image fetched successfully');
}));
router.post(basePath, ...can('create'), validate(createPageParallaxSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.createPageParallax(req.body, actor), 'Parallax image created successfully', null, 201);
}));
router.patch(`${basePath}/:id`, ...can('edit'), validate(updatePageParallaxSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updatePageParallax(paramAsString(req.params.id), req.body, actor), 'Parallax image updated successfully');
}));
router.delete(`${basePath}/:id`, ...can('edit'), handle(async (req, res) => {
  await service.deletePageParallax(paramAsString(req.params.id));
  sendSuccess(res, null, 'Parallax image deleted successfully');
}));

export default router;
