import { Router } from 'express';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as controller from './offers.controller';
import {
  createOfferSchema,
  listOffersQuerySchema,
  updateOfferSchema,
  updateOfferStripSchema,
} from './offers.validation';

const router = Router();
const adminStripPath = '/websites/city-calls/home-page/offers/strip';
const adminDealsPath = '/websites/city-calls/home-page/offers/deals';
const publicStripPath = '/public/websites/city-calls/home-page/offers/strip';
const publicDealsPath = '/public/websites/city-calls/home-page/offers/deals';

router.get(publicStripPath, controller.getPublicOfferStripHandler);
router.get(publicDealsPath, controller.listPublicOffersHandler);

router.get(
  adminStripPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getOfferStripHandler
);
router.put(
  adminStripPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateOfferStripSchema),
  controller.updateOfferStripHandler
);

router.get(
  adminDealsPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(listOffersQuerySchema, 'query'),
  controller.listOffersHandler
);
router.get(
  `${adminDealsPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  controller.getOfferHandler
);
router.post(
  adminDealsPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createOfferSchema),
  controller.createOfferHandler
);
router.patch(
  `${adminDealsPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateOfferSchema),
  controller.updateOfferHandler
);
router.delete(
  `${adminDealsPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  controller.deleteOfferHandler
);

export default router;
