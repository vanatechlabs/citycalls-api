import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as controller from './pageBackground.controller';
import {
  createPageBackgroundSchema,
  listPageBackgroundQuerySchema,
  publicPageBackgroundQuerySchema,
  updatePageBackgroundSchema,
} from './pageBackground.validation';

const router = Router();
const basePath = '/websites/city-calls/backgrounds';

// Website: GET /public/websites/city-calls/backgrounds?path=/services/ac-service
router.get(
  '/public/websites/city-calls/backgrounds',
  validate(publicPageBackgroundQuerySchema, 'query'),
  controller.getPublicPageBackgroundHandler
);

router.get(`${basePath}/pages`, authMiddleware, requirePermission('marketing', 'view'), controller.listBackgroundPageOptionsHandler);
router.get(
  basePath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listPageBackgroundQuerySchema, 'query'),
  controller.listPageBackgroundsHandler
);
router.get(`${basePath}/:id`, authMiddleware, requirePermission('marketing', 'view'), controller.getPageBackgroundHandler);
router.post(
  basePath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createPageBackgroundSchema),
  controller.createPageBackgroundHandler
);
router.patch(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updatePageBackgroundSchema),
  controller.updatePageBackgroundHandler
);
router.delete(`${basePath}/:id`, authMiddleware, requirePermission('marketing', 'edit'), controller.deletePageBackgroundHandler);

export default router;
