import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as controller from './seoMeta.controller';
import {
  createSeoMetaSchema,
  listSeoMetaQuerySchema,
  publicSeoMetaQuerySchema,
  updateSeoMetaSchema,
} from './seoMeta.validation';

const router = Router();
const basePath = '/websites/city-calls/seo';

// Website: GET /public/websites/city-calls/seo/meta?path=/services/ac-service
router.get('/public/websites/city-calls/seo/meta', validate(publicSeoMetaQuerySchema, 'query'), controller.getPublicSeoMetaHandler);

router.get(`${basePath}/pages`, authMiddleware, requirePermission('marketing', 'view'), controller.listSeoPageOptionsHandler);
router.get(
  `${basePath}/meta`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listSeoMetaQuerySchema, 'query'),
  controller.listSeoMetaHandler
);
router.get(`${basePath}/meta/:id`, authMiddleware, requirePermission('marketing', 'view'), controller.getSeoMetaHandler);
router.post(
  `${basePath}/meta`,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createSeoMetaSchema),
  controller.createSeoMetaHandler
);
router.patch(
  `${basePath}/meta/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateSeoMetaSchema),
  controller.updateSeoMetaHandler
);
router.delete(`${basePath}/meta/:id`, authMiddleware, requirePermission('marketing', 'edit'), controller.deleteSeoMetaHandler);

export default router;
