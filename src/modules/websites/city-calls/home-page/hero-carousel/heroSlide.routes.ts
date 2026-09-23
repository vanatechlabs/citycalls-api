import { Router } from 'express';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as controller from './heroSlide.controller';
import {
  createHeroSlideSchema,
  listHeroSlidesQuerySchema,
  updateHeroSlideSchema,
} from './heroSlide.validation';

const router = Router();
const adminPath = '/websites/city-calls/home-page/hero-carousel/slides';
const publicPath = '/public/websites/city-calls/home-page/hero-carousel/slides';

router.get(publicPath, controller.listPublicHeroSlidesHandler);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listHeroSlidesQuerySchema, 'query'),
  controller.listHeroSlidesHandler
);
router.get(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getHeroSlideHandler
);
router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createHeroSlideSchema),
  controller.createHeroSlideHandler
);
router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateHeroSlideSchema),
  controller.updateHeroSlideHandler
);
router.delete(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  controller.deleteHeroSlideHandler
);

export default router;
