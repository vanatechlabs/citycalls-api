import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './faq.service';
import { createFaqSchema, updateFaqSchema, updateFaqSectionSchema } from './faq.validation';

// Admin → Website Section → FAQ: the home page's questions and their headings.
const router = Router();
const adminPath = '/websites/city-calls/home-page/faq';
const publicPath = '/public/websites/city-calls/home-page/faq';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicFaqs(), 'FAQs fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminFaqs(), 'FAQs fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateFaqSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateFaqSection(req.body, actor), 'Headings saved successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createFaqSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createFaq(req.body, actor), 'FAQ added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateFaqSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateFaq(paramAsString(req.params.id), req.body, actor), 'FAQ updated successfully');
  })
);

router.delete(`${adminPath}/items/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteFaq(paramAsString(req.params.id));
  sendSuccess(res, null, 'FAQ deleted successfully');
}));

export default router;
