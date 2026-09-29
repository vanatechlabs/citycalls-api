import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import { publicBookingRateLimit } from '../../middleware/rateLimit.middleware';
import * as controller from './registrations.controller';
import {
  bulkDeleteRegistrationsSchema,
  markRegistrationsViewedSchema,
  registrationStatsQuerySchema,
  createRegistrationSchema,
  listRegistrationsQuerySchema,
  publicCreateRegistrationSchema,
  transitionRegistrationSchema,
  updateRegistrationSchema,
} from './registrations.validation';

const router = Router();
const basePath = '/registrations';

router.get(
  basePath,
  authMiddleware,
  requirePermission('customers', 'view'),
  validate(listRegistrationsQuerySchema, 'query'),
  controller.listRegistrationsHandler
);
// Website booking form — public, strictly rate limited.
router.post(
  '/public/registrations',
  publicBookingRateLimit,
  validate(publicCreateRegistrationSchema),
  controller.createWebsiteRegistrationHandler
);

// Registered before `/:id` so these words are never read as a registration id.
router.get(
  `${basePath}/unread`,
  authMiddleware,
  requirePermission('customers', 'view'),
  controller.getUnreadRegistrationsHandler
);
router.post(
  `${basePath}/view`,
  authMiddleware,
  requirePermission('customers', 'view'),
  validate(markRegistrationsViewedSchema),
  controller.markRegistrationsViewedHandler
);
router.post(
  `${basePath}/:id/view`,
  authMiddleware,
  requirePermission('customers', 'view'),
  controller.markRegistrationViewedHandler
);
router.get(
  `${basePath}/stats`,
  authMiddleware,
  requirePermission('customers', 'view'),
  validate(registrationStatsQuerySchema, 'query'),
  controller.getRegistrationStatsHandler
);
router.post(
  `${basePath}/bulk-delete`,
  authMiddleware,
  requirePermission('customers', 'edit'),
  validate(bulkDeleteRegistrationsSchema),
  controller.bulkDeleteRegistrationsHandler
);
router.get(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('customers', 'view'),
  controller.getRegistrationHandler
);
router.post(
  basePath,
  authMiddleware,
  requirePermission('customers', 'create'),
  validate(createRegistrationSchema),
  controller.createRegistrationHandler
);
router.patch(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('customers', 'edit'),
  validate(updateRegistrationSchema),
  controller.updateRegistrationHandler
);
router.post(
  `${basePath}/:id/transition`,
  authMiddleware,
  requirePermission('customers', 'edit'),
  validate(transitionRegistrationSchema),
  controller.transitionRegistrationHandler
);
router.delete(
  `${basePath}/:id`,
  authMiddleware,
  requirePermission('customers', 'edit'),
  controller.deleteRegistrationHandler
);

export default router;
