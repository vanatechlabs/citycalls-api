import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './ourServices.service';
import { createOurServiceSchema, updateOurServiceSchema, updateOurServicesSectionSchema } from './ourServices.validation';

// Admin → Website Section → Our Services: the home page's service cards
// ("Everything your home needs…") and the heading above them.
const router = Router();
const adminPath = '/websites/city-calls/home-page/our-services';
const publicPath = '/public/websites/city-calls/home-page/our-services';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicOurServices(), 'Services fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminOurServices(), 'Services fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateOurServicesSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateOurServicesSection(req.body, actor), 'Section heading updated successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createOurServiceSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createOurService(req.body, actor), 'Service card added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateOurServiceSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateOurService(paramAsString(req.params.id), req.body, actor), 'Service card updated successfully');
  })
);

router.delete(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  handle(async (req, res) => {
    await service.deleteOurService(paramAsString(req.params.id));
    sendSuccess(res, null, 'Service card deleted successfully');
  })
);

export default router;
