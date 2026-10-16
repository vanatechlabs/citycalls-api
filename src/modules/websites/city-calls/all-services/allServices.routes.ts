import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import { createOurServiceSchema, updateOurServiceSchema } from '../home-page/our-services/ourServices.validation';
import * as service from './allServices.service';

// Admin → Pages Section → All Services: a card for every service. Same card
// fields as the home page's Our Services, so its validation is shared.
const router = Router();
const adminPath = '/websites/city-calls/all-services';
const publicPath = '/public/websites/city-calls/all-services';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.listPublicCards(), 'Service cards fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listAdminCards(), 'Service cards fetched successfully');
}));

router.post(`${adminPath}/import-navbar`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.importFromNavbar(actor), 'Service cards added from Navbar List');
}));

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createOurServiceSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createCard(req.body, actor), 'Service card added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateOurServiceSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateCard(paramAsString(req.params.id), req.body, actor), 'Service card updated successfully');
  })
);

router.delete(`${adminPath}/items/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteCard(paramAsString(req.params.id));
  sendSuccess(res, null, 'Service card deleted successfully');
}));

export default router;
