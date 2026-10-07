import { Router } from 'express';
import { authMiddleware } from '../../../middleware/auth.middleware';
import { requirePermission } from '../../../middleware/permission.middleware';
import { validate } from '../../../middleware/validate.middleware';
import * as controller from './helpNowBanner.controller';
import {
  createHelpNowBannerSchema,
  listHelpNowBannersQuerySchema,
  updateHelpNowBannerSchema,
} from './helpNowBanner.validation';

const router = Router();
const adminPath = '/customer-app/helpnow-banners';
const publicPath = '/public/customer-app/helpnow-banners';

router.get(publicPath, controller.listPublicHelpNowBannersHandler);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listHelpNowBannersQuerySchema, 'query'),
  controller.listHelpNowBannersHandler
);
router.get(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getHelpNowBannerHandler
);
router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createHelpNowBannerSchema),
  controller.createHelpNowBannerHandler
);
router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateHelpNowBannerSchema),
  controller.updateHelpNowBannerHandler
);
router.delete(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  controller.deleteHelpNowBannerHandler
);

export default router;
