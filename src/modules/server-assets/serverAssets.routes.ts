import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../lib/actor';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as service from './serverAssets.service';
import { createServerAssetSchema, listServerAssetsQuerySchema, updateServerAssetSchema } from './serverAssets.validation';
import type { ServerAssetType } from './serverAsset.model';

// Admin Section → Server Management (domains, hosting, SSL…). Same access as
// the other system settings: config.view to see, config.manageSettings to change.
const router = Router();
const basePath = '/server-assets';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(
  basePath,
  authMiddleware,
  requirePermission('config', 'view'),
  validate(listServerAssetsQuerySchema, 'query'),
  handle(async (req, res) => {
    sendSuccess(res, await service.listServerAssets(req.query.type as ServerAssetType | undefined), 'Records fetched successfully');
  })
);

router.post(
  basePath,
  authMiddleware,
  requirePermission('config', 'manageSettings'),
  validate(createServerAssetSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createServerAsset(req.body, actor), 'Record added successfully', null, 201);
  })
);

router.patch(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('config', 'manageSettings'),
  validate(updateServerAssetSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateServerAsset(paramAsString(req.params.id), req.body, actor), 'Record updated successfully');
  })
);

router.delete(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('config', 'manageSettings'),
  handle(async (req, res) => {
    await service.deleteServerAsset(paramAsString(req.params.id));
    sendSuccess(res, null, 'Record deleted successfully');
  })
);

export default router;
