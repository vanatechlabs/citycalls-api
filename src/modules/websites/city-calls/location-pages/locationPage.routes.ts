import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as service from './locationPage.service';
import { createLocationPageSchema, updateLocationPageSchema } from './locationPage.validation';

// Admin → Blog Section (Add Location Page / Location Page List) and the
// website's citycalls.in/<slug> location pages.
const router = Router();
const adminPath = '/websites/city-calls/location-pages';
const publicPath = '/public/websites/city-calls/location-pages';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

// Website
router.get(publicPath, handle(async (req, res) => {
  const path = typeof req.query.path === 'string' ? req.query.path : undefined;
  sendSuccess(res, await service.listPublicLocationPages(path), 'Location pages fetched successfully');
}));

router.get(`${publicPath}/:slug`, handle(async (req, res) => {
  sendSuccess(res, await service.getPublicLocationPage(paramAsString(req.params.slug)), 'Location page fetched successfully');
}));

// Admin
router.get(`${adminPath}/page-options`, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listPageOptions(), 'Page options fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listAdminLocationPages(), 'Location pages fetched successfully');
}));

router.get(`${adminPath}/:id`, authMiddleware, requirePermission('marketing', 'view'), handle(async (req, res) => {
  sendSuccess(res, await service.getAdminLocationPage(paramAsString(req.params.id)), 'Location page fetched successfully');
}));

router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createLocationPageSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createLocationPage(req.body, actor), 'Location page created successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateLocationPageSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateLocationPage(paramAsString(req.params.id), req.body, actor), 'Location page updated successfully');
  })
);

router.delete(`${adminPath}/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteLocationPage(paramAsString(req.params.id));
  sendSuccess(res, null, 'Location page deleted successfully');
}));

export default router;
