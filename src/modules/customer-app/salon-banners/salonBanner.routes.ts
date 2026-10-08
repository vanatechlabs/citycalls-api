import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { requirePermission } from '../../../middleware/permission.middleware';
import { validate } from '../../../middleware/validate.middleware';
import * as controller from './salonBanner.controller';
import {
  createSalonBannerSchema,
  listSalonBannersQuerySchema,
  updateSalonBannerSchema,
} from './salonBanner.validation';

const router = Router();
const adminPath = '/customer-app/salon-banners';
const publicPath = '/public/customer-app/salon-banners';

router.get(publicPath, controller.listPublicSalonBannersHandler);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listSalonBannersQuerySchema, 'query'),
  controller.listSalonBannersHandler
);
router.get(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getSalonBannerHandler
);
router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createSalonBannerSchema),
  controller.createSalonBannerHandler
);
router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateSalonBannerSchema),
  controller.updateSalonBannerHandler
);
router.delete(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  controller.deleteSalonBannerHandler
);

export default router;
