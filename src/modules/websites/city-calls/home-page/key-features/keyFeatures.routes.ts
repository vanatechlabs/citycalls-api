import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './keyFeatures.service';
import { createKeyFeatureSchema, updateKeyFeatureSchema, updateKeyFeaturesSectionSchema } from './keyFeatures.validation';

// Admin → Website Section → Key Features: the "Why choose us" cards.
const router = Router();
const adminPath = '/websites/city-calls/home-page/key-features';
const publicPath = '/public/websites/city-calls/home-page/key-features';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicKeyFeatures(), 'Key features fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminKeyFeatures(), 'Key features fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateKeyFeaturesSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateKeyFeaturesSection(req.body, actor), 'Heading saved successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createKeyFeatureSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createKeyFeature(req.body, actor), 'Feature added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateKeyFeatureSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateKeyFeature(paramAsString(req.params.id), req.body, actor), 'Feature updated successfully');
  })
);

router.delete(`${adminPath}/items/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteKeyFeature(paramAsString(req.params.id));
  sendSuccess(res, null, 'Feature deleted successfully');
}));

export default router;
