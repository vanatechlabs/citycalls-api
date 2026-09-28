import { Router } from 'express';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as controller from './launchSpotlight.controller';
import { updateLaunchSpotlightSchema } from './launchSpotlight.validation';

const router = Router();
const adminPath = '/websites/city-calls/home-page/launch-spotlight';
const publicPath = '/public/websites/city-calls/home-page/launch-spotlight';

router.get(publicPath, controller.getPublicLaunchSpotlightHandler);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getLaunchSpotlightHandler
);

router.put(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateLaunchSpotlightSchema),
  controller.updateLaunchSpotlightHandler
);

export default router;
