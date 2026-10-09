import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './howItWorks.service';
import { createHowItWorksStepSchema, updateHowItWorksSectionSchema, updateHowItWorksStepSchema } from './howItWorks.validation';

// Admin → Website Section → How It Works: the home page's step cards.
const router = Router();
const adminPath = '/websites/city-calls/home-page/how-it-works';
const publicPath = '/public/websites/city-calls/home-page/how-it-works';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicHowItWorks(), 'How it works fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminHowItWorks(), 'How it works fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateHowItWorksSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateHowItWorksSection(req.body, actor), 'Heading saved successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createHowItWorksStepSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createHowItWorksStep(req.body, actor), 'Step added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateHowItWorksStepSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateHowItWorksStep(paramAsString(req.params.id), req.body, actor), 'Step updated successfully');
  })
);

router.delete(`${adminPath}/items/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteHowItWorksStep(paramAsString(req.params.id));
  sendSuccess(res, null, 'Step deleted successfully');
}));

export default router;
