import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as controller from './servicePage.controller';
import {
  servicePageServiceIdParamSchema,
  servicePageSlugParamSchema,
  upsertServicePageSchema,
} from './servicePage.validation';

const router = Router();
const pagesPath = '/websites/city-calls/pages';

router.get(
  `${pagesPath}/options`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.listServicePageOptionsHandler
);
router.get(
  `${pagesPath}/:serviceId`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(servicePageServiceIdParamSchema, 'params'),
  controller.getServicePageHandler
);
router.put(
  `${pagesPath}/:serviceId`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(servicePageServiceIdParamSchema, 'params'),
  validate(upsertServicePageSchema),
  controller.upsertServicePageHandler
);
router.get(
  '/public/websites/city-calls/pages/:slug',
  validate(servicePageSlugParamSchema, 'params'),
  controller.getPublicServicePageHandler
);

export default router;
