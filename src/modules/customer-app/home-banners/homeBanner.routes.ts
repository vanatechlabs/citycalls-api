import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { requirePermission } from '../../../middleware/permission.middleware';
import { validate } from '../../../middleware/validate.middleware';
import * as controller from './homeBanner.controller';
import {
  createHomeBannerSchema,
  listHomeBannersQuerySchema,
  updateHomeBannerSchema,
} from './homeBanner.validation';

const router = Router();
const adminPath = '/customer-app/home-banners';
const publicPath = '/public/customer-app/home-banners';

router.get(publicPath, controller.listPublicHomeBannersHandler);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listHomeBannersQuerySchema, 'query'),
  controller.listHomeBannersHandler
);
router.get(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getHomeBannerHandler
);
router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createHomeBannerSchema),
  controller.createHomeBannerHandler
);
router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateHomeBannerSchema),
  controller.updateHomeBannerHandler
);
router.delete(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  controller.deleteHomeBannerHandler
);

export default router;
