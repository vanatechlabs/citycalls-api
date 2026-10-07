import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './testimonials.service';
import { createTestimonialSchema, updateTestimonialSchema, updateTestimonialsSectionSchema } from './testimonials.validation';

// Admin → Pages Section → Testimonials: the home page's review carousel and
// the heading above it.
const router = Router();
const adminPath = '/websites/city-calls/home-page/testimonials';
const publicPath = '/public/websites/city-calls/home-page/testimonials';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicTestimonials(), 'Testimonials fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminTestimonials(), 'Testimonials fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateTestimonialsSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateTestimonialsSection(req.body, actor), 'Settings saved successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createTestimonialSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createTestimonial(req.body, actor), 'Testimonial added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateTestimonialSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateTestimonial(paramAsString(req.params.id), req.body, actor), 'Testimonial updated successfully');
  })
);

router.delete(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  handle(async (req, res) => {
    await service.deleteTestimonial(paramAsString(req.params.id));
    sendSuccess(res, null, 'Testimonial deleted successfully');
  })
);

export default router;
